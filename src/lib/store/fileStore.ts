import fs from 'fs';
import path from 'path';
import { ArchiveItem } from '@/types/l2';
import { AiUsageKind, L2Store, Profile, ProfilePrefs } from './types';
import {
  defaultProfile,
  generateRecoveryCode,
  MAX_PHOTO_BYTES,
  parseDataUrl,
  todayKST,
} from './util';

/**
 * Local-development store. Keeps every device's data in one JSON file,
 * partitioned by device id. On read-only hosts (Vercel without Supabase)
 * it degrades to in-memory only — data will not survive cold starts.
 */

interface FileDb {
  profiles: Record<string, Profile>;
  archives: Record<string, { ownerId: string; item: ArchiveItem; createdAt: number }>;
  usage: Record<string, number>; // `${ownerId}:${kind}:${day}`
}

const DATA_DIR = path.join(process.cwd(), 'data');
const FILE = path.join(DATA_DIR, 'l2_users.json');

let memory: FileDb | null = null;

function load(): FileDb {
  try {
    if (fs.existsSync(FILE)) {
      const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8')) as FileDb;
      memory = {
        profiles: parsed.profiles || {},
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
    fs.writeFileSync(FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch {
    // read-only filesystem: keep in memory
  }
}

function renumber(items: ArchiveItem[]): ArchiveItem[] {
  // Oldest = 01 so numbers stay stable as new logs are added.
  const total = items.length;
  return items.map((it, idx) => ({
    ...it,
    num: String(total - idx).padStart(2, '0'),
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
      ...(prefs.skins ? { skins: { ...current.skins, ...prefs.skins } } : {}),
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
    db.archives[item.id] = {
      ownerId,
      item,
      createdAt: existing?.createdAt ?? Date.now(),
    };
    persist(db);
    return item;
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
};
