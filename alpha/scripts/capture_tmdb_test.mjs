import puppeteer from 'puppeteer-core';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 950, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 600));

  // 1. Select CINEMA category pill
  const buttons = await page.$$('button');
  for (const btn of buttons) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text === 'CINEMA') {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 400));

  // 2. Click the place search input and type "헤어질 결심"
  const inputs = await page.$$('input');
  for (const input of inputs) {
    const placeholder = await page.evaluate((el) => el.placeholder, input);
    if (placeholder && placeholder.includes('검색')) {
      await input.click({ clickCount: 3 });
      await input.type('헤어질 결심');
      break;
    }
  }

  // Wait for TMDB debounced search
  await new Promise((r) => setTimeout(r, 900));

  // 3. Open dropdown if needed or click first TMDB result
  const dropdownButtons = await page.$$('button');
  for (const btn of dropdownButtons) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.includes('헤어질 결심') || text.includes('🎬')) {
      await btn.click();
      console.log('Clicked TMDB movie item:', text);
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 600));

  // 4. Capture screenshot showing TMDB movie poster auto-loaded and metadata filled
  const outPath =
    'C:/Users/User/.gemini/antigravity/brain/d0030e2a-c8fa-4df4-9d6a-a2087fe0aaf0/captures/23_tmdb_integration_verified.png';
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Saved capture to:', outPath);

  await browser.close();
}

main().catch(console.error);
