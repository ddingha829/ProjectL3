import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const modules = new Map();
function load(relative) {
  const filename = path.isAbsolute(relative) ? relative : path.join(project, relative);
  if (modules.has(filename)) return modules.get(filename).exports;
  const module = { exports: {} };
  modules.set(filename, module);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
  const scopedRequire = name => {
    if (name === 'server-only') return {};
    if (name.startsWith('@/') || name.startsWith('.')) {
      const base = name.startsWith('@/') ? path.join(project, 'src', name.slice(2)) : path.resolve(path.dirname(filename), name);
      return load(fs.existsSync(`${base}.ts`) ? `${base}.ts` : path.join(base, 'index.ts'));
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', source)(scopedRequire, module, module.exports);
  return module.exports;
}

const { LocalArchiveRepository, localizeArchiveError } = load('src/lib/localArchiveRepository.ts');
const { normalizeLogInput } = load('src/lib/store/logInput.ts');
const { normalizeSkinTheme, parseSkinColor, skinContrast } = load('src/lib/skinValidation.ts');
const { ARCHIVE_CATEGORIES, getArchiveCategory, isArchiveCategory } = load('src/lib/archiveCategories.ts');
const { isStoredDraft } = load('src/hooks/useLogDraft.ts');
const { createCardAppearance, normalizeCardAppearance, normalizeDefaultPresetId } = load('src/lib/cardAppearance.ts');
const { initialPresetPreferences, normalizePresetPreferences, PresetPreferenceRepository, PRESET_PREFERENCES_KEY } = load('src/lib/presetPreferences.ts');
const { INITIAL_SKINS, PRESET_SLOTS } = load('src/data/initialData.ts');
class DurableMemory {
  values = new Map();
  async read(key = 'current') { return structuredClone(this.values.get(key) || null); }
  async write(value, key = 'current') { this.values.set(key, structuredClone(value)); }
}
const waitFor = async (check, label) => {
  for (let attempt = 0; attempt < 100; attempt++) {
    if (check()) return;
    await new Promise(resolve => setTimeout(resolve, 5));
  }
  throw new Error(`Timed out: ${label}`);
};
function server() {
  const rows = new Map();
  const calls = [];
  let offline = false;
  let rejectSave = false;
  let loseResponse = false;
  let gate = null;
  const transport = async (url, init = {}) => {
    calls.push({ url, method: init.method });
    if (offline) throw new Error('offline');
    if (url === '/api/session') return Response.json({ deviceId: 'test-owner', authorName: 'TEST' });
    if (url === '/api/logs/reset' && init.method === 'DELETE') { assert.equal(JSON.parse(init.body).expectedDeviceId, 'test-owner'); rows.clear(); return Response.json({ archives: [], deviceId: 'test-owner' }); }
    if (init.method === 'DELETE') rows.delete(new URL(url, 'http://local').searchParams.get('id'));
    else if (init.method === 'POST' || init.method === 'PATCH') {
      if (gate) await gate;
      if (rejectSave) return Response.json({ detail: 'invalid test record' }, { status: 400 });
      const item = JSON.parse(init.body);
      rows.set(item.id, structuredClone(item));
      if (loseResponse) { loseResponse = false; throw new Error('response lost after server commit'); }
    }
    return Response.json({ archives: [...rows.values()] });
  };
  return {
    rows, calls, transport,
    offline: value => { offline = value; }, rejectSave: value => { rejectSave = value; },
    loseNextResponse: () => { loseResponse = true; }, hold: value => { gate = value; },
  };
}
const createItem = (quote = '조용한 공간과 따뜻한 커피', cat = 'DINING') => normalizeLogInput({ id: randomUUID(), cat, quote, img: '', hasPhoto: false, score: '' });

const input = createItem();
assert.equal(input.addressShort, '');
assert.equal(input.img, '');
assert.equal(input.score, '');
assert.equal(input.good, '');
assert.equal(input.title, input.quote);
assert.throws(() => normalizeLogInput({ cat: 'UNKNOWN', quote: 'memo' }));
assert.throws(() => normalizeLogInput({ cat: 'DINING', quote: '', img: '' }));
const editedInput = normalizeLogInput({ ...input, quote: 'edited', date: '99.01.01', timestamp: 123 }, input);
assert.equal(editedInput.date, input.date);
assert.equal(editedInput.timestamp, input.timestamp);
console.log('PASS honest blanks, category/minimum validation, stable edit dates');

assert.deepEqual(ARCHIVE_CATEGORIES.map(category => [category.id, category.label, category.icon]), [
  ['DINING', '미식', 'dining'], ['CINEMA', '영화', 'cinema'], ['ART', '장소', 'place'], ['OTHER', '기타', 'other'],
]);
for (const category of ARCHIVE_CATEGORIES) {
  assert.equal(isArchiveCategory(category.id), true);
  assert.equal(getArchiveCategory(category.id).label, category.label);
  assert.equal(createItem('카테고리 왕복', category.id).cat, category.id);
  assert.equal(isStoredDraft({ title: '', body: '복원할 초안', category: category.id, score: null, img: '', cropX: 50, cropY: 50, place: null, good: '', bad: '', note: '' }), true);
}
assert.equal(isArchiveCategory('PLACE'), false);
assert.equal(isArchiveCategory('UNKNOWN'), false);
assert.match(localizeArchiveError(new TypeError('Failed to fetch')), /서버에 연결하지 못했어요/);
assert.equal(localizeArchiveError(new Error('quota exceeded')), 'quota exceeded', 'actual storage errors remain visible');
console.log('PASS four-category registry, legacy ART, OTHER draft validation, localized network errors');

const mutableSlot = { ...PRESET_SLOTS[1], showDecorations: false };
const mutableSkins = structuredClone(INITIAL_SKINS);
const appearance = createCardAppearance({ img: '', hasPhoto: false }, mutableSlot, mutableSkins, '기록자');
assert.equal(appearance.slot.layout, 'broadside');
assert.equal(appearance.slot.showDecorations, false);
assert.equal(normalizePresetPreferences({ ...initialPresetPreferences(), presetSlots: [mutableSlot] }).presetSlots[0].showDecorations, false);
const frozenAppearance = structuredClone(appearance);
mutableSlot.layout = 'vinyl';
mutableSkins[mutableSlot.skinId].bg = '#000000';
assert.deepEqual(appearance, frozenAppearance, 'snapshot does not share editable preset/theme objects');
assert.equal(normalizeCardAppearance({ ...appearance, slot: { ...appearance.slot, layout: 'invalid' } }), undefined);
const sanitizedAppearance = normalizeCardAppearance({ ...appearance, slot: { ...appearance.slot, ratio: 'invalid', showScore: 'false' }, skin: { ...appearance.skin, bg: 'url(invalid)', text: 'var(--bad)', accent: '#ffffff' } });
assert.equal(sanitizedAppearance.slot.ratio, '3:4');
assert.equal(sanitizedAppearance.slot.showScore, undefined);
assert.match(sanitizedAppearance.skin.bg, /^#[0-9A-F]{6}$/);
assert.ok(skinContrast(sanitizedAppearance.skin.text, sanitizedAppearance.skin.bg) >= 4.5);
const legacyPreferences = normalizePresetPreferences({ presetSlots: PRESET_SLOTS, skins: INITIAL_SKINS, authorName: 'legacy' });
assert.equal(legacyPreferences.defaultPresetId, PRESET_SLOTS[0].id);
assert.equal(normalizeDefaultPresetId('missing'), PRESET_SLOTS[0].id);
assert.equal(normalizePresetPreferences({ ...initialPresetPreferences(), defaultPresetId: PRESET_SLOTS[2].id }).defaultPresetId, PRESET_SLOTS[2].id);
console.log('PASS immutable appearance snapshot, safe layout/ratio/colors, legacy default preset migration');

const { upgradeBundledPresets } = load('src/lib/bundledPresets.ts');
const oldBundled = { ...PRESET_SLOTS[0], skinId: 'paper', showGrain: true };
assert.equal(upgradeBundledPresets([oldBundled])[0].skinId, 'signal');
assert.equal(upgradeBundledPresets([{ ...oldBundled, name: '내가 바꾼 카드' }])[0].skinId, 'paper');
assert.equal(upgradeBundledPresets([{ ...oldBundled, showDecorations: false }])[0].showDecorations, false);
const defaultOrange = normalizeSkinTheme(INITIAL_SKINS.signal);
assert.equal(defaultOrange.text, '#FFFFFF');
assert(skinContrast(defaultOrange.text, defaultOrange.bg) >= 4.5);
const { isGeoPoint, hasLinkedPlace } = load('src/lib/mapLocations.ts');
assert(isGeoPoint({ lat: 0, lng: 0 }));
assert(!isGeoPoint({ lat: 91, lng: 127 }));
assert(!isGeoPoint({ lat: 37.5, lng: Infinity }));
assert(!hasLinkedPlace({ ...createItem('영화', 'CINEMA'), fullAddress: '감독 이름', link: 'https://www.themoviedb.org/movie/1' }));
assert(!hasLinkedPlace({ ...createItem('좌표 없음'), mapX: 48, mapY: 50 }));
console.log('PASS curated default upgrade preserves edited presets; white orange ink remains readable; real coordinates never use legacy percentages');

const { queryGooglePlaces } = load('src/lib/googlePlacesServer.ts');
const actualFetch = globalThis.fetch;
try {
  let requestUrl, requestOptions;
  globalThis.fetch = async (url, options) => { requestUrl = String(url); requestOptions = options; return Response.json({ status: 'OK', candidates: [{ place_id: 'place-test', name: '장소', formatted_address: '서울 성동구', geometry: { location: { lat: 37.54, lng: 127.055 } } }, { place_id: 'no-position' }] }); };
  const googlePlaces = await queryGooglePlaces('장소 서울', 'test-key');
  assert.equal(new URL(requestUrl).pathname, '/maps/api/place/findplacefromtext/json');
  assert.equal(new URL(requestUrl).searchParams.get('fields'), 'place_id,name,formatted_address,geometry');
  assert.equal(googlePlaces.length, 1);
  assert.deepEqual(googlePlaces[0].coordinates, { lat: 37.54, lng: 127.055 });
  globalThis.fetch = async () => Response.json({ status: 'REQUEST_DENIED', error_message: 'You must enable Billing on the Google Cloud Project' });
  await assert.rejects(queryGooglePlaces('장소', 'test-key'), error => error.code === 'billing_required');
  globalThis.fetch = async (url, options) => { requestUrl = String(url); requestOptions = options; return Response.json({ places: [{ id: 'new-test', displayName: { text: '다른 장소' }, formattedAddress: '서울', location: { latitude: 0, longitude: 0 } }] }); };
  assert.deepEqual((await queryGooglePlaces('다른 장소', 'test-key', 'new'))[0].coordinates, { lat: 0, lng: 0 });
  assert.equal(new URL(requestUrl).pathname, '/v1/places:searchText');
  assert(requestOptions.headers['X-Goog-FieldMask'].includes('places.location'));
} finally { globalThis.fetch = actualFetch; }
console.log('PASS Google Places enabled-API selection, minimal fields, geographic response mapping and explicit billing-required handling');

class PreferenceMemory {
  values = new Map();
  read(key) { return structuredClone(this.values.get(key) || null); }
  write(key, value) { this.values.set(key, structuredClone(value)); }
}
const preferenceStorage = new PreferenceMemory();
const remotePreferences = new Map([['owner-a', initialPresetPreferences()], ['owner-b', initialPresetPreferences()]]);
let preferenceOffline = false;
let cookieOwner = 'owner-a';
let preferenceCalls = 0;
const preferenceTransport = async (_url, init) => {
  preferenceCalls++;
  if (preferenceOffline) throw new Error('offline');
  const body = JSON.parse(init.body);
  if (body.expectedDeviceId !== cookieOwner) return Response.json({ error: 'DEVICE_CHANGED' }, { status: 409 });
  remotePreferences.set(cookieOwner, normalizePresetPreferences(body));
  return Response.json(remotePreferences.get(cookieOwner));
};
const presetRepository = new PresetPreferenceRepository(preferenceStorage, preferenceTransport);
presetRepository.start();
presetRepository.applySnapshot({ ...remotePreferences.get('owner-a'), deviceId: 'owner-a' });
presetRepository.update({ defaultPresetId: '02' });
await presetRepository.retrySync();
assert.equal(remotePreferences.get('owner-a').defaultPresetId, '02');
assert.equal(preferenceStorage.read(PRESET_PREFERENCES_KEY).__l2Sync.pending, false);
preferenceOffline = true;
presetRepository.update({ defaultPresetId: '03' });
await presetRepository.retrySync();
assert.equal(preferenceStorage.read(PRESET_PREFERENCES_KEY).__l2Sync.pending, true);
presetRepository.stop();
const pendingPresetRestart = new PresetPreferenceRepository(preferenceStorage, preferenceTransport);
pendingPresetRestart.start();
pendingPresetRestart.applySnapshot({ ...initialPresetPreferences(), deviceId: 'owner-a', fromCache: true });
assert.equal(pendingPresetRestart.getView().defaultPresetId, '03');
assert.equal(pendingPresetRestart.getView().pending, true);
const callsBeforeOwnerConfirmation = preferenceCalls;
await pendingPresetRestart.retrySync();
assert.equal(preferenceCalls, callsBeforeOwnerConfirmation, 'cached owner never authorizes an upload');
preferenceOffline = false;
pendingPresetRestart.applySnapshot({ ...remotePreferences.get('owner-a'), deviceId: 'owner-a' });
await pendingPresetRestart.retrySync();
assert.equal(remotePreferences.get('owner-a').defaultPresetId, '03');
assert.equal(pendingPresetRestart.getView().pending, false);
pendingPresetRestart.stop();
const syncedPresetRestart = new PresetPreferenceRepository(preferenceStorage, preferenceTransport);
syncedPresetRestart.start();
syncedPresetRestart.applySnapshot({ ...initialPresetPreferences(), deviceId: 'owner-a', fromCache: true });
assert.equal(syncedPresetRestart.getView().defaultPresetId, '03', 'stale archive cache cannot overwrite already-synced local preferences');
assert.equal(syncedPresetRestart.getView().pending, false);
syncedPresetRestart.applySnapshot({ ...remotePreferences.get('owner-a'), defaultPresetId: '05', deviceId: 'owner-a' });
assert.equal(syncedPresetRestart.getView().defaultPresetId, '05', 'fresh confirmed server preferences still apply');
preferenceOffline = true;
syncedPresetRestart.update({ defaultPresetId: '02' });
await syncedPresetRestart.retrySync();
syncedPresetRestart.stop();
const switchedOwner = new PresetPreferenceRepository(preferenceStorage, preferenceTransport);
switchedOwner.start();
cookieOwner = 'owner-b';
preferenceOffline = false;
switchedOwner.applySnapshot({ ...remotePreferences.get('owner-b'), deviceId: 'owner-b' });
assert.equal(switchedOwner.getView().defaultPresetId, '01');
assert.equal(switchedOwner.getView().pending, false);
await switchedOwner.retrySync();
assert.equal(remotePreferences.get('owner-b').defaultPresetId, '01');
assert.equal(preferenceStorage.read(`${PRESET_PREFERENCES_KEY}:owner-a`).defaultPresetId, '02');
assert.equal(preferenceStorage.read(`${PRESET_PREFERENCES_KEY}:owner-a`).__l2Sync.pending, true);
cookieOwner = 'owner-a';
switchedOwner.applySnapshot({ ...remotePreferences.get('owner-a'), deviceId: 'owner-a' });
await switchedOwner.retrySync();
assert.equal(remotePreferences.get('owner-a').defaultPresetId, '02');
assert.equal(remotePreferences.get('owner-b').defaultPresetId, '01');
switchedOwner.stop();
console.log('PASS pending and synced preferences survive stale offline cache, fresh owner confirmation, owner-scoped retry and recovery');

assert.equal(parseSkinColor('url(https://example.test/color)'), null);
assert.equal(parseSkinColor('var(--external)'), null);
assert.equal(parseSkinColor('rgb(999, 0, 0)'), null);
assert.equal(parseSkinColor('rgba(1, 2, 3, 2)'), null);
assert.equal(parseSkinColor('#ff00').a, 0, 'four hex digits are valid CSS alpha colors');
assert.equal(parseSkinColor('#xyz'), null);
assert.equal(normalizeSkinTheme({ bg: 'rgb(1, 2, 3)' }).bg, '#010203');
assert.equal(normalizeSkinTheme({ bg: '#000000', accent: '#48FFCC' }).accent, '#48FFCC', 'readable accent hue is preserved');
for (let index = 0; index < 128; index++) {
  const channel = index * 2;
  const normalized = normalizeSkinTheme({
    bg: `rgb(${channel}, ${255 - channel}, ${index})`,
    text: `rgba(${channel}, ${255 - channel}, ${index}, 0.01)`,
    sub: '#8888', headerBg: `rgb(${255 - channel}, ${channel}, 120)`,
    headerText: 'rgba(0, 0, 0, 0.05)', chipBg: 'rgba(255, 255, 255, 0.9)',
    accent: `rgb(${channel}, 150, ${255 - channel})`, border: 'url(invalid)',
  });
  for (const key of ['bg', 'text', 'sub', 'headerBg', 'headerText', 'chipBg', 'accent', 'border']) assert.match(normalized[key], /^#[0-9A-F]{6}$/);
  assert.ok(skinContrast(normalized.text, normalized.bg) >= 4.5);
  assert.ok(skinContrast(normalized.sub, normalized.bg) >= 4.5);
  assert.ok(skinContrast(normalized.headerText, normalized.headerBg) >= 4.5);
  assert.ok(skinContrast(normalized.text, normalized.chipBg) >= 4.5);
  assert.ok(skinContrast(normalized.sub, normalized.chipBg) >= 4.5);
  assert.ok(skinContrast(normalized.accent, normalized.bg) >= 4.5);
  assert.ok(Math.max(skinContrast('#111114', normalized.accent), skinContrast('#FFFFFF', normalized.accent)) >= 4.5);
}
console.log('PASS palette CSS sanitization, alpha compositing, preserved accents, 128 contrast cases');

const storage = new DurableMemory();
const network = server();
const first = new LocalArchiveRepository(storage, network.transport);
await first.start();
network.offline(true);
const saved = await first.save(input);
assert.equal(saved.synced, false);
await waitFor(() => first.getView().pendingCount === 1, 'durable offline save');
assert.equal((await storage.read()).archives.length, 1);
assert.equal(first.getView().status, 'pending');
const restarted = new LocalArchiveRepository(storage, network.transport);
await restarted.start();
assert.equal(restarted.getView().serverSnapshot.fromCache, true);
assert.equal((await storage.read()).serverSnapshot.fromCache, undefined, 'cache freshness is a view-only marker');
assert.equal(restarted.getView().archives[0].quote, input.quote);
assert.equal(restarted.getView().pendingCount, 1);
network.offline(false);
await restarted.retrySync();
assert.notEqual(restarted.getView().serverSnapshot.fromCache, true);
assert.equal(network.rows.size, 1);
assert.equal(restarted.getView().status, 'synced');
console.log('PASS durable offline save, restart hydration, reconnection sync');

network.loseNextResponse();
const secondItem = createItem('응답 유실 뒤 재시도하는 기록');
await restarted.save(secondItem);
await waitFor(() => restarted.getView().error?.includes('response lost'), 'lost response');
assert.equal(network.rows.size, 2);
await restarted.retrySync();
assert.equal(network.rows.size, 2);
assert.equal(restarted.getView().pendingCount, 0);
console.log('PASS response-loss retry remains idempotent');

network.offline(true);
await restarted.remove(secondItem.id);
assert.equal(restarted.getView().archives.some(item => item.id === secondItem.id), false);
const deletedRestart = new LocalArchiveRepository(storage, network.transport);
await deletedRestart.start();
assert.equal(deletedRestart.getView().archives.some(item => item.id === secondItem.id), false);
network.offline(false);
await deletedRestart.retrySync();
assert.equal(network.rows.has(secondItem.id), false);
console.log('PASS durable offline deletion and reconnect tombstone sync');

network.rejectSave(true);
const invalid = createItem('서버가 거절한 기록도 기기에는 보존');
await deletedRestart.save(invalid);
await waitFor(() => deletedRestart.getView().status === 'failed', 'HTTP validation feedback');
assert.equal(deletedRestart.getView().itemStatus[invalid.id], 'failed');
assert.equal((await storage.read()).archives.some(item => item.id === invalid.id), true);
network.rejectSave(false);
const goodAlongsideFailure = createItem('다른 기록이 동기화되어도 실패 안내는 유지');
await deletedRestart.save(goodAlongsideFailure);
await waitFor(() => network.rows.has(goodAlongsideFailure.id), 'success alongside a failed record');
assert.equal(deletedRestart.getView().status, 'failed');
assert.equal(deletedRestart.getView().error, 'invalid test record');
await deletedRestart.retrySync();
assert.equal(deletedRestart.getView().status, 'synced');
console.log('PASS HTTP failure is explicit, durable, and retryable');

let release;
network.hold(new Promise(resolve => { release = resolve; }));
await deletedRestart.save({ ...input, quote: 'first edit', timestamp: 999, date: '99.12.12' }, true);
await new Promise(resolve => setTimeout(resolve, 10));
await deletedRestart.save({ ...input, quote: 'newest edit' }, true);
network.hold(null);
release();
await waitFor(() => deletedRestart.getView().pendingCount === 0, 'concurrent edit settlement');
assert.equal(network.rows.get(input.id).quote, 'newest edit');
assert.equal(deletedRestart.getView().archives.find(item => item.id === input.id).date, input.date);
console.log('PASS edits during an in-flight request preserve the newest revision');

const brokenStorage = { read: async () => null, write: async () => { throw new Error('quota exceeded'); } };
const broken = new LocalArchiveRepository(brokenStorage, network.transport);
await broken.start();
await assert.rejects(broken.save(createItem()), /quota exceeded/);
assert.equal(broken.getView().archives.length, 0);
console.log('PASS failed durable write is never reported as saved');

const otherStorage = new DurableMemory();
const otherNetwork = server();
otherNetwork.offline(true);
const otherRepository = new LocalArchiveRepository(otherStorage, otherNetwork.transport);
await otherRepository.start();
const otherItem = createItem('기타로 남기는 오늘의 순간', 'OTHER');
await otherRepository.save(otherItem);
await otherRepository.save({ ...otherItem, quote: '기타 초안 편집도 그대로 보존' }, true);
assert.equal((await otherStorage.read()).outbox[0].item.cat, 'OTHER');
const otherRestart = new LocalArchiveRepository(otherStorage, otherNetwork.transport);
await otherRestart.start();
assert.equal(otherRestart.getView().archives[0].cat, 'OTHER');
assert.equal(otherRestart.getView().archives[0].quote, '기타 초안 편집도 그대로 보존');
otherNetwork.offline(false);
await otherRestart.retrySync();
assert.equal(otherRestart.getView().status, 'synced');
assert.equal(otherNetwork.rows.get(otherItem.id).cat, 'OTHER');
console.log('PASS OTHER new/edit/outbox/restart/reconnect roundtrip');

const appearanceStorage = new DurableMemory();
const appearanceNetwork = server();
appearanceNetwork.offline(true);
const appearanceRepository = new LocalArchiveRepository(appearanceStorage, appearanceNetwork.transport);
await appearanceRepository.start();
const appearanceItem = { ...createItem('스타일도 함께 보관하는 순간', 'OTHER'), cardAppearance: structuredClone(frozenAppearance) };
await appearanceRepository.save(appearanceItem);
appearanceItem.cardAppearance.slot.layout = 'vinyl';
appearanceItem.cardAppearance.skin.bg = '#FF0000';
assert.deepEqual(appearanceRepository.getView().archives[0].cardAppearance, frozenAppearance);
const appearanceRestart = new LocalArchiveRepository(appearanceStorage, appearanceNetwork.transport);
await appearanceRestart.start();
assert.deepEqual(appearanceRestart.getView().archives[0].cardAppearance, frozenAppearance);
appearanceNetwork.offline(false);
await appearanceRestart.retrySync();
assert.deepEqual(appearanceNetwork.rows.get(appearanceItem.id).cardAppearance, frozenAppearance);
console.log('PASS appearance deep copy, offline outbox, restart and sync preservation');

const testWork = path.join(project, 'work', `backend-test-${Date.now()}`);
fs.mkdirSync(testWork, { recursive: true });
const oldDirectory = process.cwd();
process.chdir(testWork);
try {
  const { fileStore } = load('src/lib/store/fileStore.ts');
  const owner = randomUUID();
  await fileStore.ensureProfile(owner);
  const palette = { id: 'custom-test', name: 'CUSTOM', bg: '#ffffff', text: '#111111', sub: '#444444', border: '#dddddd', accent: '#ff0000', chipBg: '#eeeeee' };
  await fileStore.savePrefs(owner, { skins: { [palette.id]: palette } });
  const profile = await fileStore.getProfile(owner);
  assert.ok(profile.skins.paper);
  assert.ok(profile.skins['custom-test']);
  const remaining = { ...profile.skins };
  delete remaining['custom-test'];
  await fileStore.savePrefs(owner, { skins: remaining, replaceSkins: true });
  assert.equal((await fileStore.getProfile(owner)).skins['custom-test'], undefined);
  await fileStore.saveArchive(owner, input);
  await fileStore.saveArchive(owner, input);
  assert.equal((await fileStore.listArchives(owner)).length, 1);
  assert.ok(fs.existsSync(path.join(testWork, '.test-data', 'l2_users.json')));
  console.log('PASS local file persistence, idempotent UUID, skin merge and explicit removal');

  // Exercise the actual route functions with only the request-local session
  // substituted; storage, validation and response handling remain real.
  let activeDevice = owner;
  modules.set(path.join(project, 'src/lib/session.ts'), { exports: {
    requireDevice: async () => ({ deviceId: activeDevice }),
    readDeviceId: async () => activeDevice,
    writeDeviceId: async id => { activeDevice = id; },
  } });
  const logsApi = load('src/app/api/logs/route.ts');
  const apiOther = createItem('API 기타 새 기록', 'OTHER');
  const posted = await logsApi.POST({ json: async () => apiOther });
  assert.equal(posted.status, 201);
  assert.equal((await posted.json()).item.cat, 'OTHER');
  const patched = await logsApi.PATCH({ json: async () => ({ id: apiOther.id, cat: 'OTHER', quote: 'API 기타 수정', date: '99.01.01', timestamp: 1 }) });
  assert.equal(patched.status, 200);
  const patchData = await patched.json();
  assert.equal(patchData.item.cat, 'OTHER');
  assert.equal(patchData.item.date, apiOther.date);
  assert.equal(patchData.item.timestamp, apiOther.timestamp);
  const reloaded = await logsApi.GET();
  assert.equal((await reloaded.json()).archives.find(item => item.id === apiOther.id).cat, 'OTHER');
  const disk = JSON.parse(fs.readFileSync(path.join(testWork, '.test-data', 'l2_users.json'), 'utf8'));
  assert.equal(disk.archives[apiOther.id].item.cat, 'OTHER');
  const legacy = createItem('기존 장소 분류', 'ART');
  const legacyResponse = await logsApi.POST({ json: async () => legacy });
  assert.equal((await legacyResponse.json()).item.cat, 'ART');
  const badCategory = await logsApi.POST({ json: async () => ({ ...apiOther, id: randomUUID(), cat: 'UNKNOWN' }) });
  assert.equal(badCategory.status, 400);
  const placesApi = load('src/app/api/places/search/route.ts');
  const customSearch = await placesApi.GET({ url: 'http://local/api/places/search?q=unique-category-test-12345&category=OTHER' });
  assert.equal((await customSearch.json()).results[0].category, 'OTHER');
  const badSearch = await placesApi.GET({ url: 'http://local/api/places/search?q=test&category=UNKNOWN' });
  assert.equal(badSearch.status, 400);
  console.log('PASS actual API OTHER create/edit/reload/disk/search, ART compatibility, invalid-category rejection');

  const positioned = { ...createItem('실제 좌표의 장소', 'DINING'), coordinates: { lat: 37.5446, lng: 127.0559 } };
  assert.equal((await logsApi.POST({ json: async () => positioned })).status, 201);
  const positionedEdit = await logsApi.PATCH({ json: async () => ({ id: positioned.id, quote: '좌표를 유지하는 내용 수정' }) });
  assert.deepEqual((await positionedEdit.json()).item.coordinates, positioned.coordinates);
  assert.deepEqual((await (await logsApi.GET()).json()).archives.find(item => item.id === positioned.id).coordinates, positioned.coordinates);
  assert.equal((await logsApi.PATCH({ json: async () => ({ id: positioned.id, coordinates: { lat: 120, lng: 0 } }) })).status, 400);
  const geoNetwork = server(); geoNetwork.offline(true);
  const geoStorage = new DurableMemory(), geoRepository = new LocalArchiveRepository(geoStorage, geoNetwork.transport);
  await geoRepository.start(); await geoRepository.save(positioned, false);
  const geoRestart = new LocalArchiveRepository(geoStorage, geoNetwork.transport); await geoRestart.start();
  assert.deepEqual(geoRestart.getView().archives[0].coordinates, positioned.coordinates);
  geoNetwork.offline(false); await geoRestart.retrySync();
  assert.deepEqual(geoNetwork.rows.get(positioned.id).coordinates, positioned.coordinates);
  const resolveApi = load('src/app/api/places/resolve/route.ts');
  assert.deepEqual((await (await resolveApi.POST({ json: async () => ({ id: positioned.id }) })).json()).coordinates, positioned.coordinates);
  assert.equal((await resolveApi.POST({ json: async () => ({ id: randomUUID() }) })).status, 404);
  const clearedPosition = await logsApi.PATCH({ json: async () => ({ id: positioned.id, coordinates: null }) });
  assert.equal((await clearedPosition.json()).item.coordinates, undefined, 'removing a place must clear its old map position');
  console.log('PASS geographic coordinates: API create/edit/disk, offline restart/sync, invalid input rejection and owned-record resolver');

  const { getGroupMembers } = load('src/lib/logGroups.ts');
  const group = normalizeLogInput({ ...createItem('연남동 맛집 리스트 3', 'OTHER'), cat: 'GROUP', kind: 'group', memberIds: [apiOther.id, legacy.id, apiOther.id] });
  assert.equal(group.kind, 'group');
  assert.deepEqual(group.memberIds, [apiOther.id, legacy.id]);
  assert.equal(isStoredDraft({ title: '그룹', body: '', category: 'GROUP', score: null, img: '', cropX: 50, cropY: 50, place: null, good: '', bad: '', note: '' }), false);
  assert.throws(() => normalizeLogInput({ ...group, memberIds: [] }));
  assert.throws(() => normalizeLogInput({ ...group, memberIds: [group.id] }));
  assert.throws(() => normalizeLogInput({ ...group, memberIds: Array.from({ length: 21 }, () => randomUUID()) }));
  assert.throws(() => normalizeLogInput({ ...apiOther, memberIds: [legacy.id] }));
  const groupPost = await logsApi.POST({ json: async () => group });
  assert.equal(groupPost.status, 201);
  const groupSaved = (await groupPost.json()).item;
  assert.deepEqual(getGroupMembers(groupSaved, [apiOther, legacy, groupSaved]).map(item => item.id), [apiOther.id, legacy.id]);
  assert.deepEqual(JSON.parse(fs.readFileSync(path.join(testWork, '.test-data', 'l2_users.json'), 'utf8')).archives[group.id].item.memberIds, group.memberIds);
  const missingGroup = await logsApi.POST({ json: async () => ({ ...group, id: randomUUID(), memberIds: [randomUUID()] }) });
  assert.equal(missingGroup.status, 400);
  const nestedGroup = await logsApi.POST({ json: async () => ({ ...group, id: randomUUID(), memberIds: [group.id] }) });
  assert.equal(nestedGroup.status, 400);
  const anotherOwner = randomUUID();
  const foreignLog = createItem('다른 사람의 로그', 'OTHER');
  await fileStore.saveArchive(anotherOwner, foreignLog);
  const foreignGroup = await logsApi.POST({ json: async () => ({ ...group, id: randomUUID(), memberIds: [foreignLog.id] }) });
  assert.equal(foreignGroup.status, 400);
  const groupEdit = await logsApi.PATCH({ json: async () => ({ id: group.id, title: '수정한 모음', memberIds: [legacy.id] }) });
  assert.equal(groupEdit.status, 200);
  assert.equal((await groupEdit.json()).item.timestamp, group.timestamp);
  await logsApi.DELETE({ nextUrl: new URL(`http://local/api/logs?id=${group.id}`) });
  const afterGroupDelete = (await (await logsApi.GET()).json()).archives;
  assert(afterGroupDelete.some(item => item.id === apiOther.id));
  assert(afterGroupDelete.some(item => item.id === legacy.id));
  assert(!afterGroupDelete.some(item => item.id === group.id));
  const groupOfflineNetwork = server(); groupOfflineNetwork.offline(true);
  const groupDurable = new DurableMemory();
  const groupOffline = new LocalArchiveRepository(groupDurable, groupOfflineNetwork.transport);
  await groupOffline.start(); await groupOffline.save(groupSaved, false);
  const groupRestart = new LocalArchiveRepository(groupDurable, groupOfflineNetwork.transport);
  await groupRestart.start();
  assert.deepEqual(groupRestart.getView().archives[0].memberIds, group.memberIds);
  groupOfflineNetwork.offline(false); await groupRestart.retrySync();
  assert.deepEqual(groupOfflineNetwork.rows.get(group.id).memberIds, group.memberIds);
  console.log('PASS groups: durable restart/sync, membership ownership, nested/empty/oversized rejection, disk persistence, edit date and non-cascading delete');

  const prefsApi = load('src/app/api/presets/route.ts');
  const sessionApi = load('src/app/api/session/route.ts');
  const twentyPresets = Array.from({ length: 20 }, (_, index) => ({ ...PRESET_SLOTS[0], id: `limit-${index}`, name: `프리셋 ${index}` }));
  assert.equal((await prefsApi.POST({ json: async () => ({ presetSlots: twentyPresets }) })).status, 200);
  assert.equal((await prefsApi.POST({ json: async () => ({ presetSlots: [...twentyPresets, { ...PRESET_SLOTS[1], id: 'overflow' }] }) })).status, 400);
  assert.equal((await prefsApi.POST({ json: async () => ({ presetSlots: [twentyPresets[0], twentyPresets[0]] }) })).status, 400);
  await prefsApi.POST({ json: async () => ({ presetSlots: PRESET_SLOTS }) });
  const quotaRepository = new PresetPreferenceRepository({ read: () => null, write: () => { throw new Error('quota'); } }, preferenceTransport);
  quotaRepository.start();
  assert.throws(() => quotaRepository.update({ authorName: '저장되면 안 됨' }));
  assert.notEqual(quotaRepository.getView().authorName, '저장되면 안 됨');
  quotaRepository.stop();
  console.log('PASS preset 20-slot limit, duplicate rejection and honest local-write failure');
  const defaultId = PRESET_SLOTS[2].id;
  const preferenceResponse = await prefsApi.POST({ json: async () => ({ defaultPresetId: defaultId }) });
  assert.equal(preferenceResponse.status, 200);
  assert.equal((await preferenceResponse.json()).defaultPresetId, defaultId);
  assert.equal((await (await prefsApi.GET()).json()).defaultPresetId, defaultId);
  assert.equal((await (await sessionApi.GET()).json()).defaultPresetId, defaultId);
  assert.equal((await (await logsApi.GET()).json()).defaultPresetId, defaultId);
  const ownerMismatch = await prefsApi.POST({ json: async () => ({ defaultPresetId: '04', expectedDeviceId: randomUUID() }) });
  assert.equal(ownerMismatch.status, 409);
  assert.equal((await (await prefsApi.GET()).json()).defaultPresetId, defaultId, 'a stale owner cannot overwrite the recovered profile');

  const styledItem = { ...createItem('시점의 스타일을 고정', 'OTHER'), cardAppearance: structuredClone(frozenAppearance) };
  const styledPost = await logsApi.POST({ json: async () => styledItem });
  assert.equal(styledPost.status, 201);
  const styledSaved = (await styledPost.json()).item;
  assert.deepEqual(styledSaved.cardAppearance, frozenAppearance);
  const changedSlots = PRESET_SLOTS.map(slot => ({ ...slot, layout: 'vinyl', skinId: 'paper' }));
  await prefsApi.POST({ json: async () => ({ presetSlots: changedSlots, skins: { ...INITIAL_SKINS, paper: { ...INITIAL_SKINS.paper, bg: '#000000' } }, authorName: '바뀐 이름', defaultPresetId: PRESET_SLOTS[3].id, replaceSkins: true }) });
  const editedStyle = await logsApi.PATCH({ json: async () => ({ id: styledSaved.id, quote: '내용만 수정하고 디자인 유지' }) });
  assert.equal(editedStyle.status, 200);
  assert.deepEqual((await editedStyle.json()).item.cardAppearance, frozenAppearance, 'content edits and changed global presets do not restyle saved records');
  const styledGet = (await (await logsApi.GET()).json()).archives.find(item => item.id === styledSaved.id);
  assert.deepEqual(styledGet.cardAppearance, frozenAppearance);
  const malformedStyle = await logsApi.PATCH({ json: async () => ({ id: styledSaved.id, cardAppearance: { ...frozenAppearance, slot: { ...frozenAppearance.slot, layout: 'missing' } } }) });
  assert.equal(malformedStyle.status, 400);
  const styleDisk = JSON.parse(fs.readFileSync(path.join(testWork, '.test-data', 'l2_users.json'), 'utf8'));
  assert.deepEqual(styleDisk.archives[styledSaved.id].item.cardAppearance, frozenAppearance);
  const oldDevice = randomUUID();
  const oldProfile = await fileStore.ensureProfile(oldDevice);
  const legacyDisk = JSON.parse(fs.readFileSync(path.join(testWork, '.test-data', 'l2_users.json'), 'utf8'));
  delete legacyDisk.profiles[oldDevice].defaultPresetId;
  fs.writeFileSync(path.join(testWork, '.test-data', 'l2_users.json'), JSON.stringify(legacyDisk));
  assert.equal((await fileStore.getProfile(oldDevice)).defaultPresetId, PRESET_SLOTS[0].id);
  const legacyRestore = await sessionApi.POST({ json: async () => ({ recoveryCode: oldProfile.recoveryCode }) });
  assert.equal((await legacyRestore.json()).defaultPresetId, PRESET_SLOTS[0].id);
  const originalProfile = await fileStore.getProfile(owner);
  const restoredStyle = await sessionApi.POST({ json: async () => ({ recoveryCode: originalProfile.recoveryCode }) });
  const restoredStyleData = await restoredStyle.json();
  assert.equal(restoredStyleData.defaultPresetId, PRESET_SLOTS[3].id);
  assert.deepEqual(restoredStyleData.archives.find(item => item.id === styledSaved.id).cardAppearance, frozenAppearance);
  console.log('PASS default preset API/session/restore persistence, legacy fallback, immutable record style on disk and content edits');
} finally { process.chdir(oldDirectory); }
const resetNetwork = server(), resetStorage = new DurableMemory(), resetRepository = new LocalArchiveRepository(resetStorage, resetNetwork.transport);
await resetRepository.start();
let releaseResetWrite;
resetNetwork.hold(new Promise(resolve => { releaseResetWrite = resolve; }));
await resetRepository.save(createItem('초기화와 동시에 저장 중인 로그'));
await waitFor(() => resetNetwork.calls.some(call => call.method === 'POST'), 'write dispatched');
const resetTask = resetRepository.resetAllLogs();
await new Promise(resolve => setTimeout(resolve, 10));
assert.equal(resetNetwork.calls.some(call => call.url === '/api/logs/reset'), false, 'wait for dispatched write before reset');
await assert.rejects(() => resetRepository.save(createItem('초기화 중 저장 차단')), /초기화 중/);
releaseResetWrite(); await resetTask;
assert.equal(resetNetwork.rows.size, 0); assert.equal(resetRepository.getView().archives.length, 0); assert.equal(resetRepository.getView().pendingCount, 0);
const resetRestart = new LocalArchiveRepository(resetStorage, resetNetwork.transport); await resetRestart.start();
assert.equal(resetRestart.getView().archives.length, 0, 'restart cannot restore deleted outbox');
resetNetwork.hold(null); await resetRestart.save(createItem('네트워크 실패 시 유지'));
await waitFor(() => resetRestart.getView().pendingCount === 0, 'fixture synced');
resetNetwork.offline(true); await assert.rejects(() => resetRestart.resetAllLogs()); assert.equal(resetRestart.getView().archives.length, 1);
console.log('PASS reset drains in-flight writes, blocks new writes, clears owner cache/outbox, and preserves data on network failure');
console.log('All repository/backend tests passed.');
