import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { ArchiveItem, PresetSlot, SkinTheme } from '@/types/l2';
import { getRuntimeEnvKey } from '@/lib/env';
import { AiUsageKind, L2Store, Profile, ProfilePrefs } from './types';
import { fileStore } from './fileStore';
import { normalizeDefaultPresetId } from '@/lib/cardAppearance';
import {
  accountUuidFromUsername,
  defaultProfile,
  generateRecoveryCode,
  createPasswordHash,
  verifyPasswordHash,
  MAX_PHOTO_BYTES,
  newId,
  normalizeUsername,
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
  const key = getRuntimeEnvKey('SUPABASE_SERVICE_ROLE_KEY') ||
    (process.env.VERCEL || process.env.NODE_ENV === 'production' ? undefined :
      getRuntimeEnvKey('SUPABASE_ANON_KEY') || getRuntimeEnvKey('NEXT_PUBLIC_SUPABASE_ANON_KEY'));
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
  // Do not acknowledge ephemeral file writes as successful cloud sync.
  if (process.env.VERCEL || process.env.NODE_ENV === 'production') return false;
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
  const nonGroupsOldestFirst = items
    .filter((it) => it.kind !== 'group' && it.cat !== 'GROUP')
    .slice()
    .sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0) || a.id.localeCompare(b.id));
  const numById = new Map(
    nonGroupsOldestFirst.map((it, idx) => [it.id, String(idx + 1).padStart(2, '0')])
  );
  return items.map((it) => ({
    ...it,
    num: numById.get(it.id) || it.num || '',
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
      const rows: { id: string; data: ArchiveItem }[] = [];
      const pageSize = 500;
      for (let offset = 0; ; offset += pageSize) {
        const page = must(await db().from('l2_archives').select('id, data')
          .eq('owner_id', ownerId).order('created_at', { ascending: false })
          .order('id', { ascending: false }).range(offset, offset + pageSize - 1)) as typeof rows;
        rows.push(...page);
        if (page.length < pageSize) break;
      }
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

  async saveArchive(ownerId, item, insertOnly = false) {
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
      if (existing && insertOnly) return { ...existing.data, id: item.id };

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
        const inserted = await db()
            .from('l2_archives')
            .insert({ id: item.id, owner_id: ownerId, data: saved });
        // A simultaneous restore may have inserted this ID after the read above.
        if (insertOnly && inserted.error?.code === '23505') return this.getOwnedArchive(ownerId, item.id);
        must(inserted);
      }
      return saved;
    } catch (err) {
      if (isSchemaMissingError(err)) return fileStore.saveArchive(ownerId, item, insertOnly);
      throw err;
    }
  },

  async deleteArchive(ownerId, id) {
    try {
      must(
        await db()
          .from('l2_archives')
          .delete()
          .eq('id', id)
          .eq('owner_id', ownerId)
      );

      // Keep media available for undo and group cards that reference the same
      // image. Unreferenced media needs delayed, reference-aware cleanup.
    } catch (err) {
      if (isSchemaMissingError(err)) return fileStore.deleteArchive(ownerId, id);
      throw err;
    }
  },

  async deleteAllArchives(ownerId) {
    try {
      must(await db().from('l2_archives').delete().eq('owner_id', ownerId));
    } catch (err) {
      if (isSchemaMissingError(err)) return fileStore.deleteAllArchives(ownerId);
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
      if (res.error) throw new Error(res.error.message);
      return db().storage.from(bucket()).getPublicUrl(objectPath).data.publicUrl;
    } catch (error) {
      if (process.env.VERCEL || process.env.NODE_ENV === 'production') throw error;
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

  async getAccountUsername(deviceId) {
    try {
      const rows = must(
        await db()
          .from('l2_ai_usage')
          .select('kind')
          .eq('owner_id', deviceId)
          .eq('day', '2000-01-01')
          .limit(5)
      ) as { kind: string }[];
      const hit = rows.find((r) => r.kind.startsWith('pwd:') || r.kind.startsWith('oauth:google:'));
      if (!hit) return null;
      if (hit.kind.startsWith('oauth:google:')) return decodeURIComponent(hit.kind.slice('oauth:google:'.length));
      const parts = hit.kind.slice(4).split(':');
      return parts.slice(1).join(':') || null;
    } catch (err) {
      if (isSchemaMissingError(err)) return fileStore.getAccountUsername?.(deviceId) ?? null;
      throw err;
    }
  },

  async loginWithGoogle(identity, previousDeviceId) {
    const accountId = identity.id;
    const username = `Google · ${identity.label.slice(0, 80)}`;
    const isNewAccount = !await this.getAccountUsername?.(accountId);
    const previousIsGuest = previousDeviceId && previousDeviceId !== accountId && !await this.getAccountUsername?.(previousDeviceId);
    await this.ensureProfile(accountId);
    if (isNewAccount && previousIsGuest) {
      const guest = await this.getProfile(previousDeviceId);
      if (guest) await this.savePrefs(accountId, {authorName: guest.authorName, presetSlots: guest.presetSlots, skins: guest.skins, defaultPresetId: guest.defaultPresetId});
    }
    // Mark this identity as registered before any transfer; it must never be
    // mistaken for a guest by the ID/password sign-in migration path.
    must(await db().from('l2_ai_usage').upsert({owner_id: accountId, kind: `oauth:google:${encodeURIComponent(username)}`, day: '2000-01-01', count: 1}, {onConflict:'owner_id,kind,day'}));
    if (previousIsGuest) {
      must(await db().from('l2_archives').update({owner_id:accountId, updated_at:new Date().toISOString()}).eq('owner_id',previousDeviceId));
    }
    return {accountId, username, isNewAccount};
  },

  async loginOrRegister(username, password, previousDeviceId) {
    try {
      const norm = normalizeUsername(username);
      const accountId = accountUuidFromUsername(norm);

      const rows = must(
        await db()
          .from('l2_ai_usage')
          .select('kind')
          .eq('owner_id', accountId)
          .eq('day', '2000-01-01')
          .limit(5)
      ) as { kind: string }[];

      const existing = rows.find((r) => r.kind.startsWith('pwd:'));
      let isNewAccount = false;

      if (existing) {
        const stored = existing.kind.slice(4).split(':')[0];
        if (!await verifyPasswordHash(norm, password, stored)) {
          throw new Error('INVALID_PASSWORD');
        }
        if (!stored.startsWith('s1$')) {
          const pwdHash = await createPasswordHash(password);
          must(await db().from('l2_ai_usage').update({ kind: `pwd:${pwdHash}:${norm}` })
            .eq('owner_id', accountId).eq('kind', existing.kind).eq('day', '2000-01-01'));
        }
      } else {
        isNewAccount = true;
        const pwdHash = await createPasswordHash(password);
        await this.ensureProfile(accountId);
        must(
          await db().from('l2_ai_usage').insert({
            owner_id: accountId,
            kind: `pwd:${pwdHash}:${norm}`,
            day: '2000-01-01',
            count: 1,
          })
        );
      }

      if (previousDeviceId && previousDeviceId !== accountId && !await this.getAccountUsername?.(previousDeviceId)) {
        must(await db().from('l2_archives')
          .update({ owner_id: accountId, updated_at: new Date().toISOString() })
          .eq('owner_id', previousDeviceId));
      }

      return { accountId, username: norm, isNewAccount };
    } catch (err) {
      if (err instanceof Error && err.message === 'INVALID_PASSWORD') throw err;
      if (isSchemaMissingError(err) && fileStore.loginOrRegister) {
        return fileStore.loginOrRegister(username, password, previousDeviceId);
      }
      throw err;
    }
  },
};
