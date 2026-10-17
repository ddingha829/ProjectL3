import puppeteer from 'puppeteer-core';
import path from 'path';
import fs from 'fs';

const mockupPath = 'file:///C:/Users/User/.gemini/antigravity/brain/d0030e2a-c8fa-4df4-9d6a-a2087fe0aaf0/interactive_mockup.html';
const artifactCapturesDir = 'C:/Users/User/.gemini/antigravity/brain/d0030e2a-c8fa-4df4-9d6a-a2087fe0aaf0/captures';
const projectCapturesDir = 'c:/Users/User/Desktop/ProjectL3/mockup_captures';

fs.mkdirSync(artifactCapturesDir, { recursive: true });
fs.mkdirSync(projectCapturesDir, { recursive: true });

async function saveShot(page, filename, fullPage = false) {
  const p1 = path.join(artifactCapturesDir, filename);
  const p2 = path.join(projectCapturesDir, filename);
  await page.screenshot({ path: p1, fullPage });
  fs.copyFileSync(p1, p2);
  console.log('Captured (iPhone 17 402x874 @3x):', filename);
}

const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function run() {
  const browser = await puppeteer.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--allow-file-access-from-files']
  });

  const page = await browser.newPage();
  // iPhone 17 / iPhone 17 Pro native CSS viewport: 402 x 874 (19.5:9 ratio) @ 3x Retina (1206 x 2622 px)
  await page.setViewport({ width: 402, height: 874, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
  await page.goto(mockupPath, { waitUntil: 'networkidle0' });
  await delay(600);

  // 01. Default + LOG Screen (Dark Mode, Full iPhone 17 Viewport)
  await saveShot(page, '01_log_default_dark.png');

  // 02. + LOG with Translucent Options Overlay Open
  await page.evaluate(() => openOptionsOverlay());
  await delay(350);
  await saveShot(page, '02_log_options_overlay.png');

  // 03. Options Overlay — Map API Search Dropdown Open
  await page.evaluate(() => showMapDropdown(true));
  await delay(300);
  await saveShot(page, '03_log_options_map_search.png');

  // 04. Options Overlay — 0.1 Draggable Score Gauge adjusted to 4.8 & GOOD/NOTE filled
  await page.evaluate(() => {
    showMapDropdown(false);
    selectMapApiPlace('우디집 성수', '서울 성동구 둘레7길 15 2층', '서울 성동구 성수동', 'https://map.kakao.com/link/search/우디집성수');
    const track = document.getElementById('scoreGaugeTrack');
    const rect = track.getBoundingClientRect();
    updateGaugeFromEvent(rect.left + rect.width * 0.96); // 4.8
    document.getElementById('logGood').value = '통창 채광과 소믈리에의 정교한 내추럴 와인 큐레이션';
    document.getElementById('logNote').value = '2인석 위주라 프라이빗 데이트에 최적';
  });
  await delay(300);
  await saveShot(page, '04_log_options_score_drag.png');

  // Close overlay and reset to 작은부엌 for next shots
  await page.evaluate(() => {
    closeOptionsOverlay();
    selectMapApiPlace('작은부엌', '전라남도 순천시 향교길 39', '전남 순천시 향교동', 'https://map.kakao.com/link/search/순천작은부엌');
    const track = document.getElementById('scoreGaugeTrack');
    const rect = track.getBoundingClientRect();
    updateGaugeFromEvent(rect.left + rect.width * 0.90); // 4.5
  });
  await delay(250);

  // 05. + LOG in Light Mode (Gallery Paper)
  await page.evaluate(() => setSurfaceMode('light'));
  await delay(300);
  await saveShot(page, '05_log_light_mode.png');

  // 06. Settings Popover Open (Showing DARK/LIGHT toggle & Signature)
  await page.evaluate(() => {
    setSurfaceMode('dark');
    toggleSettingsMenu();
  });
  await delay(300);
  await saveShot(page, '06_settings_popover.png');
  await page.evaluate(() => toggleSettingsMenu());

  // 07. ARCHIVE — POSTER Grid View (All)
  await page.evaluate(() => {
    switchView('archive');
    window.scrollTo(0, 0);
  });
  await delay(400);
  await saveShot(page, '07_archive_poster_all.png');

  // 08. ARCHIVE — DINING Category Filter
  await page.evaluate(() => filterCategory('dining'));
  await delay(300);
  await saveShot(page, '08_archive_poster_dining.png');

  // 09. ARCHIVE — Search & Oldest Sort Order (오래된순 ↑)
  await page.evaluate(() => {
    filterCategory('all');
    toggleSortOrder();
  });
  await delay(300);
  await saveShot(page, '09_archive_poster_sort_oldest.png');
  await page.evaluate(() => toggleSortOrder()); // Back to 최신순

  // 10. ARCHIVE — Multi-Pick SELECT Mode Active
  await page.evaluate(() => toggleCurateMode());
  await delay(300);
  await saveShot(page, '10_archive_select_curation.png');
  await page.evaluate(() => toggleCurateMode());

  // 11. ARCHIVE — INDEX View (No Photo, No Score — Title + Date + District Address)
  await page.evaluate(() => setArchiveMode('index'));
  await delay(300);
  await saveShot(page, '11_archive_index_view.png');

  // 12. ARCHIVE — MAP View (Radar Map + Index-style Place List Below)
  await page.evaluate(() => setArchiveMode('map'));
  await delay(350);
  await saveShot(page, '12_archive_map_view.png');

  // 13. CARD — Preset 01: KAKAO (Spec Card + Floating 2-Col Share Bar at Bottom of iPhone 17)
  await page.evaluate(() => {
    setArchiveMode('poster');
    openCardFor(1);
    selectPresetSlot('slot-1');
    window.scrollTo(0, 0);
  });
  await delay(400);
  await saveShot(page, '13_card_preset_01_kakao.png');

  // 14. CARD — Preset 02: INSTA (1:1 Full-Bleed Cover Poster — THE SUBSTANCE)
  await page.evaluate(() => {
    switchShareItem(3);
    selectPresetSlot('slot-2');
    window.scrollTo(0, 0);
  });
  await delay(400);
  await saveShot(page, '14_card_preset_02_insta.png');

  // 15. CARD — Preset 03: TICKET (9:16 Perforated Ticket — 우디집 성수)
  await page.evaluate(() => {
    switchShareItem(2);
    selectPresetSlot('slot-3');
    window.scrollTo(0, 0);
  });
  await delay(400);
  await saveShot(page, '15_card_preset_03_ticket.png');

  // 16. CARD — Preset 04: LIST (Multi-Item TOP PICKS Curation Card)
  await page.evaluate(() => {
    selectPresetSlot('slot-4');
    window.scrollTo(0, 0);
  });
  await delay(400);
  await saveShot(page, '16_card_preset_04_list.png');

  // 17. CARD — Scrolled Down (Share Bar Settled into Inline Position + Share Notification)
  await page.evaluate(() => {
    switchShareItem(1);
    selectPresetSlot('slot-1');
    notifyShare('KAKAOTALK — 카드 이미지와 링크가 함께 복사/전송되었습니다.');
    window.scrollTo(0, document.body.scrollHeight);
  });
  await delay(400);
  await saveShot(page, '17_card_settled_bottom_scroll.png');

  // 18. STUDIO — Pre-saved Preset Studio (SAGE Skin)
  await page.evaluate(() => {
    window.scrollTo(0, 0);
    switchView('studio');
    selectPresetSlot('slot-1');
    setCardSkin('forest');
  });
  await delay(400);
  await saveShot(page, '18_studio_sage_skin.png');

  // 19. STUDIO — AI Skin Generated (TOKYO JAZZ AMBER)
  await page.evaluate(() => {
    document.getElementById('aiSkinInput').value = 'TOKYO JAZZ AMBER';
    triggerAiSkin();
  });
  await delay(400);
  await saveShot(page, '19_studio_ai_skin_generated.png');

  // 20. CARD (Light Surface Mode + Floating Share Bar on iPhone 17)
  await page.evaluate(() => {
    setSurfaceMode('light');
    selectPresetSlot('slot-1');
    setCardSkin('obsidian');
    switchView('card');
    window.scrollTo(0, 0);
  });
  await delay(400);
  await saveShot(page, '20_mobile_card_floating_bar.png');

  await browser.close();
  console.log('All 20 iPhone 17 (402x874) scenario screenshots generated successfully!');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
