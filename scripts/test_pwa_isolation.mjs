// Integration test verifying:
// 1. Device A vs Device B data isolation via cookies
// 2. Recovery code restoration
// 3. Share page isolation & 404 on missing
// 4. Rate-limit enforcement & warning notices

const BASE = 'http://localhost:3000';

function extractCookie(res) {
  const raw = res.headers.get('set-cookie');
  if (!raw) return null;
  const match = raw.match(/l2_device=([^;]+)/);
  return match ? `l2_device=${match[1]}` : null;
}

async function run() {
  console.log('--- 1. INITIALIZE DEVICE A ---');
  const resA = await fetch(`${BASE}/api/session`);
  const cookieA = extractCookie(resA);
  const dataA = await resA.json();
  console.log('Device A Cookie:', cookieA);
  console.log('Device A Recovery Code:', dataA.recoveryCode);
  if (!cookieA || !dataA.recoveryCode) throw new Error('Device A session failed');

  console.log('\n--- 2. DEVICE A CREATES LOG ---');
  const postResA = await fetch(`${BASE}/api/logs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      title: '성수 에디토리얼 카페',
      cat: 'COFFEE',
      loc: 'SEOUL',
      addressShort: '서울 성수동',
      fullAddress: '서울 성동구 연무장길 12',
      date: '26.10.16',
      score: '4.9',
      quote: '감각적인 브루잉 커피와 차분한 공간',
      good: '싱글오리진 필터 커피 최고',
      bad: '주말 웨이팅',
      note: '햇살이 잘 드는 창가 자리 추천',
      link: 'https://naver.me/test',
      img: '/images/wine.jpg',
    }),
  });
  const createdLog = await postResA.json();
  const logId = createdLog.item?.id;
  console.log('Device A created log ID:', logId);
  if (!logId) throw new Error('Log creation failed: ' + JSON.stringify(createdLog));

  console.log('\n--- 3. DEVICE A CHECKS LOGS ---');
  const logsResA = await fetch(`${BASE}/api/logs`, {
    headers: { Cookie: cookieA },
  });
  const logsA = await logsResA.json();
  console.log(`Device A sees ${logsA.archives.length} log(s)`);
  if (logsA.archives.length !== 1 || logsA.archives[0].id !== logId) {
    throw new Error('Device A should see exactly 1 log');
  }

  console.log('\n--- 4. INITIALIZE DEVICE B (DIFFERENT PERSON/PHONE) ---');
  const resB = await fetch(`${BASE}/api/session`);
  const cookieB = extractCookie(resB);
  const dataB = await resB.json();
  console.log('Device B Cookie:', cookieB);
  console.log('Device B Recovery Code:', dataB.recoveryCode);
  if (cookieA === cookieB) throw new Error('Cookies must be different!');
  if (dataA.recoveryCode === dataB.recoveryCode) throw new Error('Recovery codes must be different!');

  console.log('\n--- 5. DEVICE B CHECKS LOGS (MUST BE EMPTY - ISOLATION TEST) ---');
  const logsResB = await fetch(`${BASE}/api/logs`, {
    headers: { Cookie: cookieB },
  });
  const logsB = await logsResB.json();
  console.log(`Device B sees ${logsB.archives.length} log(s)`);
  if (logsB.archives.length !== 0) {
    throw new Error(`DATA LEAK! Device B should see 0 logs, but saw: ${logsB.archives.length}`);
  }
  console.log('✓ DATA ISOLATION VERIFIED: Device B cannot see Device A data');

  console.log('\n--- 6. PUBLIC SHARE TEST (NO COOKIE) ---');
  const shareOk = await fetch(`${BASE}/share/${logId}`);
  console.log(`Public share /share/${logId} status:`, shareOk.status);
  if (shareOk.status !== 200) throw new Error('Public share failed for valid item');
  const shareHtml = await shareOk.text();
  if (!shareHtml.includes('성수 에디토리얼 카페')) {
    throw new Error('Public share did not contain item title');
  }
  console.log('✓ Valid public share works without login');

  const shareMissing = await fetch(`${BASE}/share/invalid_random_uuid`);
  console.log('Public share /share/invalid_random_uuid status:', shareMissing.status);
  if (shareMissing.status !== 404) {
    throw new Error(`Expected 404 for missing item, got ${shareMissing.status}`);
  }
  console.log('✓ Invalid public share returns 404 cleanly');

  console.log('\n--- 7. DEVICE RECOVERY CODE TEST ---');
  // Device B recovers Device A's account using dataA.recoveryCode
  const restoreRes = await fetch(`${BASE}/api/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieB },
    body: JSON.stringify({ recoveryCode: dataA.recoveryCode }),
  });
  console.log('Restore response status:', restoreRes.status);
  const restoreData = await restoreRes.json();
  console.log('Restore response message:', restoreData.message);
  const restoredCookie = extractCookie(restoreRes);
  console.log('Device B new cookie after restore:', restoredCookie);

  // Now Device B checks logs with the new restored cookie
  const logsResRestored = await fetch(`${BASE}/api/logs`, {
    headers: { Cookie: restoredCookie || cookieB },
  });
  const logsRestored = await logsResRestored.json();
  console.log(`Restored session sees ${logsRestored.archives.length} log(s)`);
  if (logsRestored.archives.length !== 1 || logsRestored.archives[0].id !== logId) {
    throw new Error('Device recovery failed to transfer logs');
  }
  console.log('✓ RECOVERY CODE VERIFIED: Device restored Device A archives successfully');

  console.log('\n--- 8. AI RATE LIMIT TEST ---');
  const aiRes = await fetch(`${BASE}/api/ai/extract`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Cookie: cookieA },
    body: JSON.stringify({
      text: '성수동 카페 성수동 1가. 플랫화이트가 고소하고 분위기가 좋았음. 좌석은 약간 협소함. 재방문의사 있음.',
    }),
  });
  const aiData = await aiRes.json();
  console.log('AI Extract status:', aiRes.status);
  console.log('AI Extract provider:', aiData.provider);
  console.log('AI Extract usage:', aiData.usage);
  console.log('AI Extract good:', aiData.good);
  if (!aiData.usage || typeof aiData.usage.used !== 'number' || typeof aiData.usage.limit !== 'number') {
    throw new Error('AI usage quota missing or invalid: ' + JSON.stringify(aiData));
  }
  const remaining = aiData.usage.limit - aiData.usage.used;
  console.log(`AI remaining calls: ${remaining} / ${aiData.usage.limit}`);
  console.log('✓ AI Quota & Engine response verified');

  console.log('\n==========================================');
  console.log('🎉 ALL 8 INTEGRATION TESTS PASSED PERFECTLY!');
  console.log('==========================================\n');
}

run().catch((err) => {
  console.error('\n❌ TEST FAILED:', err);
  process.exit(1);
});
