const BASE = 'http://localhost:3000';

function extractCookie(res) {
  const raw = res.headers.get('set-cookie');
  if (!raw) return null;
  const match = raw.match(/l2_device=([^;]+)/);
  return match ? `l2_device=${match[1]}` : null;
}

async function run() {
  console.log('--- 1. Initialize Device Session ---');
  const sessRes = await fetch(`${BASE}/api/session`);
  const cookie = extractCookie(sessRes);
  if (!cookie) throw new Error('No cookie received');

  console.log('--- 2. Create Single Log ---');
  const postRes = await fetch(`${BASE}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      title: '테스트 카페',
      cat: 'COFFEE',
      quote: '감각적인 브루잉 커피 한 잔의 여유',
      loc: 'SEOUL',
    }),
  });
  const created = await postRes.json();
  const itemId = created.item?.id;
  console.log('Created item real UUID:', itemId);
  if (!itemId || !/^[0-9a-f-]{36}$/.test(itemId)) {
    throw new Error('Item ID is not a valid 36-char UUID: ' + itemId);
  }

  console.log('--- 3. Edit / Patch Log Crop ---');
  const patchRes = await fetch(`${BASE}/api/logs`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({
      id: itemId,
      cropX: 65,
      cropY: 35,
    }),
  });
  const patched = await patchRes.json();
  console.log('Patched item cropX:', patched.item?.cropX);
  if (patched.item?.cropX !== 65) {
    throw new Error('Patch failed to update cropX');
  }

  console.log('--- 4. Delete the Last Log (Returns cleanly to Empty State) ---');
  const delRes = await fetch(`${BASE}/api/logs?id=${encodeURIComponent(itemId)}`, {
    method: 'DELETE',
    headers: { Cookie: cookie },
  });
  const delData = await delRes.json();
  console.log('Remaining archives after delete:', delData.archives?.length);
  if (delData.archives?.length !== 0) {
    throw new Error('Expected 0 archives remaining after delete');
  }

  console.log('\n✓ CRUD & Empty State transition verified successfully!\n');
}

run().catch((e) => {
  console.error('❌ Failed:', e);
  process.exit(1);
});
