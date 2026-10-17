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
  hashAccountPassword,
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

const DATA_DIR = process.env.VERCEL
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
    // corrupted or unreadable — fallback to memory
  }
  if (!memory) {
    memory = { profiles: {}, archives: {}, usage: {} };
  }
  return memory;
}

function persist(db: FileDb) {
  memory = db;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const temporaryFile = `${FILE}.tmp`;
    fs.writeFileSync(temporaryFile, JSON.stringify(db, null, 2), 'utf8');
    fs.renameSync(temporaryFile, FILE);
  } catch {
    // Read-only filesystem fallback: keep in-memory state without throwing 500
  }
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
    const db = load();
    const current = db.profiles[deviceId] || (await this.ensureProfile(deviceId));
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
    const hit = Object.keys(db.usage).find((k) => k.startsWith(prefix));
    if (!hit) return null;
    const parts = hit.slice(prefix.length).split(':');
    return parts.slice(1).join(':') || null;
  },

  async loginOrRegister(username, password, previousDeviceId) {
    const norm = normalizeUsername(username);
    const accountId = accountUuidFromUsername(norm);
    const pwdHash = hashAccountPassword(norm, password);
    const db = load();
    const prefix = `${accountId}:pwd:`;
    const existingKey = Object.keys(db.usage).find((k) => k.startsWith(prefix));

    let isNewAccount = false;
    if (existingKey) {
      const expectedPrefix = `${accountId}:pwd:${pwdHash}:`;
      if (!existingKey.startsWith(expectedPrefix)) {
        throw new Error('INVALID_PASSWORD');
      }
    } else {
      isNewAccount = true;
      await this.ensureProfile(accountId);
      db.usage[`${accountId}:pwd:${pwdHash}:${norm}`] = 1;
      persist(db);
    }

    if (previousDeviceId && previousDeviceId !== accountId) {
      const prevItems = await this.listArchives(previousDeviceId);
      for (const item of prevItems) {
        if (!db.archives[item.id]) {
          await this.saveArchive(accountId, item);
        }
      }
    }

    return { accountId, username: norm, isNewAccount };
  },
};
