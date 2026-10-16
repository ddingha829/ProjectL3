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
  await sleep(600);

  // Navigate to STUDIO
  await page.evaluate(() => {
    const tabs = Array.from(document.querySelectorAll('button'));
    const studioTab = tabs.find((b) => b.textContent && b.textContent.includes('STUDIO'));
    if (studioTab) studioTab.click();
  });
  await sleep(500);

  // Type a prompt into the AI prompt input
  const promptInput = await page.$('input[placeholder*="무드"]');
  if (promptInput) {
    await promptInput.click();
    await page.keyboard.type('JEJU CITRUS SUNSET', { delay: 10 });
  }

  // Click AI SKIN button
  await page.evaluate(() => {
    const aiBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent && b.textContent.includes('AI SKIN')
    );
    if (aiBtn) aiBtn.click();
  });
  console.log('Clicked AI SKIN generate, waiting for skin button to appear...');

  // Wait for the delete button (✕) to appear in the DOM
  await page.waitForFunction(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    return btns.some((b) => b.textContent && b.textContent.trim() === '✕');
  }, { timeout: 15000 });
  await sleep(800);

  // Capture screenshot of AI skin pill with ✕ button
  const capWithDelete = `${artifactDir}/33_ai_skin_generated_with_x_delete.png`;
  await page.screenshot({ path: capWithDelete });
  console.log('Saved:', capWithDelete);

  // Click the ✕ delete button
  console.log('Clicking ✕ delete button on AI skin...');
  await page.evaluate(() => {
    const deleteBtn = Array.from(document.querySelectorAll('button')).find(
      (b) => b.textContent && b.textContent.trim() === '✕'
    );
    if (deleteBtn) deleteBtn.click();
  });
  await sleep(800);

  // Capture screenshot after deletion
  const capAfterDelete = `${artifactDir}/34_ai_skin_deleted_success.png`;
  await page.screenshot({ path: capAfterDelete });
  console.log('Saved:', capAfterDelete);

  await browser.close();
  console.log('Delete test finished successfully!');
}

main().catch((err) => {
  console.error('Error during test:', err);
  process.exit(1);
});
