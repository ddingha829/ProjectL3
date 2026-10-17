import puppeteer from 'puppeteer-core';
import path from 'path';

const demoPath = 'file:///C:/Users/User/.gemini/antigravity/brain/d0030e2a-c8fa-4df4-9d6a-a2087fe0aaf0/interactive_features_demo.html';
const outPath = 'C:/Users/User/.gemini/antigravity/brain/d0030e2a-c8fa-4df4-9d6a-a2087fe0aaf0/features_proposals_demo.png';

async function main() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1100, height: 1200, deviceScaleFactor: 2 });
  await page.goto(demoPath, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: outPath, fullPage: true });
  console.log('Saved demo capture:', outPath);
  await browser.close();
}

main().catch(console.error);
