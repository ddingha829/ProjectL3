import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';

const root = process.cwd(), require = createRequire(import.meta.url), ts = require('typescript');
function loader(overrides = {}) {
  const modules = new Map();
  function load(file) {
    const full = path.isAbsolute(file) ? file : path.join(root, file);
    if (modules.has(full)) return modules.get(full).exports;
    const module = { exports: {} }; modules.set(full, module);
    const source = ts.transpileModule(fs.readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    new Function('require', 'module', 'exports', source)(name => {
      if (name in overrides) return overrides[name];
      if (name === 'server-only') return {};
      if (name.startsWith('@/') || name.startsWith('.')) {
        const base = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(full), name);
        return load(fs.existsSync(`${base}.ts`) ? `${base}.ts` : path.join(base, 'index.ts'));
      }
      return require(name);
    }, module, module.exports);
    return module.exports;
  }
  return load;
}
const load = loader(), pass = message => console.log(`PASS ${message}`);
const { createSessionToken, verifySessionToken, SESSION_MAX_AGE } = load('src/lib/sessionToken.ts');
const owner = randomUUID(), other = randomUUID(), secret = 'test-only-session-secret-32-characters';
const now = Date.now(), token = createSessionToken(owner, secret, now);
assert.equal(verifySessionToken(token, secret, now), owner);
assert.equal(verifySessionToken(owner, secret, now), null);
assert.equal(verifySessionToken(token.replace(owner, other), secret, now), null);
assert.equal(verifySessionToken(token, `${secret}-other`, now), null);
assert.equal(verifySessionToken(`${token}.extra`, secret, now), null);
assert.equal(verifySessionToken(token, secret, now + (SESSION_MAX_AGE + 1) * 1000), null);
pass('signed session rejects raw UUIDs, forged owner, wrong secret, malformed and expired tokens');

const cookieJar = new Map();
const sessionLoad = loader({
  'next/headers': { cookies: async () => ({ get: key => cookieJar.has(key) ? { value: cookieJar.get(key) } : undefined, set: (key, value, options) => { assert(options.httpOnly); assert.equal(options.sameSite, 'lax'); cookieJar.set(key, value); } }) },
  '@/lib/env': { getRuntimeEnvKey: key => key === 'SESSION_SECRET' ? secret : undefined },
});
const session = sessionLoad('src/lib/session.ts');
cookieJar.set(session.DEVICE_COOKIE, owner);
assert.equal(await session.readDeviceId(), null);
await session.writeDeviceId(owner);
assert.equal(await session.readDeviceId(), owner);
pass('actual session cookie reader/writer signs values and refuses legacy unsigned identities');

const util = load('src/lib/store/util.ts');
const hashed = await util.createPasswordHash('test-password');
assert.notEqual(hashed, await util.createPasswordHash('test-password'));
assert(await util.verifyPasswordHash('tester', 'test-password', hashed));
assert(!await util.verifyPasswordHash('tester', 'wrong-password', hashed));
assert(await util.verifyPasswordHash('tester', 'old-password', util.hashAccountPassword('tester', 'old-password')));
assert(!await util.verifyPasswordHash('tester', 'wrong-password', util.hashAccountPassword('tester', 'old-password')));
pass('salted scrypt verification and backwards-compatible legacy password checks');

const oldDirectory = process.cwd(), temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'l2-stability-'));
process.chdir(temporary);
try {
  const { fileStore } = load('src/lib/store/fileStore.ts');
  const { normalizeLogInput } = load('src/lib/store/logInput.ts');
  const guest = randomUUID();
  const item = normalizeLogInput({ id: randomUUID(), cat: 'OTHER', title: 'Guest log', quote: 'Retain this record', img: '' });
  await fileStore.ensureProfile(guest); await fileStore.saveArchive(guest, item);
  const accountA = await fileStore.loginOrRegister('stability-a', 'pass-a', guest);
  assert.equal((await fileStore.listArchives(accountA.accountId))[0].id, item.id);
  assert.equal((await fileStore.listArchives(guest)).length, 0);
  assert.equal(await fileStore.getAccountUsername(accountA.accountId), 'stability-a');
  await assert.rejects(fileStore.loginOrRegister('stability-a', 'wrong'), /INVALID_PASSWORD/);
  const accountB = await fileStore.loginOrRegister('stability-b', 'pass-b', accountA.accountId);
  assert.equal((await fileStore.listArchives(accountB.accountId)).length, 0);
  assert.equal((await fileStore.listArchives(accountA.accountId))[0].id, item.id);
  pass('guest logs migrate on registration; switching registered accounts does not transfer private logs');

  const filename = path.join(temporary, '.test-data/l2_users.json');
  const db = JSON.parse(fs.readFileSync(filename, 'utf8'));
  const credential = Object.keys(db.usage).find(key => key.startsWith(`${accountA.accountId}:pwd:`));
  delete db.usage[credential];
  db.usage[`${accountA.accountId}:pwd:${util.hashAccountPassword('stability-a', 'pass-a')}:stability-a`] = 1;
  fs.writeFileSync(filename, JSON.stringify(db));
  await fileStore.loginOrRegister('stability-a', 'pass-a');
  const upgraded = JSON.parse(fs.readFileSync(filename, 'utf8'));
  assert(Object.keys(upgraded.usage).some(key => key.startsWith(`${accountA.accountId}:pwd:s1$`)));
  assert.equal((await fileStore.listArchives(accountA.accountId))[0].id, item.id);
  pass('successful legacy login upgrades its password hash without losing profile or logs');

  fs.mkdirSync(`${filename}.tmp`);
  await assert.rejects(fileStore.saveArchive(accountA.accountId, { ...item, title: 'Must fail' }));
  assert.equal((await fileStore.getOwnedArchive(accountA.accountId, item.id)).title, item.title);
  fs.rmdirSync(`${filename}.tmp`);
  fs.writeFileSync(filename, '{corrupt');
  await assert.rejects(fileStore.ensureProfile(randomUUID()), /읽지 못/);
  assert.equal(fs.readFileSync(filename, 'utf8'), '{corrupt');
  pass('failed disk writes reject success; corrupt data is not overwritten by an empty database');
} finally {
  process.chdir(oldDirectory);
  if (path.dirname(path.resolve(temporary)) !== path.resolve(os.tmpdir()) || !path.basename(temporary).startsWith('l2-stability-')) throw new Error('Unsafe test cleanup path');
  fs.rmSync(temporary, { recursive: true, force: true });
}

const { LocalArchiveRepository } = load('src/lib/localArchiveRepository.ts');
class MemoryStorage {
  data = new Map();
  async read(key = 'current') { return structuredClone(this.data.get(key) || null); }
  async write(value, key = 'current') { this.data.set(key, structuredClone(value)); }
}
const item = { id: randomUUID(), title: 'A pending log', timestamp: Date.now(), date: '26.10.18', cat: 'OTHER', quote: '' };
const bItem = { ...item, id: randomUUID(), title: 'B private log' };
let activeOwner = owner, release, posted;
const postStarted = new Promise(resolve => { posted = resolve; });
const gate = new Promise(resolve => { release = resolve; });
const storage = new MemoryStorage();
const repository = new LocalArchiveRepository(storage, async (url, init = {}) => {
  if (url === '/api/session') return Response.json({ deviceId: activeOwner });
  if (init.method === 'POST') { const payload = JSON.parse(init.body); assert.equal(payload.expectedDeviceId, owner); posted(); await gate; return Response.json({ archives: [item] }); }
  return Response.json({ deviceId: activeOwner, archives: activeOwner === other ? [bItem] : [] });
});
await repository.start(); await repository.save(item); await postStarted;
activeOwner = other;
const refresh = repository.refresh();
for (let n = 0; n < 100 && repository.getView().archives[0]?.id !== bItem.id; n++) await new Promise(resolve => setTimeout(resolve, 2));
assert.equal(repository.getView().archives[0]?.id, bItem.id);
release(); await refresh;
assert.deepEqual(repository.getView().archives.map(log => log.id), [bItem.id]);
assert.equal(storage.data.get(`owner:${owner}`).outbox[0].item.id, item.id);
pass('late account-A save response cannot replace account-B records; pending A work stays in its owner cache');

const legacyStorage = new MemoryStorage();
legacyStorage.data.set('current', { ownerId: owner, archives: [item], outbox: [], serverSnapshot: { deviceId: owner, username: 'previous-account', recoveryCode: 'L2-OLD2-CODE' } });
let restoredOwner = false, firstSession = true, logRequests = 0;
const legacyRepository = new LocalArchiveRepository(legacyStorage, async (url, init = {}) => {
  if (url === '/api/session' && init.method === 'POST') { assert.equal(JSON.parse(init.body).recoveryCode,'L2-OLD2-CODE'); restoredOwner = true; return Response.json({success:true}); }
  if (url === '/api/session') { const session = { deviceId: restoredOwner ? owner : other, username: restoredOwner ? 'previous-account' : null, isNewDevice: firstSession }; firstSession = false; return Response.json(session); }
  logRequests++; return Response.json({ deviceId: owner, archives: [item] });
});
await legacyRepository.start();
assert.equal(legacyRepository.getView().archives[0].id, item.id);
assert.equal(legacyRepository.getView().serverSnapshot.requiresReconnect, true);
assert.equal(legacyRepository.getView().serverSnapshot.recoveryCode, 'L2-OLD2-CODE');
assert.equal(legacyRepository.getView().serverSnapshot.username, null);
await legacyRepository.retrySync(); assert.equal(logRequests, 0);
await legacyRepository.prepareForLogin();
assert.equal(restoredOwner,true);
assert.equal(legacyRepository.getView().serverSnapshot.requiresReconnect, undefined);
assert.equal(legacyRepository.getView().archives[0].id, item.id);
pass('legacy cookie upgrade preserves local diary and recovery code until explicit reconnection, including repeated refresh and recovery-proven pre-login reconnection');


const emptyLegacyStorage = new MemoryStorage();
emptyLegacyStorage.data.set('current',{ownerId:owner,archives:[],outbox:[],serverSnapshot:{deviceId:owner,requiresReconnect:true}});
const emptyLegacyRepository=new LocalArchiveRepository(emptyLegacyStorage,async()=>Response.json({deviceId:other,isNewDevice:true,username:null}));
await emptyLegacyRepository.start();await emptyLegacyRepository.prepareForLogin();
pass('empty legacy cache can still log in; no record or ownership proof is silently discarded');

let count = 19;
const quotaStore = { ensureProfile: async () => ({}), getUsage: async () => count, bumpUsage: async () => ++count };
const quotaLoad = loader({ '@/lib/env': { getRuntimeEnvKey: key => key === 'GEMINI_API_KEY' ? 'test-only-key' : undefined } });
const { reserveAiUsage } = quotaLoad('src/lib/aiUsage.ts');
const reservations = await Promise.all(Array.from({ length: 12 }, () => reserveAiUsage(quotaStore, owner)));
assert.equal(reservations.filter(result => result.allowed).length, 1);
assert(reservations.every(result => result.used <= 20));
assert.equal((await reserveAiUsage(quotaStore, owner)).allowed, false);
pass('parallel AI requests at 19/20 permit exactly one generation; exhausted quota cannot call Gemini');

const rows = Array.from({ length: 1201 }, (_, i) => ({ id: randomUUID(), data: { ...item, timestamp: i, title: `Log ${i}` } }));
const pages = [];
const fakeDb = { from: () => ({ select() { return this; }, eq() { return this; }, order() { return this; }, range(start, end) { pages.push([start, end]); return Promise.resolve({ data: rows.slice(start, end + 1), error: null }); } }) };
const dbLoad = loader({
  '@/lib/env': { getRuntimeEnvKey: key => key === 'SUPABASE_URL' ? 'https://fixture.invalid' : key === 'SUPABASE_SERVICE_ROLE_KEY' ? 'test-only-server-key' : undefined },
  '@supabase/supabase-js': { createClient: () => fakeDb },
});
const { supabaseStore } = dbLoad('src/lib/store/supabaseStore.ts');
assert.equal((await supabaseStore.listArchives(owner)).length, 1201);
assert.deepEqual(pages, [[0, 499], [500, 999], [1000, 1499]]);
pass('Supabase archive pagination retains all 1,201 records across three pages');

let restoreExists=true, restoreUpdates=0;
const restoreRemote={...item,num:'01',title:'서버의 최신 수정'};
const restoreDb={from:()=>({
  select(){return this;},eq(){return this;},
  maybeSingle:async()=>({data:restoreExists?{owner_id:owner,id:item.id,data:restoreRemote}:null,error:null}),
  update(){restoreUpdates++;throw new Error('restore must not update');},
  insert:async()=>{restoreExists=true;return {data:null,error:{code:'23505',message:'duplicate ID'}};},
})};
const restoreLoad=loader({
  '@/lib/env':{getRuntimeEnvKey:key=>key==='SUPABASE_URL'?'https://fixture.invalid':key==='SUPABASE_SERVICE_ROLE_KEY'?'test-only-server-key':undefined},
  '@supabase/supabase-js':{createClient:()=>restoreDb},
});
const restoreStore=restoreLoad('src/lib/store/supabaseStore.ts').supabaseStore;
restoreStore.ensureProfile=async()=>({});
assert.equal((await restoreStore.saveArchive(owner,{...item,num:'01',title:'오래된 백업'},true)).title,restoreRemote.title);
restoreExists=false;
assert.equal((await restoreStore.saveArchive(owner,{...item,num:'01',title:'동시 복원'},true)).title,restoreRemote.title);
assert.equal(restoreUpdates,0);
pass('Supabase append-only restore keeps newer records, including a concurrent insert collision');

const previousNodeEnv = process.env.NODE_ENV;
process.env.NODE_ENV = 'production';
try {
  const failingDb = { from: () => ({ select() { return this; }, eq() { return this; }, maybeSingle: async () => ({ data: null, error: { message: 'l2_profiles does not exist' } }) }) };
  const failedLoad = loader({
    '@/lib/env': { getRuntimeEnvKey: key => key === 'SUPABASE_URL' ? 'https://fixture.invalid' : key === 'SUPABASE_SERVICE_ROLE_KEY' ? 'test-only-server-key' : undefined },
    '@supabase/supabase-js': { createClient: () => failingDb },
  });
  await assert.rejects(failedLoad('src/lib/store/supabaseStore.ts').supabaseStore.getProfile(owner), /does not exist/);
  pass('production database failure is explicit instead of silently switching to ephemeral files');
} finally { if (previousNodeEnv === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previousNodeEnv; }
console.log('All stability regression checks passed. No live database writes or paid API calls were made.');
