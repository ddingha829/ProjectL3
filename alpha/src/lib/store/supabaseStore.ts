import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ArchiveItem, PresetSlot, SkinTheme } from '@/types/l2';
import { getRuntimeEnvKey } from '@/lib/env';
import { AiUsageKind, L2Store, Profile, ProfilePrefs } from './types';
import { normalizeDefaultPresetId } from '@/lib/cardAppearance';
import {
  defaultProfile,
  generateRecoveryCode,
  MAX_PHOTO_BYTES,
  newId,
  parseDataUrl,
  todayKST,
} from './util';

/**
 * Production store. Only ever runs on the server with the service_role key;
 * the browser never talks to Supabase directly, so RLS stays fully locked.
 * Every query that touches user data is scoped by owner_id here.
 */

interface ProfileRow {
  id: string;
  recovery_code: string;
  author_name: string;
  preset_slots: PresetSlot[] | null;
  skins: Record<string, SkinTheme> | null;
  default_preset_id?: string | null;
}

let client: SupabaseClient | null = null;

export function getSupabaseConfig() {
  const url =
    getRuntimeEnvKey('SUPABASE_URL') || getRuntimeEnvKey('NEXT_PUBLIC_SUPABASE_URL');
  const key = getRuntimeEnvKey('SUPABASE_SERVICE_ROLE_KEY');
  return url && key ? { url, key } : null;
}

function db(): SupabaseClient {
  if (client) return client;
  const cfg = getSupabaseConfig();
  if (!cfg) throw new Error('Supabase is not configured');
  client = createClient(cfg.url, cfg.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

function bucket() {
  return getRuntimeEnvKey('SUPABASE_PHOTO_BUCKET') || 'photos';
}

function toProfile(row: ProfileRow): Profile {
  const base = defaultProfile(row.id, row.recovery_code);
  return {
    ...base,
    authorName: row.author_name || '',
    presetSlots:
      Array.isArray(row.preset_slots) && row.preset_slots.length
        ? row.preset_slots
        : base.presetSlots,
    skins: { ...base.skins, ...(row.skins || {}) },
    defaultPresetId: normalizeDefaultPresetId(row.default_preset_id, row.preset_slots || base.presetSlots),
  };
}

function renumber(items: ArchiveItem[]): ArchiveItem[] {
  const total = items.length;
  return items.map((it, idx) => ({
    ...it,
    num: String(total - idx).padStart(2, '0'),
  }));
}

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const PROFILE_COLS = 'id, recovery_code, author_name, preset_slots, skins, default_preset_id';

export const supabaseStore: L2Store = {
  kind: 'supabase',

  async getProfile(deviceId) {
    const row = must(
      await db().from('profiles').select(PROFILE_COLS).eq('id', deviceId).maybeSingle()
    ) as ProfileRow | null;
    return row ? toProfile(row) : null;
  },

  async ensureProfile(deviceId) {
    const existing = await this.getProfile(deviceId);
    if (existing) return existing;

    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateRecoveryCode();
      const res = await db()
        .from('profiles')
        .insert({ id: deviceId, recovery_code: code, author_name: '' })
        .select(PROFILE_COLS)
        .single();
      if (!res.error) return toProfile(res.data as ProfileRow);
      // 23505 = unique violation: either the code collided or a parallel
      // request created this device first.
      if (res.error.code !== '23505') throw new Error(res.error.message);
      const raced = await this.getProfile(deviceId);
      if (raced) return raced;
    }
    throw new Error('Could not allocate recovery code');
  },

  async findDeviceByRecoveryCode(code) {
    const row = must(
      await db().from('profiles').select('id').eq('recovery_code', code).maybeSingle()
    ) as { id: string } | null;
    return row ? row.id : null;
  },

  async savePrefs(deviceId, prefs: ProfilePrefs) {
    const current = await this.ensureProfile(deviceId);
    const patch: Record<string, unknown> = {};
    if (typeof prefs.authorName === 'string') patch.author_name = prefs.authorName;
    if (prefs.presetSlots) patch.preset_slots = prefs.presetSlots;
    if (prefs.skins) patch.skins = prefs.replaceSkins ? { ...prefs.skins } : { ...current.skins, ...prefs.skins };
    if (prefs.defaultPresetId !== undefined || prefs.presetSlots) patch.default_preset_id = normalizeDefaultPresetId(prefs.defaultPresetId ?? current.defaultPresetId, prefs.presetSlots || current.presetSlots);
    if (Object.keys(patch).length === 0) return current;
    const row = must(
      await db().from('profiles').update(patch).eq('id', deviceId).select(PROFILE_COLS).single()
    ) as ProfileRow;
    return toProfile(row);
  },

  async listArchives(ownerId) {
    const rows = must(
      await db()
        .from('archives')
        .select('id, data')
        .eq('owner_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(500)
    ) as { id: string; data: ArchiveItem }[];
    return renumber(rows.map((r) => ({ ...r.data, id: r.id })));
  },

  async getOwnedArchive(ownerId, id) {
    const row = must(
      await db()
        .from('archives')
        .select('id, data')
        .eq('id', id)
        .eq('owner_id', ownerId)
        .maybeSingle()
    ) as { id: string; data: ArchiveItem } | null;
    return row ? { ...row.data, id: row.id } : null;
  },

  async saveArchive(ownerId, item) {
    const owner = must(
      await db().from('archives').select('owner_id').eq('id', item.id).maybeSingle()
    ) as { owner_id: string } | null;

    if (owner && owner.owner_id !== ownerId) return null;

    if (owner) {
      must(
        await db()
          .from('archives')
          .update({ data: item, updated_at: new Date().toISOString() })
          .eq('id', item.id)
          .eq('owner_id', ownerId)
      );
    } else {
      must(await db().from('archives').insert({ id: item.id, owner_id: ownerId, data: item }));
    }
    return item;
  },

  async deleteArchive(ownerId, id) {
    const existing = await this.getOwnedArchive(ownerId, id);
    must(await db().from('archives').delete().eq('id', id).eq('owner_id', ownerId));

    // Best-effort photo cleanup for files we uploaded.
    const prefix = `/storage/v1/object/public/${bucket()}/`;
    const img = existing?.img || '';
    const at = img.indexOf(prefix);
    if (at >= 0) {
      const objectPath = img.slice(at + prefix.length);
      if (objectPath.startsWith(`${ownerId}/`)) {
        await db().storage.from(bucket()).remove([objectPath]);
      }
    }
  },

  async getPublicArchive(id) {
    const row = must(
      await db().from('archives').select('id, owner_id, data').eq('id', id).maybeSingle()
    ) as { id: string; owner_id: string; data: ArchiveItem } | null;
    if (!row) return null;
    const profile = await this.getProfile(row.owner_id);
    if (!profile) return null;
    return { item: { ...row.data, id: row.id }, profile };
  },

  async uploadPhoto(ownerId, dataUrl) {
    const parsed = parseDataUrl(dataUrl);
    if (!parsed || parsed.buffer.length > MAX_PHOTO_BYTES) {
      throw new Error('Invalid or oversized image');
    }
    const objectPath = `${ownerId}/${newId()}.${parsed.ext}`;
    must(
      await db().storage.from(bucket()).upload(objectPath, parsed.buffer, {
        contentType: parsed.mime,
        cacheControl: '31536000',
        upsert: false,
      })
    );
    return db().storage.from(bucket()).getPublicUrl(objectPath).data.publicUrl;
  },

  async bumpUsage(ownerId, kind: AiUsageKind) {
    const count = must(
      await db().rpc('bump_ai_usage', { p_owner: ownerId, p_kind: kind, p_day: todayKST() })
    ) as number;
    return Number(count) || 0;
  },

  async getUsage(ownerId, kind: AiUsageKind) {
    const row = must(
      await db()
        .from('ai_usage')
        .select('count')
        .eq('owner_id', ownerId)
        .eq('kind', kind)
        .eq('day', todayKST())
        .maybeSingle()
    ) as { count: number } | null;
    return row?.count || 0;
  },
};
