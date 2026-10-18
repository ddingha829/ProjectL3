import { INITIAL_SKINS, PRESET_SLOTS } from '@/data/initialData';
import type { PresetSlot, SkinTheme } from '@/types/l2';
import { normalizeDefaultPresetId, normalizePresetSlot } from '@/lib/cardAppearance';
import { upgradeBundledPresets } from '@/lib/bundledPresets';
import { normalizeCategoryDefaults } from '@/lib/presetDefaults';

export interface PresetPreferences {
  presetSlots: PresetSlot[];
  skins: Record<string, SkinTheme>;
  authorName: string;
  defaultPresetId: string;
}

export function initialPresetPreferences(): PresetPreferences {
  return { presetSlots: PRESET_SLOTS.map(slot => ({ ...slot })), skins: Object.fromEntries(Object.entries(INITIAL_SKINS).map(([id, skin]) => [id, { ...skin }])), authorName: 'L2. ARCHIVE', defaultPresetId: PRESET_SLOTS[0].id };
}

/** Migrates local/server legacy preferences without changing saved records. */
export function normalizePresetPreferences(value: unknown, fallback = initialPresetPreferences()): PresetPreferences {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return fallback;
  const source = value as Partial<PresetPreferences>;
  const slots = Array.isArray(source.presetSlots) ? source.presetSlots.map(normalizePresetSlot).filter((slot): slot is PresetSlot => Boolean(slot)) : [];
  const presetSlots = normalizeCategoryDefaults(upgradeBundledPresets(slots.length ? slots.filter((slot, index) => slots.findIndex(other => other.id === slot.id) === index).slice(0, 20) : fallback.presetSlots));
  const skins = { ...INITIAL_SKINS, ...(source.skins && typeof source.skins === 'object' && !Array.isArray(source.skins) && Object.keys(source.skins).length ? source.skins : fallback.skins) };
  return {
    presetSlots,
    skins,
    authorName: typeof source.authorName === 'string' ? source.authorName : fallback.authorName,
    defaultPresetId: normalizeDefaultPresetId(source.defaultPresetId, presetSlots),
  };
}

export const PRESET_PREFERENCES_KEY = 'l2_test_preferences_v2';
export type PresetServerSnapshot = Partial<PresetPreferences> & { deviceId?: string; fromCache?: boolean };
export interface PreferenceEnvelope extends PresetPreferences {
  __l2Sync: { ownerId?: string; pending: boolean; revision: number };
}
export interface PreferenceStorage {
  read(key: string): unknown;
  write(key: string, value: PreferenceEnvelope): void;
}
export type PreferenceTransport = (url: string, init: RequestInit) => Promise<Response>;

export function normalizePreferenceEnvelope(value: unknown): PreferenceEnvelope {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Partial<PreferenceEnvelope> : {};
  const sync = source.__l2Sync;
  return {
    ...normalizePresetPreferences(source),
    __l2Sync: {
      ownerId: typeof sync?.ownerId === 'string' ? sync.ownerId : undefined,
      pending: sync?.pending === true,
      revision: typeof sync?.revision === 'number' && Number.isFinite(sync.revision) ? sync.revision : 0,
    },
  };
}

/** A durable preference change stays local until its owning device accepts it. */
export class PresetPreferenceRepository {
  private envelope = normalizePreferenceEnvelope(null);
  private ready = false;
  private error = '';
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private syncing: Promise<void> | null = null;
  private confirmedOwner: string | undefined;
  private hasLocalPreferences = false;
  private retryAfterCurrent = false;
  constructor(private storage: PreferenceStorage, private transport: PreferenceTransport) {}

  getView() {
    const { __l2Sync, ...preferences } = this.envelope;
    return { ...preferences, ready: this.ready, error: this.error, pending: __l2Sync.pending };
  }
  subscribe(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; }
  private publish() { this.listeners.forEach(listener => listener()); }
  start() {
    if (this.ready) return;
    try {
      const stored = this.storage.read(PRESET_PREFERENCES_KEY);
      if (stored) { this.envelope = normalizePreferenceEnvelope(stored); this.hasLocalPreferences = true; }
    }
    catch { this.error = '스타일을 불러오지 못했어요. 현재 설정은 유지합니다.'; }
    this.ready = true;
    this.publish();
  }
  private store() {
    try {
      this.storage.write(PRESET_PREFERENCES_KEY, this.envelope);
      this.hasLocalPreferences = true;
      const owner = this.envelope.__l2Sync.ownerId;
      if (owner) this.storage.write(`${PRESET_PREFERENCES_KEY}:${owner}`, this.envelope);
      return true;
    } catch {
      this.error = '스타일 변경을 기기에 보관하지 못했어요. 저장 공간을 확인해 주세요.';
      return false;
    }
  }
  applySnapshot(snapshot: PresetServerSnapshot | null) {
    this.start();
    if (!snapshot) return;
    const incomingOwner = snapshot.deviceId;
    const previousOwner = this.envelope.__l2Sync.ownerId;
    if (snapshot.fromCache) {
      // The archive cache may predate a successful preference POST. It is a
      // fallback only, never a reason to replace newer local preferences or
      // to confirm which device currently owns the HTTP-only cookie.
      if (!this.hasLocalPreferences) {
        this.envelope = { ...normalizePresetPreferences(snapshot), __l2Sync: { ownerId: incomingOwner, pending: false, revision: 0 } };
        this.store();
        this.publish();
      }
      return;
    }
    if (incomingOwner) this.confirmedOwner = incomingOwner;
    if (incomingOwner && previousOwner && incomingOwner !== previousOwner) {
      // The previous owner's pending changes remain in its own cache. They
      // must never be uploaded after a recovery code changes the cookie.
      this.store();
      let restored: PreferenceEnvelope | null = null;
      try {
        const saved = this.storage.read(`${PRESET_PREFERENCES_KEY}:${incomingOwner}`);
        if (saved) restored = normalizePreferenceEnvelope(saved);
      } catch { /* The server snapshot can recover this owner's preferences. */ }
      this.envelope = restored?.__l2Sync.ownerId === incomingOwner
        ? restored
        : { ...normalizePresetPreferences(snapshot), __l2Sync: { ownerId: incomingOwner, pending: false, revision: 0 } };
      this.error = '';
    }
    if (incomingOwner) this.envelope.__l2Sync.ownerId = incomingOwner;
    if (!this.envelope.__l2Sync.pending) {
      this.envelope = { ...normalizePresetPreferences({ ...this.getView(), ...snapshot }), __l2Sync: { ...this.envelope.__l2Sync } };
    }
    this.store();
    this.publish();
    if (this.envelope.__l2Sync.pending && incomingOwner) this.schedule();
  }
  update(patch: Partial<PresetPreferences> | ((previous: PresetPreferences) => PresetPreferences)) {
    this.start();
    const { ready: _ready, error: _error, pending: _pending, ...previous } = this.getView();
    const proposed = typeof patch === 'function' ? patch(previous) : { ...previous, ...patch };
    if (proposed.presetSlots.length > 20) throw new Error('프리셋은 20개까지 저장할 수 있어요.');
    const next = normalizePresetPreferences(proposed);
    const previousEnvelope = this.envelope;
    this.envelope = { ...next, __l2Sync: { ...this.envelope.__l2Sync, pending: true, revision: this.envelope.__l2Sync.revision + 1 } };
    this.error = '';
    if (!this.store()) { this.envelope = previousEnvelope; this.publish(); throw new Error(this.error); }
    this.publish();
    this.schedule();
  }
  private schedule() {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => { this.timer = null; void this.retrySync(); }, 250);
  }
  async retrySync(): Promise<void> {
    this.start();
    if (!this.envelope.__l2Sync.ownerId || this.confirmedOwner !== this.envelope.__l2Sync.ownerId || !this.envelope.__l2Sync.pending) return;
    if (this.syncing) { this.retryAfterCurrent = true; return this.syncing; }
    this.syncing = this.flush().finally(() => {
      this.syncing = null;
      if (this.retryAfterCurrent) { this.retryAfterCurrent = false; void this.retrySync(); }
    });
    return this.syncing;
  }
  private async flush(): Promise<void> {
    while (this.envelope.__l2Sync.pending && this.envelope.__l2Sync.ownerId && this.confirmedOwner === this.envelope.__l2Sync.ownerId) {
      const captured = normalizePreferenceEnvelope(structuredClone(this.envelope));
      const { __l2Sync, ...preferences } = captured;
      try {
        const response = await this.transport('/api/presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...preferences, replaceSkins: true, expectedDeviceId: __l2Sync.ownerId }) });
        if (!response.ok) throw new Error(response.status === 409 ? 'OWNER_CHANGED' : 'SYNC_FAILED');
        if (this.envelope.__l2Sync.ownerId !== __l2Sync.ownerId) return;
        if (this.envelope.__l2Sync.revision === __l2Sync.revision) {
          this.envelope.__l2Sync.pending = false;
          this.error = '';
          this.store();
          this.publish();
        }
      } catch (error) {
        if (this.envelope.__l2Sync.ownerId !== __l2Sync.ownerId) return;
        this.error = error instanceof Error && error.message === 'OWNER_CHANGED'
          ? '기기가 변경되어 이전 스타일을 전송하지 않았어요.'
          : '스타일은 기기에 보관했습니다. 연결되면 다시 동기화합니다.';
        this.store();
        this.publish();
        return;
      }
    }
  }
  stop() { if (this.timer) clearTimeout(this.timer); this.timer = null; }
}
