import puppeteer from 'puppeteer-core';

const artifactDir = 'C:/Users/User/.gemini/antigravity/brain/d0030e2a-c8fa-4df4-9d6a-a2087fe0aaf0/captures';

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1240, height: 980, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await sleep(1000);

  // ========================================================
  // STEP 1: TEST + LOG NO-PHOTO MODE TOGGLE
  // ========================================================
  console.log('--- STEP 1: + LOG NO-PHOTO TOGGLE ---');
  // Click + LOG tab if not already on it
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const logTab = tabs.find((b) => b.textContent && b.textContent.includes('+ LOG'));
    if (logTab) logTab.click();
  });
  await sleep(400);

  // Click [✍️ 사진 없음] pill
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const noPhotoBtn = btns.find((b) => b.textContent && b.textContent.includes('사진 없음'));
    if (noPhotoBtn) noPhotoBtn.click();
  });
  await sleep(600);

  // Capture No-Photo mode canvas in + LOG
  const cap1 = `${artifactDir}/40_log_no_photo_mode.png`;
  await page.screenshot({ path: cap1 });
  console.log('Saved 40_log_no_photo_mode:', cap1);

  // Fill in form details for this photo-less log
  await page.evaluate(() => {
    const titleInput = document.querySelector('input[placeholder="제목을 입력하세요"]');
    if (titleInput) {
      // @ts-ignore
      titleInput.value = '성수 무드 앤 바이닐';
      titleInput.dispatchEvent(new Event('input', { bubbles: true }));
    }

    const memoTextarea = document.querySelector('textarea[placeholder="내용을 자유롭게 메모하세요..."]');
    if (memoTextarea) {
      // @ts-ignore
      memoTextarea.value = '음악과 아날로그 사운드의 섬세한 조우. 사진 없이 오직 활자와 감상으로 남기는 첫 번째 아카이브 기록.';
      memoTextarea.dispatchEvent(new Event('input', { bubbles: true }));
    }
  });
  await sleep(500);

  // Click Save button
  await page.evaluate(() => {
    const saveBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent && b.textContent.includes('LOG RECORD')
    );
    if (saveBtn) saveBtn.click();
  });
  await sleep(600);

  // Mandatory Category Modal is open, select CINEMA
  await page.evaluate(() => {
    const catBtns = Array.from(document.querySelectorAll('button'));
    const cinemaBtn = catBtns.find((b) => b.textContent && b.textContent.includes('CINEMA'));
    if (cinemaBtn) cinemaBtn.click();
  });
  await sleep(1500);

  // ========================================================
  // STEP 2: VERIFY CARD TAB AUTO NO-PHOTO LAYOUT (PASSPORT)
  // ========================================================
  console.log('--- STEP 2: VERIFY AUTO NO-PHOTO CARD ---');
  const cap2 = `${artifactDir}/41_card_auto_passport_for_nophoto.png`;
  await page.screenshot({ path: cap2 });
  console.log('Saved 41_card_auto_passport_for_nophoto:', cap2);

  // ========================================================
  // STEP 3: STUDIO TAB & CARD STRUCTURE FILTERS
  // ========================================================
  console.log('--- STEP 3: STUDIO TAB & NO-PHOTO STYLES ---');
  // Click STUDIO tab
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const studioTab = tabs.find((b) => b.textContent && b.textContent.includes('STUDIO'));
    if (studioTab) studioTab.click();
  });
  await sleep(800);

  // Filter to [✍️ 무첨부형 (4)]
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const filterBtn = btns.find((b) => b.textContent && b.textContent.includes('무첨부형'));
    if (filterBtn) filterBtn.click();
  });
  await sleep(500);

  const cap3 = `${artifactDir}/42_studio_no_photo_filter_tabs.png`;
  await page.screenshot({ path: cap3 });
  console.log('Saved 42_studio_no_photo_filter_tabs:', cap3);

  // Select VINYL LP layout
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const vinylBtn = btns.find((b) => b.textContent && b.textContent.includes('VINYL LP'));
    if (vinylBtn) vinylBtn.click();
  });
  await sleep(600);
  const cap4 = `${artifactDir}/43_studio_vinyl_layout.png`;
  await page.screenshot({ path: cap4 });
  console.log('Saved 43_studio_vinyl_layout:', cap4);

  // Select LIBRARY layout
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const libBtn = btns.find((b) => b.textContent && b.textContent.includes('LIBRARY'));
    if (libBtn) libBtn.click();
  });
  await sleep(600);
  const cap5 = `${artifactDir}/44_studio_library_layout.png`;
  await page.screenshot({ path: cap5 });
  console.log('Saved 44_studio_library_layout:', cap5);

  // Select BROADSIDE layout
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const broadBtn = btns.find((b) => b.textContent && b.textContent.includes('BROADSIDE'));
    if (broadBtn) broadBtn.click();
  });
  await sleep(600);
  const cap6 = `${artifactDir}/45_studio_broadside_layout.png`;
  await page.screenshot({ path: cap6 });
  console.log('Saved 45_studio_broadside_layout:', cap6);

  // ========================================================
  // STEP 4: VERIFY PHOTO ARCHETYPES WITH PHOTO ITEM
  // ========================================================
  console.log('--- STEP 4: PHOTO ARCHETYPES ---');
  // Go to ARCHIVE tab and click an item with a photo (e.g. 작은부엌)
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const archiveTab = tabs.find((b) => b.textContent && b.textContent.includes('ARCHIVE'));
    if (archiveTab) archiveTab.click();
  });
  await sleep(600);

  // Find a photo card or click CARD on first item
  await page.evaluate(() => {
    const cardBtns = Array.from(document.querySelectorAll('button, span'));
    const firstCardBtn = cardBtns.find((el) => el.textContent && el.textContent.includes('CARD →'));
    if (firstCardBtn) firstCardBtn.click();
  });
  await sleep(600);

  // Navigate to STUDIO
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const studioTab = tabs.find((b) => b.textContent && b.textContent.includes('STUDIO'));
    if (studioTab) studioTab.click();
  });
  await sleep(600);

  // Filter to [📷 사진형 (7)]
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const photoFilter = btns.find((b) => b.textContent && b.textContent.includes('사진형'));
    if (photoFilter) photoFilter.click();
  });
  await sleep(500);

  // Click RECEIPT
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const receiptBtn = btns.find((b) => b.textContent && b.textContent.includes('RECEIPT'));
    if (receiptBtn) receiptBtn.click();
  });
  await sleep(600);
  const cap7 = `${artifactDir}/46_studio_receipt_layout.png`;
  await page.screenshot({ path: cap7 });
  console.log('Saved 46_studio_receipt_layout:', cap7);

  // Click POLAROID
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const polaroidBtn = btns.find((b) => b.textContent && b.textContent.includes('POLAROID'));
    if (polaroidBtn) polaroidBtn.click();
  });
  await sleep(600);
  const cap8 = `${artifactDir}/47_studio_polaroid_layout.png`;
  await page.screenshot({ path: cap8 });
  console.log('Saved 47_studio_polaroid_layout:', cap8);

  // Click MAGAZINE
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const magBtn = btns.find((b) => b.textContent && b.textContent.includes('MAGAZINE'));
    if (magBtn) magBtn.click();
  });
  await sleep(600);
  const cap9 = `${artifactDir}/48_studio_magazine_layout.png`;
  await page.screenshot({ path: cap9 });
  console.log('Saved 48_studio_magazine_layout:', cap9);

  await browser.close();
  console.log('All verification and live captures successfully completed!');
}

main().catch((err) => {
  console.error('Error running test script:', err);
  process.exit(1);
});
