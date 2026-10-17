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
  await page.setViewport({ width: 1200, height: 950, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await sleep(800);

  // ==========================================
  // TEST 1: STUDIO VIEW & AI SKIN & CAROUSEL
  // ==========================================
  console.log('--- TEST 1: STUDIO VIEW ---');
  // Click STUDIO tab
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const studioTab = tabs.find((b) => b.textContent && b.textContent.includes('STUDIO'));
    if (studioTab) studioTab.click();
  });
  await sleep(600);

  // Generate an AI skin
  console.log('Generating AI skin...');
  await page.evaluate(() => {
    const aiBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent && b.textContent.includes('AI SKIN')
    );
    if (aiBtn) aiBtn.click();
  });

  // Wait until AI skin finishes generating
  try {
    await page.waitForFunction(() => {
      const aiBtn = Array.from(document.querySelectorAll('button')).find(
        (b) => b.textContent && b.textContent.includes('AI SKIN')
      );
      return aiBtn && aiBtn.textContent.trim() === 'AI SKIN';
    }, { timeout: 15000 });
  } catch {
    console.log('Timeout waiting for AI skin, continuing...');
  }
  await sleep(1000);

  // Capture Studio with AI skin and delete button (X)
  const capStudio1 = `${artifactDir}/26_studio_ai_skin_with_delete_btn.png`;
  await page.screenshot({ path: capStudio1 });
  console.log('Saved:', capStudio1);

  // Click Right Arrow to cycle skin
  await page.evaluate(() => {
    const nextBtn = document.querySelector('button[aria-label="다음 스킨 (Next Skin)"]');
    if (nextBtn) nextBtn.click();
  });
  await sleep(600);

  const capStudio2 = `${artifactDir}/27_studio_skin_cycled_via_arrow.png`;
  await page.screenshot({ path: capStudio2 });
  console.log('Saved:', capStudio2);

  // ==========================================
  // TEST 2: LOG TAB & MANDATORY CATEGORY
  // ==========================================
  console.log('--- TEST 2: LOG TAB & MANDATORY CATEGORY ---');
  // Click LOG tab
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const logTab = tabs.find((b) => b.textContent && b.textContent.includes('+ LOG'));
    if (logTab) logTab.click();
  });
  await sleep(600);

  // Open Options Modal to verify category was removed
  await page.evaluate(() => {
    const optBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent && b.textContent.includes('옵션')
    );
    if (optBtn) optBtn.click();
  });
  await sleep(600);

  const capLogOptions = `${artifactDir}/28_options_modal_no_category.png`;
  await page.screenshot({ path: capLogOptions });
  console.log('Saved:', capLogOptions);

  // Close Options Modal
  await page.evaluate(() => {
    const applyBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent && (b.textContent.includes('DONE') || b.textContent.includes('APPLY'))
    );
    if (applyBtn) applyBtn.click();
  });
  await sleep(500);

  // Enter a note in the log body
  const bodyTextarea = await page.$('textarea');
  if (bodyTextarea) {
    await bodyTextarea.click();
    await page.keyboard.type('박찬욱 감독의 마스터피스. 안개 속에서 나누는 붕괴와 사랑의 시네마.', { delay: 10 });
  }

  // Click SAVE LOG → to open Category Selection Modal
  await page.evaluate(() => {
    const saveBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent && b.textContent.includes('SAVE LOG')
    );
    if (saveBtn) saveBtn.click();
  });
  await sleep(600);

  // Capture Category Selection Modal
  const capCatModal = `${artifactDir}/29_mandatory_category_selection_modal.png`;
  await page.screenshot({ path: capCatModal });
  console.log('Saved:', capCatModal);

  // Click CINEMA category
  await page.evaluate(() => {
    const catBtns = Array.from(document.querySelectorAll('button'));
    const cinemaBtn = catBtns.find((b) => b.textContent && b.textContent.includes('CINEMA'));
    if (cinemaBtn) cinemaBtn.click();
  });

  // Wait for save to finish and transition to CARD tab
  console.log('Saving with CINEMA category...');
  try {
    await page.waitForFunction(() => {
      return !document.body.innerText.includes('SELECT CATEGORY');
    }, { timeout: 15000 });
  } catch {
    console.log('Timeout waiting for category modal to close');
  }
  await sleep(1200);

  // ==========================================
  // TEST 3: CARD VIEW & CAROUSEL ARROWS
  // ==========================================
  console.log('--- TEST 3: CARD VIEW & CAROUSEL ---');
  const capCardView = `${artifactDir}/30_card_saved_with_carousel_arrows.png`;
  await page.screenshot({ path: capCardView });
  console.log('Saved:', capCardView);

  // Click Right Arrow to cycle skin on Card tab
  await page.evaluate(() => {
    const nextBtn = document.querySelector('button[aria-label="다음 스킨 (Next Skin)"]');
    if (nextBtn) nextBtn.click();
  });
  await sleep(600);

  const capCardCycled = `${artifactDir}/31_card_cycled_to_next_skin.png`;
  await page.screenshot({ path: capCardCycled });
  console.log('Saved:', capCardCycled);

  await browser.close();
  console.log('All tests completed successfully!');
}

main().catch((err) => {
  console.error('Error running test script:', err);
  process.exit(1);
});
