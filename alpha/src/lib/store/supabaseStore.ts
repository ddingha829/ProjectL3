import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ArchiveItem, PresetSlot, SkinTheme } from '@/types/l2';
import { getRuntimeEnvKey } from '@/lib/env';
import { AiUsageKind, L2Store, Profile, ProfilePrefs } from './types';
import { fileStore } from './fileStore';
import { normalizeDefaultPresetId } from '@/lib/cardAppearance';
import {
  defaultProfile,
  generateRecoveryCode,
  MAX_PHOTO_BYTES,
  newId,
  parseDataUrl,
  todayKST,
} from './util';

interface ProfileRow {
  id: string;
  recovery_code: string;
  author_name: string;
  preset_slots: PresetSlot[] | null;
  skins: Record<string, SkinTheme> | null;
  default_preset_id?: string | null;
}

let client: SupabaseClient | null = null;
let clientCacheKey = '';

export function getSupabaseConfig() {
  const url =
    getRuntimeEnvKey('SUPABASE_URL') || getRuntimeEnvKey('NEXT_PUBLIC_SUPABASE_URL');
  const key =
    getRuntimeEnvKey('SUPABASE_SERVICE_ROLE_KEY') ||
    getRuntimeEnvKey('SUPABASE_ANON_KEY') ||
    getRuntimeEnvKey('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return url && key ? { url, key } : null;
}

function db(): SupabaseClient {
  const cfg = getSupabaseConfig();
  if (!cfg) throw new Error('Supabase is not configured');
  const nextKey = `${cfg.url}|${cfg.key}`;
  if (client && clientCacheKey === nextKey) return client;
  client = createClient(cfg.url, cfg.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  clientCacheKey = nextKey;
  return client;
}

function bucket() {
  return getRuntimeEnvKey('SUPABASE_PHOTO_BUCKET') || 'photos';
}

function isSchemaMissingError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err || '');
  return (
    msg.includes('l2_profiles') ||
    msg.includes('l2_archives') ||
    msg.includes('l2_ai_usage') ||
    msg.includes('schema cache') ||
    msg.includes('does not exist')
  );
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
    defaultPresetId: normalizeDefaultPresetId(
      row.default_preset_id,
      row.preset_slots || base.presetSlots
    ),
  };
}

function renumber(items: ArchiveItem[]): ArchiveItem[] {
  const total = items.length;
  return items.map((it, idx) => ({
    ...it,
    num: it.num || String(total - idx).padStart(2, '0'),
  }));
}

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const PROFILE_COLS =
  'id, recovery_code, author_name, preset_slots, skins, default_preset_id';

export const supabaseStore: L2Store = {
  kind: 'supabase',

  async getProfile(deviceId) {
    try {
      const row = must(
        await db()
          .from('l2_profiles')
          .select(PROFILE_COLS)
          .eq('id', deviceId)
          .maybeSingle()
      ) as ProfileRow | null;
      return row ? toProfile(row) : null;
    } catch (err) {
      if (isSchemaMissingError(err)) return fileStore.getProfile(deviceId);
      throw err;
    }
  },

  async ensureProfile(deviceId) {
    try {
      const existing = await this.getProfile(deviceId);
      if (existing) return existing;

      for (let attempt = 0; attempt < 5; attempt++) {
        const code = generateRecoveryCode();
        const res = await db()
          .from('l2_profiles')
          .insert({ id: deviceId, recovery_code: code, author_name: '' })
          .select(PROFILE_COLS)
          .single();
        if (!res.error) return toProfile(res.data as ProfileRow);
        if (res.error.code !== '23505') throw new Error(res.error.message);
        const raced = await this.getProfile(deviceId);
        if (raced) return raced;
      }
      throw new Error('Could not allocate recovery code');
    } catch (err) {
      if (isSchemaMissingError(err)) return fileStore.ensureProfile(deviceId);
      throw err;
    }
  },

  async findDeviceByRecoveryCode(code) {
    try {
      const row = must(
        await db()
          .from('l2_profiles')
          .select('id')
          .eq('recovery_code', code)
          .maybeSingle()
      ) as { id: string } | null;
      return row ? row.id : null;
    } catch (err) {
      if (isSchemaMissingError(err)) return fileStore.findDeviceByRecoveryCode(code);
      throw err;
    }
  },

  async savePrefs(deviceId, prefs: ProfilePrefs) {
    try {
      const current = await this.ensureProfile(deviceId);
      const patch: Record<string, unknown> = {};
      if (typeof prefs.authorName === 'string') patch.author_name = prefs.authorName;
      if (prefs.presetSlots) patch.preset_slots = prefs.presetSlots;
      if (prefs.skins) {
        patch.skins = prefs.replaceSkins
          ? { ...prefs.skins }
          : { ...current.skins, ...prefs.skins };
      }
      if (prefs.defaultPresetId !== undefined || prefs.presetSlots) {
        patch.default_preset_id = normalizeDefaultPresetId(
          prefs.defaultPresetId ?? current.defaultPresetId,
          prefs.presetSlots || current.presetSlots
        );
      }
      if (Object.keys(patch).length === 0) return current;
      const row = must(
        await db()
          .from('l2_profiles')
          .update(patch)
          .eq('id', deviceId)
          .select(PROFILE_COLS)
          .single()
      ) as ProfileRow;
      return toProfile(row);
    } catch (err) {
      if (isSchemaMissingError(err)) return fileStore.savePrefs(deviceId, prefs);
      throw err;
    }
  },

  async listArchives(ownerId) {
    try {
      const rows = must(
        await db()
          .from('l2_archives')
          .select('id, data')
          .eq('owner_id', ownerId)
          .order('created_at', { ascending: false })
          .limit(500)
      ) as { id: string; data: ArchiveItem }[];
      return renumber(rows.map((r) => ({ ...r.data, id: r.id })));
    } catch (err) {
      if (isSchemaMissingError(err)) return fileStore.listArchives(ownerId);
      throw err;
    }
  },

  async getOwnedArchive(ownerId, id) {
    try {
      const row = must(
        await db()
          .from('l2_archives')
          .select('id, data')
          .eq('id', id)
          .eq('owner_id', ownerId)
          .maybeSingle()
      ) as { id: string; data: ArchiveItem } | null;
      return row ? { ...row.data, id: row.id } : null;
    } catch (err) {
      if (isSchemaMissingError(err)) return fileStore.getOwnedArchive(ownerId, id);
      throw err;
    }
  },

  async saveArchive(ownerId, item) {
    try {
      await this.ensureProfile(ownerId);
      const existing = must(
        await db()
          .from('l2_archives')
          .select('owner_id, data')
          .eq('id', item.id)
          .maybeSingle()
      ) as { owner_id: string; data: ArchiveItem } | null;

      if (existing && existing.owner_id !== ownerId) return null;

      let assignedNum = existing?.data?.num || item.num;
      if (!assignedNum) {
        const ownerRows = must(
          await db().from('l2_archives').select('data').eq('owner_id', ownerId)
        ) as { data: ArchiveItem }[];
        const largestNumber = Math.max(
          0,
          ...ownerRows.map((r) => Number(r.data?.num) || 0)
        );
        assignedNum = String(largestNumber + 1).padStart(2, '0');
      }

      const saved: ArchiveItem = { ...item, num: assignedNum };

      if (existing) {
        must(
          await db()
            .from('l2_archives')
            .update({ data: saved, updated_at: new Date().toISOString() })
            .eq('id', item.id)
            .eq('owner_id', ownerId)
        );
      } else {
        must(
          await db()
            .from('l2_archives')
            .insert({ id: item.id, owner_id: ownerId, data: saved })
        );
      }
      return saved;
    } catch (err) {
      if (isSchemaMissingError(err)) return fileStore.saveArchive(ownerId, item);
      throw err;
    }
  },

  async deleteArchive(ownerId, id) {
    try {
      const existing = await this.getOwnedArchive(ownerId, id);
      must(
        await db()
          .from('l2_archives')
          .delete()
          .eq('id', id)
          .eq('owner_id', ownerId)
      );

      const prefix = `/storage/v1/object/public/${bucket()}/`;
      const img = existing?.img || '';
      const at = img.indexOf(prefix);
      if (at >= 0) {
        const objectPath = img.slice(at + prefix.length);
        if (objectPath.startsWith(`${ownerId}/`)) {
          await db().storage.from(bucket()).remove([objectPath]);
        }
      }
    } catch (err) {
      if (isSchemaMissingError(err)) return fileStore.deleteArchive(ownerId, id);
      throw err;
    }
  },

  async getPublicArchive(id) {
    try {
      const row = must(
        await db()
          .from('l2_archives')
          .select('id, owner_id, data')
          .eq('id', id)
          .maybeSingle()
      ) as { id: string; owner_id: string; data: ArchiveItem } | null;
      if (!row) return null;
      const profile = await this.getProfile(row.owner_id);
      if (!profile) return null;
      return { item: { ...row.data, id: row.id }, profile };
    } catch (err) {
      if (isSchemaMissingError(err)) return fileStore.getPublicArchive(id);
      throw err;
    }
  },

  async uploadPhoto(ownerId, dataUrl) {
    try {
      const parsed = parseDataUrl(dataUrl);
      if (!parsed || parsed.buffer.length > MAX_PHOTO_BYTES) {
        throw new Error('Invalid or oversized image');
      }
      const objectPath = `${ownerId}/${newId()}.${parsed.ext}`;
      const res = await db().storage.from(bucket()).upload(objectPath, parsed.buffer, {
        contentType: parsed.mime,
        cacheControl: '31536000',
        upsert: false,
      });
      if (res.error) return fileStore.uploadPhoto(ownerId, dataUrl);
      return db().storage.from(bucket()).getPublicUrl(objectPath).data.publicUrl;
    } catch {
      return fileStore.uploadPhoto(ownerId, dataUrl);
    }
  },

  async bumpUsage(ownerId, kind: AiUsageKind) {
    try {
      const count = must(
        await db().rpc('bump_l2_ai_usage', {
          p_owner: ownerId,
          p_kind: kind,
          p_day: todayKST(),
        })
      ) as number;
      return Number(count) || 0;
    } catch (err) {
      if (isSchemaMissingError(err)) return fileStore.bumpUsage(ownerId, kind);
      throw err;
    }
  },

  async getUsage(ownerId, kind: AiUsageKind) {
    try {
      const row = must(
        await db()
          .from('l2_ai_usage')
          .select('count')
          .eq('owner_id', ownerId)
          .eq('kind', kind)
          .eq('day', todayKST())
          .maybeSingle()
      ) as { count: number } | null;
      return row?.count || 0;
    } catch (err) {
      if (isSchemaMissingError(err)) return fileStore.getUsage(ownerId, kind);
      throw err;
    }
  },
};
