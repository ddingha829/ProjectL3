import fs from 'fs';
import path from 'path';
import {
  ArchiveItem,
  L2DatabaseSchema,
  PresetSlot,
  SkinTheme,
} from '@/types/l2';
import {
  INITIAL_ARCHIVES,
  INITIAL_SKINS,
  PRESET_SLOTS,
} from '@/data/initialData';

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE_PATH = path.join(DATA_DIR, 'l2_db.json');

let memoryFallbackStore: L2DatabaseSchema | null = null;

function createDefaultDb(): L2DatabaseSchema {
  return {
    archives: [...INITIAL_ARCHIVES],
    presetSlots: [...PRESET_SLOTS],
    skins: { ...INITIAL_SKINS },
    authorName: '여수피카츄',
    updatedAt: new Date().toISOString(),
  };
}

export function readDb(): L2DatabaseSchema {
  try {
    if (fs.existsSync(DB_FILE_PATH)) {
      const raw = fs.readFileSync(DB_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw) as L2DatabaseSchema;
      if (parsed && Array.isArray(parsed.archives)) {
        memoryFallbackStore = parsed;
        return parsed;
      }
    }
  } catch {
    // Fallback to memory store if filesystem is read-only
  }

  if (!memoryFallbackStore) {
    memoryFallbackStore = createDefaultDb();
    writeDb(memoryFallbackStore);
  }
  return memoryFallbackStore;
}

export function writeDb(nextDb: L2DatabaseSchema): L2DatabaseSchema {
  nextDb.updatedAt = new Date().toISOString();
  memoryFallbackStore = nextDb;
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE_PATH, JSON.stringify(nextDb, null, 2), 'utf8');
  } catch {
    // Ignore write error in serverless read-only environments; memoryFallbackStore remains active
  }
  return nextDb;
}

export function getArchiveById(id: string): ArchiveItem | undefined {
  const db = readDb();
  return db.archives.find((a) => a.id === id);
}

export function addArchiveItem(item: ArchiveItem): L2DatabaseSchema {
  const db = readDb();
  const existingIdx = db.archives.findIndex((a) => a.id === item.id);
  if (existingIdx >= 0) {
    db.archives[existingIdx] = item;
  } else {
    db.archives = [item, ...db.archives].map((a, idx) => ({
      ...a,
      num: String(idx + 1).padStart(2, '0'),
    }));
  }
  return writeDb(db);
}

export function updateArchiveItem(
  id: string,
  patch: Partial<ArchiveItem>
): L2DatabaseSchema {
  const db = readDb();
  db.archives = db.archives.map((item) =>
    item.id === id ? { ...item, ...patch } : item
  );
  return writeDb(db);
}

export function deleteArchiveItem(id: string): L2DatabaseSchema {
  const db = readDb();
  const filtered = db.archives.filter((item) => item.id !== id);
  db.archives = filtered.map((a, idx) => ({
    ...a,
    num: String(idx + 1).padStart(2, '0'),
  }));
  return writeDb(db);
}

export function updatePresetsAndSkins(payload: {
  presetSlots?: PresetSlot[];
  skins?: Record<string, SkinTheme>;
  authorName?: string;
}): L2DatabaseSchema {
  const db = readDb();
  if (payload.presetSlots) db.presetSlots = payload.presetSlots;
  if (payload.skins) db.skins = { ...db.skins, ...payload.skins };
  if (typeof payload.authorName === 'string') {
    db.authorName = payload.authorName;
  }
  return writeDb(db);
}
