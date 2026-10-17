// Explicitly opted-in smoke test. It only operates on its own fresh QA owners.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

if (process.env.L2_ALLOW_PRODUCTION_QA !== '1') throw new Error('Set L2_ALLOW_PRODUCTION_QA=1 explicitly; this creates and removes isolated production QA fixtures.');
const base = 'https://project-l3-nine.vercel.app';
const env = Object.fromEntries(fs.readFileSync('.env.local', 'utf8').split(/\r?\n/).filter(line => line.includes('=') && !line.startsWith('#')).map(line => { const at = line.indexOf('='); return [line.slice(0, at).trim(), line.slice(at + 1).trim()]; }));
assert(env.SUPABASE_SERVICE_ROLE_KEY, 'Server key must be configured locally; never print it.');
const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const owners = new Set(), media = [], checks = [];
const pass = label => { checks.push(label); console.log(`PASS ${label}`); };
async function call(route, cookie, method = 'GET', body) {
  const response = await fetch(base + route, { method, cache: 'no-store', headers: { ...(cookie ? { cookie } : {}), ...(body ? { 'Content-Type': 'application/json' } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  let data = null; try { data = await response.json(); } catch { /* A 404 page is HTML. */ }
  return { response, data, cookie: response.headers.get('set-cookie')?.split(';')[0] || cookie };
}
async function fresh() {
  const session = await call('/api/session');
  assert.equal(session.response.status, 200); assert.equal(session.data.storeKind, 'supabase');
  assert.equal(session.data.isNewDevice, true); assert.equal(session.data.username, null);
  assert(session.cookie.includes('=v1.')); owners.add(session.data.deviceId);
  return session;
}
try {
  const a = await fresh(), b = await fresh(); assert.equal(a.data.aiUsage.limit, 20);
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jWZkAAAAASUVORK5CYII=';
  const draft = { id: randomUUID(), cat: 'OTHER', title: 'QA 자동 점검 · 곧 정리됩니다', quote: 'Synthetic stability check. No user content.', img: png, hasPhoto: true, expectedDeviceId: a.data.deviceId };
  const created = await call('/api/logs', a.cookie, 'POST', draft);
  assert.equal(created.response.status, 201);
  const image = new URL(created.data.item.img), prefix = `/storage/v1/object/public/photos/${a.data.deviceId}/`;
  assert.equal(image.origin, new URL(env.NEXT_PUBLIC_SUPABASE_URL).origin); assert(image.pathname.startsWith(prefix));
  const mediaPath = image.pathname.slice('/storage/v1/object/public/photos/'.length);
  assert(mediaPath.startsWith(`${a.data.deviceId}/`)); media.push(mediaPath);
  assert.equal((await fetch(image, { method: 'HEAD' })).status, 200);
  const edited = await call('/api/logs', a.cookie, 'PATCH', { id: draft.id, quote: 'Edited synthetic fixture', expectedDeviceId: a.data.deviceId });
  assert.equal(edited.response.status, 200); assert.equal(edited.data.item.date, created.data.item.date);
  assert.equal((await call('/api/logs', b.cookie)).data.archives.length, 0);
  assert.equal((await call('/api/logs', b.cookie, 'PATCH', { id: draft.id, quote: 'Must be denied' })).response.status, 404);
  assert.equal((await call('/api/logs', b.cookie, 'POST', draft)).response.status, 409);
  pass('live Supabase create/photo upload/edit and cross-owner access guards');

  const username = `qa-stability-${randomUUID()}`, password = randomUUID() + randomUUID();
  const account = await call('/api/session', a.cookie, 'POST', { username, password });
  assert.equal(account.response.status, 200); assert.equal(account.data.isNewAccount, true);
  owners.add(account.data.deviceId); assert(account.data.archives.some(item => item.id === draft.id));
  const remote = await call('/api/session', b.cookie, 'POST', { username, password });
  assert.equal(remote.response.status, 200); assert.equal(remote.data.deviceId, account.data.deviceId);
  assert(remote.data.archives.some(item => item.id === draft.id));
  const preset = account.data.presetSlots.at(-1);
  const prefs = await call('/api/presets', account.cookie, 'POST', { defaultPresetId: preset.id, authorName: 'QA_AUTOCLEAN', expectedDeviceId: account.data.deviceId });
  assert.equal(prefs.response.status, 200);
  assert.equal((await call('/api/session', remote.cookie)).data.defaultPresetId, preset.id);
  pass('live guest-to-account migration, second-device login and preset synchronization');

  assert.equal((await call(`/share/${draft.id}`)).response.status, 404);
  assert.equal((await call(`/share/${draft.id}`, account.cookie)).response.status, 200);
  const day = new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' });
  const usage = await db.rpc('bump_l2_ai_usage', { p_owner: account.data.deviceId, p_kind: 'qa-stability', p_day: day });
  assert.equal(usage.error, null); assert.equal(Number(usage.data), 1);
  pass('private card pages and server-only usage RPC remain functional after hardening');

  assert.equal((await call(`/api/logs?id=${draft.id}&expectedDeviceId=${account.data.deviceId}`, account.cookie, 'DELETE')).response.status, 200);
  const undo = await call('/api/logs', account.cookie, 'POST', { ...edited.data.item, expectedDeviceId: account.data.deviceId });
  assert.equal(undo.response.status, 201); assert.equal((await fetch(image, { method: 'HEAD' })).status, 200);
  await call(`/api/logs?id=${draft.id}`, account.cookie, 'DELETE');
  assert(!(await call('/api/logs', remote.cookie)).data.archives.some(item => item.id === draft.id));
  pass('live delete/undo retains its photo; deletion syncs to the second device');
} finally {
  // Every owner was obtained from a fresh isolated response or a confirmed new
  // QA registration. Never run an unscoped delete or clean existing accounts.
  for (const objectPath of media) {
    assert(owners.has(objectPath.split('/')[0]));
    const result = await db.storage.from('photos').remove([objectPath]);
    assert.equal(result.error, null, 'QA media cleanup failed');
  }
  for (const id of owners) {
    const result = await db.from('l2_profiles').delete().eq('id', id);
    assert.equal(result.error, null, 'QA owner cleanup failed');
  }
  for (const id of owners) {
    const result = await db.from('l2_profiles').select('id').eq('id', id);
    assert.equal(result.error, null); assert.equal(result.data.length, 0);
  }
  pass('only newly created QA owners, dependent rows and QA media were cleaned up');
  if (process.env.L2_TEST_OUTPUT_DIR) {
    fs.mkdirSync(process.env.L2_TEST_OUTPUT_DIR, { recursive: true });
    fs.writeFileSync(path.join(process.env.L2_TEST_OUTPUT_DIR, 'production-smoke.json'), JSON.stringify({ checks, syntheticOwnersCleaned: owners.size, paidAiCalls: 0 }, null, 2));
  }
}
