import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';

const base = process.env.L2_TEST_URL || 'http://localhost:3014';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw new Error('This test only writes to an isolated local server.');
if (process.env.L2_TEST_ALLOW_EXTERNAL !== 'false') throw new Error('Set L2_TEST_ALLOW_EXTERNAL=false for this local-only test.');
const pass = label => console.log(`PASS ${label}`);
async function request(route, cookie, method = 'GET', body) {
  const response = await fetch(`${base}${route}`, { method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  const raw = await response.text();
  let data; try { data = JSON.parse(raw); } catch { data = raw; }
  return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] || cookie };
}
const a = await request('/api/session'), b = await request('/api/session');
assert.equal(a.response.status, 200); assert.equal(b.response.status, 200);
assert.equal(a.data.storeKind, 'file', 'Do not run this test against a connected Supabase store.');
assert.notEqual(a.data.deviceId, b.data.deviceId); assert(a.cookie.includes('=v1.'));
assert.equal(a.data.aiUsage.limit, 20);
const item = { id: randomUUID(), cat: 'OTHER', title: 'LOCAL QA PRIVATE A', quote: 'Private fixture; never sent to the live database', img: '', expectedDeviceId: a.data.deviceId };
const created = await request('/api/logs', a.cookie, 'POST', item); assert.equal(created.response.status, 201);
assert(!(await request('/api/logs', b.cookie)).data.archives.some(row => row.id === item.id));
const forged = await request('/api/logs', `l2_test_device=${a.data.deviceId}`);
assert(!forged.data.archives.some(row => row.id === item.id)); assert.notEqual(forged.data.deviceId, a.data.deviceId);
assert.equal((await request('/api/logs', b.cookie, 'POST', item)).response.status, 409);
assert.equal((await request(`/api/logs?id=${item.id}&expectedDeviceId=${a.data.deviceId}`, b.cookie, 'DELETE')).response.status, 409);
pass('real HTTP routes enforce signed cookies, owner isolation and stale-owner POST/DELETE guards');

const suffix = randomUUID().slice(0, 8);
const loginA = await request('/api/session', a.cookie, 'POST', { username: `qa-a-${suffix}`, password: 'local-test-only-pass' });
assert.equal(loginA.response.status, 200); assert(loginA.data.archives.some(row => row.id === item.id));
const bItem = { ...item, id: randomUUID(), title: 'LOCAL QA PRIVATE B', expectedDeviceId: b.data.deviceId };
assert.equal((await request('/api/logs', b.cookie, 'POST', bItem)).response.status, 201);
const loginB = await request('/api/session', b.cookie, 'POST', { username: `qa-b-${suffix}`, password: 'different-local-pass' });
assert.equal(loginB.response.status, 200);
const switched = await request('/api/session', loginB.cookie, 'POST', { username: `qa-a-${suffix}`, password: 'local-test-only-pass' });
assert.equal(switched.response.status, 200); assert(!switched.data.archives.some(row => row.id === bItem.id));
const invalid = await request('/api/session', loginA.cookie, 'POST', { username: `qa-a-${suffix}`, password: 'wrong-password' });
assert.equal(invalid.response.status, 401); assert.equal(invalid.cookie, loginA.cookie);
const logout = await request('/api/session', loginA.cookie, 'POST', { action: 'logout' });
assert.equal(logout.response.status, 200); assert.notEqual(logout.data.deviceId, loginA.data.deviceId);
const restored = await request('/api/session', logout.cookie, 'POST', { recoveryCode: loginA.data.recoveryCode });
assert.equal(restored.response.status, 200); assert(restored.data.archives.some(row => row.id === item.id));
pass('registration migrates guest logs; account switch, bad password, logout and recovery preserve isolation');

const ownCard = await request(`/share/${item.id}`, restored.cookie);
assert.equal(ownCard.response.status, 200);
for (const cookie of [undefined, loginB.cookie]) {
  const privateCard = await request(`/share/${item.id}`, cookie);
  assert.equal(privateCard.response.status, 404);
  assert(!privateCard.data.includes('LOCAL QA PRIVATE A'));
  assert(!privateCard.data.includes('Private fixture'));
}
pass('private share route and metadata return 404 to guests and other owners without exposing memo/title');

const ai = await request('/api/ai/extract', restored.cookie, 'POST', { title: 'LOCAL QA', quote: '조용한 동네에서 산책했다', loc: '' });
assert.equal(ai.response.status, 200); assert.equal(ai.data.provider, 'LOCAL_NLP'); assert.equal(ai.data.usage.limit, 20);
assert.equal((await request('/api/ai/extract', restored.cookie, 'POST', { quote: 42 })).response.status, 400);
assert.equal((await request('/api/ai/skin', restored.cookie, 'POST', { prompt: [] })).response.status, 400);
assert.equal((await request('/api/places/search?q='+'x'.repeat(301), restored.cookie)).response.status, 400);
pass('AI local fallback and malformed/oversized input guards return predictable responses without paid calls');
await request(`/api/logs?id=${item.id}`, restored.cookie, 'DELETE');
await request(`/api/logs?id=${bItem.id}`, loginB.cookie, 'DELETE');
console.log('All local HTTP checks passed. Run only with L2_TEST_ALLOW_EXTERNAL=false and an isolated L2_DATA_DIRECTORY.');
