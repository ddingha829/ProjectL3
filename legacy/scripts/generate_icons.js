const fs = require('fs');
const path = require('path');
const http = require('http');

// SVG template for the icon
function renderSvg(size) {
  const fontSize = Math.round(size * 0.44);
  const dotRadius = Math.round(size * 0.048);
  const dotCx = Math.round(size * 0.74);
  const dotCy = Math.round(size * 0.62);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" rx="${Math.round(size * 0.22)}" fill="#08080A" />
    <!-- Subtle architectural inner border -->
    <rect x="${Math.round(size * 0.02)}" y="${Math.round(size * 0.02)}" width="${Math.round(size * 0.96)}" height="${Math.round(size * 0.96)}" rx="${Math.round(size * 0.20)}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="${Math.max(1, Math.round(size * 0.008))}" />
    <g transform="translate(${Math.round(size * 0.28)}, ${Math.round(size * 0.64)})">
      <text font-family="-apple-system, BlinkMacSystemFont, 'Inter', 'Pretendard', sans-serif" font-weight="900" font-size="${fontSize}" fill="#F5F4F0" letter-spacing="-0.06em">L2</text>
    </g>
    <!-- Vermilion Accent Dot -->
    <circle cx="${dotCx}" cy="${dotCy}" r="${dotRadius}" fill="#FF3B1D" />
  </svg>`;
}

async function main() {
  const iconsDir = path.join(process.cwd(), 'public', 'icons');
  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

  // Save SVGs
  fs.writeFileSync(path.join(iconsDir, 'icon-192.svg'), renderSvg(192));
  fs.writeFileSync(path.join(iconsDir, 'icon-512.svg'), renderSvg(512));
  fs.writeFileSync(path.join(iconsDir, 'apple-touch-icon.svg'), renderSvg(180));
  fs.writeFileSync(path.join(process.cwd(), 'public', 'icon.svg'), renderSvg(512));

  // Render PNGs via puppeteer-core (Chrome on Windows)
  const puppeteer = require('puppeteer-core');
  const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

  if (fs.existsSync(chromePath)) {
    const browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: 'new',
      args: ['--no-sandbox'],
    });

    for (const size of [180, 192, 512]) {
      const page = await browser.newPage();
      await page.setViewport({ width: size, height: size });
      const svg = renderSvg(size);
      await page.setContent(`<!DOCTYPE html><html><body style="margin:0;overflow:hidden;background:transparent">${svg}</body></html>`);
      const filename = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
      await page.screenshot({
        path: path.join(iconsDir, filename),
        omitBackground: true,
      });
      console.log('Generated', filename);
    }
    await browser.close();
  } else {
    console.log('Chrome not found at standard path, saved SVGs');
  }
}

main().catch(console.error);
