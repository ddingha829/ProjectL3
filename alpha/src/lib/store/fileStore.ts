import fs from 'fs';
import os from 'os';
import path from 'path';
import { ArchiveItem } from '@/types/l2';
import { AiUsageKind, L2Store, Profile, ProfilePrefs } from './types';
import { cloneCardAppearance, normalizeDefaultPresetId } from '@/lib/cardAppearance';
import {
  accountUuidFromUsername,
  defaultProfile,
  generateRecoveryCode,
  createPasswordHash,
  verifyPasswordHash,
  MAX_PHOTO_BYTES,
  normalizeUsername,
  parseDataUrl,
  todayKST,
} from './util';

/**
 * Local-development & serverless fallback store. Keeps every device's data
 * in one JSON file partitioned by device id. On Vercel without Supabase,
 * writes to `/tmp` and keeps an in-memory copy so API routes never throw EROFS.
 */

interface FileDb {
  profiles: Record<string, Profile>;
  archives: Record<string, { ownerId: string; item: ArchiveItem; createdAt: number }>;
  usage: Record<string, number>; // `${ownerId}:${kind}:${day}`
}

const DATA_DIR = process.env.L2_DATA_DIRECTORY && !process.env.VERCEL ? path.resolve(process.env.L2_DATA_DIRECTORY) : process.env.VERCEL
  ? path.join(os.tmpdir(), 'l2-alpha-data')
  : path.join(process.cwd(), '.test-data');
const FILE = path.join(DATA_DIR, 'l2_users.json');

let memory: FileDb | null = null;

function load(): FileDb {
  try {
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8')) as FileDb;
      memory = {
        profiles: Object.fromEntries(Object.entries(parsed.profiles || {}).map(([id, profile]) => [id, { ...profile, defaultPresetId: normalizeDefaultPresetId(profile.defaultPresetId, profile.presetSlots) }])),
        archives: parsed.archives || {},
        usage: parsed.usage || {},
      };
      return memory;
    }
  } catch {
    throw new Error('기록 파일을 읽지 못했어요. 기존 파일을 덮어쓰지 않았습니다.');
  }
  if (!memory) {
    memory = { profiles: {}, archives: {}, usage: {} };
  }
  return memory;
}

function persist(db: FileDb) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  const temporaryFile = `${FILE}.tmp`;
  fs.writeFileSync(temporaryFile, JSON.stringify(db, null, 2), 'utf8');
  fs.renameSync(temporaryFile, FILE);
  memory = db;
}

function renumber(items: ArchiveItem[]): ArchiveItem[] {
  // Oldest = 01 so numbers stay stable as new logs are added.
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

export const fileStore: L2Store = {
  kind: 'file',

  async ensureProfile(deviceId) {
    const db = load();
    if (!db.profiles[deviceId]) {
      const used = new Set(Object.values(db.profiles).map((p) => p.recoveryCode));
      let code = generateRecoveryCode();
      while (used.has(code)) code = generateRecoveryCode();
      db.profiles[deviceId] = defaultProfile(deviceId, code);
      persist(db);
    }
    return db.profiles[deviceId];
  },

  async getProfile(deviceId) {
    return load().profiles[deviceId] || null;
  },

  async findDeviceByRecoveryCode(code) {
    const hit = Object.values(load().profiles).find((p) => p.recoveryCode === code);
    return hit ? hit.id : null;
  },

  async savePrefs(deviceId, prefs: ProfilePrefs) {
    await this.ensureProfile(deviceId);
    const db = load();
    const current = db.profiles[deviceId];
    const next: Profile = {
      ...current,
      ...(typeof prefs.authorName === 'string' ? { authorName: prefs.authorName } : {}),
      ...(prefs.presetSlots ? { presetSlots: prefs.presetSlots } : {}),
      ...(prefs.skins
        ? { skins: prefs.replaceSkins ? { ...prefs.skins } : { ...current.skins, ...prefs.skins } }
        : {}),
      defaultPresetId: normalizeDefaultPresetId(prefs.defaultPresetId ?? current.defaultPresetId, prefs.presetSlots || current.presetSlots),
    };
    db.profiles[deviceId] = next;
    persist(db);
    return next;
  },

  async listArchives(ownerId) {
    const rows = Object.values(load().archives)
      .filter((r) => r.ownerId === ownerId)
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((r) => r.item);
    return renumber(rows);
  },

  async getOwnedArchive(ownerId, id) {
    const row = load().archives[id];
    return row && row.ownerId === ownerId ? row.item : null;
  },

  async saveArchive(ownerId, item) {
    const db = load();
    const existing = db.archives[item.id];
    if (existing && existing.ownerId !== ownerId) return null;
    const largestNumber = Math.max(0, ...Object.values(db.archives)
      .filter(row => row.ownerId === ownerId)
      .map(row => Number(row.item.num) || 0));
    const saved = { ...item, ...(item.cardAppearance ? { cardAppearance: cloneCardAppearance(item.cardAppearance) } : {}), num: existing?.item.num || String(largestNumber + 1).padStart(2, '0') };
    db.archives[item.id] = {
      ownerId,
      item: saved,
      createdAt: existing?.createdAt ?? Date.now(),
    };
    persist(db);
    return saved;
  },

  async deleteArchive(ownerId, id) {
    const db = load();
    if (db.archives[id]?.ownerId === ownerId) {
      delete db.archives[id];
      persist(db);
    }
  },

  async deleteAllArchives(ownerId) {
    const db = load();
    for (const [id, row] of Object.entries(db.archives)) if (row.ownerId === ownerId) delete db.archives[id];
    persist(db);
  },

  async getPublicArchive(id) {
    const db = load();
    const row = db.archives[id];
    if (!row) return null;
    const profile = db.profiles[row.ownerId];
    if (!profile) return null;
    return { item: row.item, profile };
  },

  async uploadPhoto(_ownerId, dataUrl) {
    // Dev only: keep the compressed data URL inline.
    const parsed = parseDataUrl(dataUrl);
    if (!parsed || parsed.buffer.length > MAX_PHOTO_BYTES) {
      throw new Error('Invalid or oversized image');
    }
    return dataUrl;
  },

  async bumpUsage(ownerId, kind: AiUsageKind) {
    const db = load();
    const key = `${ownerId}:${kind}:${todayKST()}`;
    db.usage[key] = (db.usage[key] || 0) + 1;
    persist(db);
    return db.usage[key];
  },

  async getUsage(ownerId, kind: AiUsageKind) {
    return load().usage[`${ownerId}:${kind}:${todayKST()}`] || 0;
  },

  async getAccountUsername(deviceId) {
    const db = load();
    const prefix = `${deviceId}:pwd:`;
    const oauth = Object.keys(db.usage).find(k => k.startsWith(`${deviceId}:oauth:google:`));
    if (oauth) return decodeURIComponent(oauth.slice(`${deviceId}:oauth:google:`.length));
    const hit = Object.keys(db.usage).find((k) => k.startsWith(prefix));
    if (!hit) return null;
    const parts = hit.slice(prefix.length).split(':');
    return parts.slice(1).join(':') || null;
  },

  async loginWithGoogle(identity, previousDeviceId) {
    const accountId = identity.id, username = `Google · ${identity.label.slice(0, 80)}`;
    const isNewAccount = !await this.getAccountUsername?.(accountId);
    const previousIsGuest = previousDeviceId && previousDeviceId !== accountId && !await this.getAccountUsername?.(previousDeviceId);
    await this.ensureProfile(accountId);
    const current = load();
    if (isNewAccount && previousIsGuest && current.profiles[previousDeviceId]) {
      const guest = current.profiles[previousDeviceId];
      current.profiles[accountId] = {...current.profiles[accountId], authorName:guest.authorName, presetSlots:guest.presetSlots, skins:guest.skins, defaultPresetId:guest.defaultPresetId};
    }
    current.usage[`${accountId}:oauth:google:${encodeURIComponent(username)}`] = 1;
    if (previousIsGuest) for (const row of Object.values(current.archives)) if (row.ownerId === previousDeviceId) row.ownerId = accountId;
    persist(current);
    return {accountId, username, isNewAccount};
  },

  async loginOrRegister(username, password, previousDeviceId) {
    const norm = normalizeUsername(username);
    const accountId = accountUuidFromUsername(norm);
    const db = load();
    const prefix = `${accountId}:pwd:`;
    const existingKey = Object.keys(db.usage).find((k) => k.startsWith(prefix));

    let isNewAccount = false;
    if (existingKey) {
      const stored = existingKey.slice(prefix.length).split(':')[0];
      if (!await verifyPasswordHash(norm, password, stored)) {
        throw new Error('INVALID_PASSWORD');
      }
      if (!stored.startsWith('s1$')) {
        const pwdHash = await createPasswordHash(password);
        const current = load();
        delete current.usage[existingKey];
        current.usage[`${prefix}${pwdHash}:${norm}`] = 1;
        persist(current);
      }
    } else {
      isNewAccount = true;
      const pwdHash = await createPasswordHash(password);
      await this.ensureProfile(accountId);
      const current = load();
      const raced = Object.keys(current.usage).find(key => key.startsWith(prefix));
      if (raced) {
        if (!await verifyPasswordHash(norm, password, raced.slice(prefix.length).split(':')[0])) throw new Error('INVALID_PASSWORD');
        isNewAccount = false;
      } else current.usage[`${accountId}:pwd:${pwdHash}:${norm}`] = 1;
      persist(current);
    }

    if (previousDeviceId && previousDeviceId !== accountId && !await this.getAccountUsername?.(previousDeviceId)) {
      // Transfer anonymous ownership explicitly; the normal save guard must
      // reject another owner's IDs. Never merge registered account A into B.
      const current = load();
      for (const row of Object.values(current.archives)) {
        if (row.ownerId === previousDeviceId) row.ownerId = accountId;
      }
      persist(current);
    }

    return { accountId, username: norm, isNewAccount };
  },
};
