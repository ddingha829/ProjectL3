import puppeteer from 'puppeteer-core';

async function capture() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1200, height: 950, deviceScaleFactor: 2 });
  await page.goto('http://localhost:3000', { waitUntil: 'networkidle0' });
  await new Promise((r) => setTimeout(r, 800));

  // 1. Capture LOG view (with score slider and haptic touchpoints)
  await page.screenshot({
    path: 'C:/Users/User/.gemini/antigravity/brain/d0030e2a-c8fa-4df4-9d6a-a2087fe0aaf0/captures/21_live_haptics_log.png',
  });

  // 2. Click STUDIO tab
  const studioButtons = await page.$$('button');
  for (const btn of studioButtons) {
    const text = await page.evaluate((el) => el.innerText, btn);
    if (text.includes('STUDIO')) {
      await btn.click();
      break;
    }
  }
  await new Promise((r) => setTimeout(r, 600));

  // Capture STUDIO view showing 35MM GRAIN button & film grain on card
  await page.screenshot({
    path: 'C:/Users/User/.gemini/antigravity/brain/d0030e2a-c8fa-4df4-9d6a-a2087fe0aaf0/captures/22_live_grain_studio.png',
  });

  console.log('Captured 21_live_haptics_log.png and 22_live_grain_studio.png');
  await browser.close();
}

capture().catch(console.error);
