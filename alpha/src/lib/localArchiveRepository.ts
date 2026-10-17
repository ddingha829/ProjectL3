import type { ArchiveItem, PresetSlot, SkinTheme } from '@/types/l2';
import { cloneCardAppearance } from '@/lib/cardAppearance';

export interface ArchiveServerSnapshot {
  deviceId?: string;
  username?: string | null;
  storeKind?: 'supabase' | 'file';
  recoveryCode?: string;
  authorName?: string;
  presetSlots?: PresetSlot[];
  skins?: Record<string, SkinTheme>;
  defaultPresetId?: string;
  /** View-only marker: an IndexedDB snapshot has not confirmed the live cookie. */
  fromCache?: boolean;
  aiUsage?: { used: number; limit: number };
}

export interface ArchiveOperation {
  id: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  item?: ArchiveItem;
  revision: number;
  attempts: number;
  state: 'pending' | 'failed';
  error?: string;
}

export interface LocalArchiveState {
  archives: ArchiveItem[];
  outbox: ArchiveOperation[];
  ownerId?: string;
  serverSnapshot: ArchiveServerSnapshot | null;
}

export interface ArchiveStorage {
  read(key?: string): Promise<LocalArchiveState | null>;
  write(state: LocalArchiveState, key?: string): Promise<void>;
}

export interface RepositoryView {
  archives: ArchiveItem[];
  ready: boolean;
  status: 'loading' | 'synced' | 'pending' | 'failed';
  pendingCount: number;
  error: string | null;
  serverSnapshot: ArchiveServerSnapshot | null;
  itemStatus: Record<string, 'pending' | 'failed'>;
}

export type ArchiveTransport = (url: string, init?: RequestInit) => Promise<Response>;
const emptyState = (): LocalArchiveState => ({ archives: [], outbox: [], serverSnapshot: null });
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export function localizeArchiveError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  if ((error instanceof Error && error.name === 'AbortError') || /request.*abort|timed?\s*out/i.test(raw)) {
    return '연결이 지연되고 있어요. 이 기기에 보관한 기록은 유지되며 동기화를 다시 시도할 수 있어요.';
  }
  if (/failed to fetch|networkerror|load failed|^offline$|network request failed/i.test(raw)) {
    return '서버에 연결하지 못했어요. 이 기기에 보관한 기록은 유지되며 연결되면 다시 동기화해요.';
  }
  return raw;
}
const message = localizeArchiveError;

export class IndexedDbArchiveStorage implements ArchiveStorage {
  private database: Promise<IDBDatabase> | null = null;
  private open(): Promise<IDBDatabase> {
    if (!this.database) this.database = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('이 브라우저에서는 기기 저장소를 사용할 수 없습니다.')); return; }
      const request = indexedDB.open('l2_test_archives_v1', 1);
      request.onupgradeneeded = () => request.result.createObjectStore('repository');
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('기기 저장소를 열 수 없습니다.'));
      request.onblocked = () => reject(new Error('다른 탭을 닫고 다시 시도해주세요.'));
    });
    return this.database;
  }
  async read(key = 'current'): Promise<LocalArchiveState | null> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('repository', 'readonly');
      const request = transaction.objectStore('repository').get(key);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }
  async write(state: LocalArchiveState, key = 'current'): Promise<void> {
    const database = await this.open();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction('repository', 'readwrite');
      transaction.objectStore('repository').put(state, key);
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('기기에 기록을 저장하지 못했습니다.'));
      transaction.onabort = () => reject(transaction.error || new Error('기기 저장이 취소되었습니다.'));
    });
  }
}

export const archiveTransport: ArchiveTransport = async (url, init) => {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) throw new Error('오프라인입니다. 연결되면 자동으로 동기화합니다.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  try {
    return await fetch(url, { ...init, signal: controller.signal, cache: 'no-store' });
  } finally { clearTimeout(timeout); }
};

/** Local durable commit happens before success is exposed to the interface. */
export class LocalArchiveRepository {
  private state = emptyState();
  private ready = false;
  private error: string | null = null;
  private listeners = new Set<(view: RepositoryView) => void>();
  private localStart: Promise<void> | null = null;
  private networkStart: Promise<void> | null = null;
  private mutations: Promise<void> = Promise.resolve();
  private syncing: Promise<void> | null = null;
  private revision = 0;
  private sessionReady = false;
  private snapshotFromCache = false;
  private cachedSnapshotSource: ArchiveServerSnapshot | null = null;
  private cachedSnapshotView: ArchiveServerSnapshot | null = null;

  constructor(private storage: ArchiveStorage, private transport: ArchiveTransport = archiveTransport) {}

  getView(): RepositoryView {
    const failedOperation = this.state.outbox.find(operation => operation.state === 'failed');
    const failed = Boolean(failedOperation);
    return {
      archives: this.state.archives, ready: this.ready,
      status: !this.ready ? 'loading' : failed ? 'failed' : this.state.outbox.length ? 'pending' : this.error ? 'failed' : 'synced',
      pendingCount: this.state.outbox.length, error: failedOperation?.error || this.error,
      serverSnapshot: this.visibleServerSnapshot(),
      itemStatus: Object.fromEntries(this.state.outbox.map(operation => [operation.id, operation.state])),
    };
  }
  private visibleServerSnapshot(): ArchiveServerSnapshot | null {
    const snapshot = this.state.serverSnapshot;
    if (!snapshot || !this.snapshotFromCache) return snapshot;
    if (this.cachedSnapshotSource !== snapshot) {
      this.cachedSnapshotSource = snapshot;
      this.cachedSnapshotView = { ...snapshot, fromCache: true };
    }
    return this.cachedSnapshotView;
  }
  subscribe(listener: (view: RepositoryView) => void): () => void {
    this.listeners.add(listener);
    listener(this.getView());
    return () => { this.listeners.delete(listener); };
  }
  private publish() { const view = this.getView(); this.listeners.forEach(listener => listener(view)); }
  private initializeLocal(): Promise<void> {
    if (!this.localStart) this.localStart = (async () => {
      try {
        const saved = await this.storage.read();
        if (saved && Array.isArray(saved.archives) && Array.isArray(saved.outbox)) {
          this.state = saved;
          this.snapshotFromCache = Boolean(saved.serverSnapshot);
        }
        this.revision = Math.max(0, ...this.state.outbox.map(operation => operation.revision));
      } catch (error) { this.error = message(error); throw error; }
      finally { this.ready = true; this.publish(); }
    })();
    return this.localStart;
  }
  private mutate(update: (current: LocalArchiveState) => LocalArchiveState): Promise<void> {
    const operation = this.mutations.then(async () => {
      const next = update(this.state);
      await this.storage.write(next);
      this.state = next;
      this.publish();
    });
    this.mutations = operation.catch(error => { this.error = message(error); this.publish(); });
    return operation;
  }
  private normalizeChronologicalNumbers(list: ArchiveItem[]): ArchiveItem[] {
    const sorted = [...list].sort((a, b) => b.timestamp - a.timestamp);
    const nonGroupsOldestFirst = sorted
      .filter(entry => entry.kind !== 'group' && entry.cat !== 'GROUP')
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
    const numById = new Map(
      nonGroupsOldestFirst.map((entry, idx) => [entry.id, String(idx + 1).padStart(2, '0')])
    );
    return sorted.map(entry => {
      const assigned = numById.get(entry.id);
      return assigned && entry.num !== assigned ? { ...entry, num: assigned } : entry;
    });
  }
  private merge(server: ArchiveItem[], outbox: ArchiveOperation[]): ArchiveItem[] {
    const items = new Map(server.map(item => [item.id, item]));
    for (const operation of outbox) {
      if (operation.method === 'DELETE') items.delete(operation.id);
      else if (operation.item) items.set(operation.id, operation.item);
    }
    return this.normalizeChronologicalNumbers([...items.values()]);
  }
  start(): Promise<void> {
    if (!this.networkStart) this.networkStart = this.refresh();
    return this.networkStart;
  }
  async refresh(): Promise<void> {
    try {
      await this.initializeLocal();
      const sessionResponse = await this.transport('/api/session');
      if (!sessionResponse.ok) throw new Error('기기 세션을 연결하지 못했습니다.');
      const session = await sessionResponse.json() as ArchiveServerSnapshot;
      // Recovery changes the cookie. Keep each owner's pending work separate.
      if (this.state.ownerId && session.deviceId && this.state.ownerId !== session.deviceId) {
        await this.storage.write(this.state, `owner:${this.state.ownerId}`);
        const restored = await this.storage.read(`owner:${session.deviceId}`);
        await this.mutate(() => restored || emptyState());
      }
      this.snapshotFromCache = false;
      await this.mutate(current => ({ ...current, ownerId: session.deviceId, serverSnapshot: session }));
      this.sessionReady = true;
      const response = await this.transport('/api/logs');
      if (!response.ok) throw new Error('서버 기록을 불러오지 못했습니다. 기기 기록은 보존되었습니다.');
      const data = await response.json();
      if (!Array.isArray(data.archives)) throw new Error('서버 기록 응답을 확인할 수 없습니다.');
      this.error = null;
      await this.mutate(current => ({ ...current, archives: this.merge(data.archives, current.outbox), serverSnapshot: { ...session, ...data, archives: undefined } }));
      await this.flush();
    } catch (error) { this.error = message(error); this.publish(); }
  }
  async save(input: ArchiveItem, isEdit = false): Promise<{ item: ArchiveItem; synced: boolean }> {
    await this.initializeLocal();
    const item = { ...input, ...(input.cardAppearance ? { cardAppearance: cloneCardAppearance(input.cardAppearance) } : {}), id: uuid.test(input.id) ? input.id : crypto.randomUUID() };
    await this.mutate(current => {
      const existing = current.archives.find(archive => archive.id === item.id);
      if (existing && isEdit) { item.timestamp = existing.timestamp; item.date = existing.date; item.num = existing.num; }
      const nextArchives = this.normalizeChronologicalNumbers([item, ...current.archives.filter(archive => archive.id !== item.id)]);
      const normalizedItem = nextArchives.find(archive => archive.id === item.id) || item;
      item.num = normalizedItem.num;
      const previous = current.outbox.find(operation => operation.id === item.id);
      const operation: ArchiveOperation = {
        id: item.id, item: normalizedItem, method: previous?.method === 'POST' || !isEdit ? 'POST' : 'PATCH',
        revision: ++this.revision, attempts: 0, state: 'pending',
      };
      return {
        ...current,
        archives: nextArchives,
        outbox: [...current.outbox.filter(queued => queued.id !== item.id), operation],
      };
    });
    this.error = null;
    this.publish();
    void this.flush();
    return { item, synced: false };
  }
  async remove(id: string): Promise<void> {
    await this.initializeLocal();
    await this.mutate(current => ({
      ...current, archives: current.archives.filter(item => item.id !== id),
      outbox: [...current.outbox.filter(operation => operation.id !== id), { id, method: 'DELETE', revision: ++this.revision, attempts: 0, state: 'pending' }],
    }));
    void this.flush();
  }
  async setArchives(update: ArchiveItem[] | ((current: ArchiveItem[]) => ArchiveItem[])): Promise<void> {
    await this.initializeLocal();
    await this.mutate(current => ({ ...current, archives: typeof update === 'function' ? update(current.archives) : update }));
  }
  async retrySync(): Promise<void> {
    await this.initializeLocal();
    this.error = null;
    await this.mutate(current => ({ ...current, outbox: current.outbox.map(operation => ({ ...operation, state: 'pending', error: undefined })) }));
    if (!this.sessionReady) await this.refresh();
    else await this.flush();
  }
  private flush(): Promise<void> {
    if (this.syncing) return this.syncing;
    this.syncing = this.flushQueue().finally(() => { this.syncing = null; });
    return this.syncing;
  }
  private async flushQueue(): Promise<void> {
    try {
      if (!this.sessionReady) {
        // start/refresh owns session creation; wait for its cookie before writes.
        return;
      }
      while (true) {
        await this.mutations;
        const operation = this.state.outbox.find(queued => queued.state === 'pending');
        if (!operation) break;
        try {
          const response = await this.transport(operation.method === 'DELETE' ? `/api/logs?id=${encodeURIComponent(operation.id)}` : '/api/logs', {
            method: operation.method, headers: { 'Content-Type': 'application/json' },
            ...(operation.item ? { body: JSON.stringify(operation.item) } : {}),
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok) {
            const detail = data.detail || data.error || '서버에 아직 동기화하지 못했습니다.';
            const permanent = response.status >= 400 && response.status < 500 && response.status !== 408 && response.status !== 429;
            await this.mutate(current => ({ ...current, outbox: current.outbox.map(queued => queued.id === operation.id && queued.revision === operation.revision ? { ...queued, attempts: queued.attempts + 1, state: permanent ? 'failed' : 'pending', error: detail } : queued) }));
            this.error = detail;
            this.publish();
            if (!permanent) break;
            continue;
          }
          this.error = null;
          await this.mutate(current => {
            const outbox = current.outbox.filter(queued => !(queued.id === operation.id && queued.revision === operation.revision));
            const serverArchives = Array.isArray(data.archives) ? data.archives : current.archives;
            return { ...current, outbox, archives: this.merge(serverArchives, outbox) };
          });
        } catch (error) {
          this.error = message(error);
          await this.mutate(current => ({ ...current, outbox: current.outbox.map(queued => queued.id === operation.id && queued.revision === operation.revision ? { ...queued, attempts: queued.attempts + 1, error: this.error || undefined } : queued) }));
          break;
        }
      }
    } catch (error) { this.error = message(error); this.publish(); }
  }
}
