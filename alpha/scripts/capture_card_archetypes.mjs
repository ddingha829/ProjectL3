import puppeteer from 'puppeteer-core';
import path from 'path';

const artifactDir = 'C:/Users/User/.gemini/antigravity/brain/d0030e2a-c8fa-4df4-9d6a-a2087fe0aaf0';
const htmlPath = `file:///${artifactDir.replace(/\\/g, '/')}/card_styles_showcase.html`;

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
  await page.goto(htmlPath, { waitUntil: 'networkidle0' });
  await sleep(600);

  const archetypes = [
    { id: 'receipt', file: '35_archetype_01_receipt.png' },
    { id: 'polaroid', file: '36_archetype_02_polaroid.png' },
    { id: 'magazine', file: '37_archetype_03_monocle.png' },
    { id: 'passport', file: '38_archetype_04_passport.png' },
    { id: 'vinyl', file: '39_archetype_05_vinyl.png' },
  ];

  for (const arch of archetypes) {
    await page.evaluate((id) => {
      // @ts-ignore
      window.switchTab(id);
    }, arch.id);
    await sleep(400);

    const outPath = path.join(artifactDir, 'captures', arch.file);
    await page.screenshot({ path: outPath });
    console.log(`Captured ${arch.id} -> ${outPath}`);
  }

  await browser.close();
  console.log('All 5 archetype captures completed!');
}

main().catch((err) => {
  console.error('Error in capture script:', err);
  process.exit(1);
});
