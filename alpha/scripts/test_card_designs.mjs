import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';
const require = createRequire(import.meta.url), ts = require('typescript'), cache = new Map(), root = process.cwd();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const m = { exports: {} }; cache.set(file, m);
  new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)(name => name.startsWith('@/') ? load(path.join(root, 'src', name.slice(2)) + '.ts') : require(name), m, m.exports);
  return m.exports;
}
const { INITIAL_SKINS, PRESET_SLOTS } = load(path.join(root, 'src/data/initialData.ts'));
const { STUDIO_PHOTO_SAMPLE, STUDIO_TEXT_SAMPLE } = load(path.join(root, 'src/data/studioSamples.ts'));
const { CARD_LAYOUTS, resolveEffectiveSlot } = load(path.join(root, 'src/lib/cardLayouts.ts'));
const { normalizePresetSlot } = load(path.join(root, 'src/lib/cardAppearance.ts'));
const { normalizePresetPreferences } = load(path.join(root, 'src/lib/presetPreferences.ts'));
const base = process.env.L2_TEST_URL || 'http://localhost:3014';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const out = path.resolve(process.env.L2_TEST_OUTPUT_DIR || 'artifacts/card-designs'); fs.mkdirSync(out, { recursive: true });
const additional = CARD_LAYOUTS.slice(11);
assert.equal(CARD_LAYOUTS.length, 20);
assert.equal(new Set(CARD_LAYOUTS.map(layout => layout.id)).size, 20);
for (const layout of additional) {
  const slot = PRESET_SLOTS.find(preset => preset.layout === layout.id);
  assert.ok(slot, `${layout.id} has a bundled preset`);
  assert.equal(normalizePresetSlot(slot).layout, layout.id);
  assert.equal(resolveEffectiveSlot({ hasPhoto: false, img: '' }, slot).layout, layout.isNoPhoto ? layout.id : 'broadside');
  assert.equal(resolveEffectiveSlot({ hasPhoto: true, img: '/photo', cat: 'GROUP' }, slot).layout, 'curation');
}
const edited = [{ ...PRESET_SLOTS[0], name: '나의 프리셋', layout: 'paint' }];
assert.deepEqual(normalizePresetPreferences({ presetSlots: edited }).presetSlots, edited, 'never replace or refill a custom preset library');
const archives = additional.flatMap(layout => ['3:4', '1:1', '9:16'].map(ratio => ({ ...(layout.isNoPhoto ? STUDIO_TEXT_SAMPLE : STUDIO_PHOTO_SAMPLE), id: crypto.randomUUID(), num: '77', title: '오래 기억하고 싶은 일상의 한 장면과 우리가 함께 걸었던 아주 긴 이름의 골목길'.repeat(2), quote: '서두르지 않고 바라보니 평범한 일상에도 오래 기억하고 싶은 장면이 있었다. '.repeat(8), good: '긴 세부사항 '.repeat(25), bad: '긴 메모 '.repeat(25), note: '긴 노트 '.repeat(25), fullAddress: '서울특별시 성동구 아주 긴 주소와 추가 건물 이름 '.repeat(4), cardAppearance: { slot: { ...PRESET_SLOTS.find(slot => slot.layout === layout.id), ratio, showNumber: false, showScore: true, showProsCons: true }, skin: INITIAL_SKINS.noir, authorName: '매우 긴 사용자 서명을 기록하는 사람' } })));
const prefs = { deviceId: crypto.randomUUID(), presetSlots: PRESET_SLOTS, skins: INITIAL_SKINS, defaultPresetId: PRESET_SLOTS[0].id };
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage(), errors = [], results = [];
page.on('pageerror', error => errors.push(error.message));
await page.setBypassServiceWorker(true); await page.setViewport({ width: 390, height: 844 });
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('l2_first_visit_guides_v1', JSON.stringify({ eligible: false, seen: {} }));
  localStorage.setItem('l2_pwa_banner_dismissed_v1', '1'); localStorage.setItem('l2_auto_place_link_on', 'off');
});
await page.setRequestInterception(true);
page.on('request', request => new URL(request.url()).pathname.startsWith('/api/') ? request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...prefs, archives }) }) : request.continue());
async function open(item) {
  await page.$eval('.test-header nav button:nth-child(2)', e => e.click());
  await page.waitForSelector('.logbook-row');
  await page.$eval(`#record-${item.id}`, e => e.click());
  await page.click('.record-editor-handle');
  await page.waitForSelector('.record-card-actions button:last-child:not(:disabled)', { timeout: 30000 });
}
async function inspect() {
  const m = await page.$eval('[data-new-layout]', e => {
    const rect = e.getBoundingClientRect(), footer = e.querySelector('[data-card-imprint]').getBoundingClientRect();
    const title = e.querySelector('h3'), copy = [...e.querySelectorAll('h3,p')].filter(el => el.getBoundingClientRect().height > 0);
    const pictures = [...e.querySelectorAll('img')].map(img => img.parentElement.getBoundingClientRect().height);
    const cutLines = copy.map(el => ({ text: el.textContent.slice(0, 12), lines: el.offsetHeight / parseFloat(getComputedStyle(el).lineHeight) })).filter(item => Math.abs(item.lines - Math.round(item.lines)) > .06);
    return { layout: e.dataset.newLayout, ratio: e.dataset.ratio, overflow: e.scrollHeight - e.clientHeight, horizontal: e.scrollWidth - e.clientWidth, titleWeight: +getComputedStyle(title).fontWeight, titleSize: parseFloat(getComputedStyle(title).fontSize), copyBeforeFooter: copy.every(el => el.getBoundingClientRect().bottom <= footer.top - 2), footerInside: footer.bottom <= rect.bottom - 5, cutLines, pictures, fontReady: document.fonts.check('900 40px "Sebang Gothic"', '천천히') };
  });
  assert.ok(m.overflow <= 1 && m.horizontal <= 1, `card fits: ${JSON.stringify(m)}`);
  assert.ok(m.copyBeforeFooter && m.footerInside, `text cannot overlap imprint: ${JSON.stringify(m)}`);
  assert.deepEqual(m.cutLines, [], `never clip half a line: ${JSON.stringify(m)}`);
  assert.ok(m.titleWeight >= 850 && m.titleSize >= 26 && m.fontReady, `loaded Korean typography: ${JSON.stringify(m)}`);
  assert.ok(m.pictures.every(height => height >= 35), `photo remains usable: ${JSON.stringify(m)}`);
  results.push(m);
}
try {
  await page.goto(base, { waitUntil: 'networkidle2' });
  for (const item of archives) { await open(item); await inspect(); }
  for (const [width, height] of [[320, 568], [768, 1024], [1440, 900]]) {
    await page.setViewport({ width, height });
    for (const item of archives) item.cardAppearance.slot = { ...item.cardAppearance.slot, showDecorations: false, showLocation: false, showScore: false, showSignature: false, showProsCons: false };
    await page.reload({ waitUntil: 'networkidle2' });
    for (const layout of additional) {
      await open(archives.find(item => item.cardAppearance.slot.layout === layout.id));
      assert.equal(await page.$$eval('[data-new-layout] [data-card-decoration]', els => els.length), 0);
      await inspect();
      assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    }
  }
  assert.deepEqual(errors, []);
  fs.writeFileSync(path.join(out, 'long-content-results.json'), JSON.stringify({ results, errors, api: 'intercepted local fixtures only' }, null, 2));
  console.log('PASS nine bundled designs: photo/text/group compatibility, custom preset preservation, long Korean content × 3 ratios, optional labels, 320/768/1440px viewports');
} catch (error) { await page.screenshot({ path: path.join(out, 'long-content-failure.png') }); throw error; }
finally { await browser.close(); }
