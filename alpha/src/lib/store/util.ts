import { createHash, randomInt, randomUUID } from 'crypto';
import { INITIAL_SKINS, PRESET_SLOTS } from '@/data/initialData';
import { Profile } from './types';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID_RE.test(v);
}

export function newId(): string {
  return randomUUID();
}

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '');
}

export function accountUuidFromUsername(username: string): string {
  const norm = normalizeUsername(username);
  const hex = createHash('sha256').update(`l2-account-v1:${norm}`).digest('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-a${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function hashAccountPassword(username: string, password: string): string {
  const norm = normalizeUsername(username);
  return createHash('sha256')
    .update(`l2-pwd-v1:${norm}:${password}`)
    .digest('hex')
    .slice(0, 32);
}

// No 0/O/1/I/L to avoid misreading when typed by hand.
const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

export function generateRecoveryCode(): string {
  const pick = () => CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  const block = () => Array.from({ length: 4 }, pick).join('');
  return `L2-${block()}-${block()}`;
}

export function normalizeRecoveryCode(raw: string): string {
  const cleaned = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
  const body = cleaned.startsWith('L2') ? cleaned.slice(2) : cleaned;
  if (body.length !== 8) return '';
  return `L2-${body.slice(0, 4)}-${body.slice(4)}`;
}

export function todayKST(): string {
  // Testers are in Korea; reset the daily AI quota at local midnight.
  return new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
}

export function defaultProfile(id: string, recoveryCode: string): Profile {
  return {
    id,
    recoveryCode,
    authorName: '',
    presetSlots: PRESET_SLOTS.map((s) => ({ ...s })),
    skins: { ...INITIAL_SKINS },
    defaultPresetId: PRESET_SLOTS[0].id,
  };
}

export function parseDataUrl(
  dataUrl: string
): { mime: string; ext: string; buffer: Buffer } | null {
  const m = /^data:(image\/(png|jpe?g|webp|gif));base64,(.+)$/i.exec(dataUrl);
  if (!m) return null;
  const ext = m[2].toLowerCase() === 'jpeg' ? 'jpg' : m[2].toLowerCase();
  return { mime: m[1].toLowerCase(), ext, buffer: Buffer.from(m[3], 'base64') };
}

export const MAX_PHOTO_BYTES = 3 * 1024 * 1024;
