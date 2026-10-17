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

  // 1. Click "+ 추가 옵션" button
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const optBtn = btns.find((b) => b.textContent && b.textContent.includes('옵션'));
    if (optBtn) optBtn.click();
  });
  await new Promise((r) => setTimeout(r, 600));

  // 2. Click and type "헤어질 결심" into the place/movie search input
  const searchInput = await page.$('input[placeholder*="검색"]');
  if (searchInput) {
    await searchInput.click();
    await page.keyboard.type('헤어질 결심', { delay: 60 });
    console.log('Typed query: 헤어질 결심');
  }

  // 3. Wait for TMDB results to populate (debounced 180ms + TMDB fetch)
  await new Promise((r) => setTimeout(r, 1200));

  // Capture screenshot of options modal with TMDB search results
  const outModalPath =
    'C:/Users/User/.gemini/antigravity/brain/d0030e2a-c8fa-4df4-9d6a-a2087fe0aaf0/captures/24_tmdb_dropdown_results.png';
  await page.screenshot({ path: outModalPath });
  console.log('Saved modal capture:', outModalPath);

  // 4. Click the TMDB movie item in the dropdown
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const movieBtn = btns.find((b) => b.textContent && b.textContent.includes('헤어질 결심'));
    if (movieBtn) {
      console.log('Found movie button:', movieBtn.textContent);
      movieBtn.click();
    }
  });
  await new Promise((r) => setTimeout(r, 800));

  // 5. Click "DONE ✓" to return to main + LOG canvas
  await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('button'));
    const doneBtn = btns.find((b) => b.textContent && b.textContent.includes('DONE'));
    if (doneBtn) doneBtn.click();
  });
  await new Promise((r) => setTimeout(r, 800));

  // 6. Capture main screen showing loaded movie title, poster, and CINEMA tag
  const outCanvasPath =
    'C:/Users/User/.gemini/antigravity/brain/d0030e2a-c8fa-4df4-9d6a-a2087fe0aaf0/captures/25_tmdb_poster_loaded_canvas.png';
  await page.screenshot({ path: outCanvasPath });
  console.log('Saved canvas capture:', outCanvasPath);

  await browser.close();
}

main().catch(console.error);
