import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';
const require = createRequire(import.meta.url), ts = require('typescript'), modules = new Map(), root = process.cwd();
function load(file) {
  if (modules.has(file)) return modules.get(file).exports;
  const m = { exports: {} }; modules.set(file, m);
  new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText)(name => name.startsWith('@/') ? load(path.join(root, 'src', name.slice(2)) + '.ts') : require(name), m, m.exports); return m.exports;
}
const { PRESET_SLOTS, INITIAL_SKINS, INITIAL_ARCHIVES } = load(path.join(root, 'src/data/initialData.ts'));
const { assignDefault, defaultPresetFor, reorderPresets } = load(path.join(root, 'src/lib/presetDefaults.ts'));
const { normalizePresetPreferences } = load(path.join(root, 'src/lib/presetPreferences.ts'));
const { skinContrast } = load(path.join(root, 'src/lib/skinValidation.ts'));
const newPalettes = ['mocha','peach','butter','cloud','sea','peri','terra','olive','plum','petrol'];
assert.equal(Object.keys(INITIAL_SKINS).length, 21);
for (const id of newPalettes) {
  const skin = INITIAL_SKINS[id];
  for (const [ink, background] of [['text','bg'],['sub','bg'],['accent','bg'],['text','chipBg'],['sub','chipBg'],['headerText','headerBg']]) assert.ok(skinContrast(skin[ink], skin[background]) >= 4.5, `${id}: ${ink}/${background}`);
}
let assigned = assignDefault(PRESET_SLOTS, PRESET_SLOTS[2], 'CINEMA');
assert.equal(defaultPresetFor('CINEMA', assigned, '01').id, '03');
assert.equal(defaultPresetFor('DINING', assigned, '01').id, '01');
assigned = assignDefault(assigned, PRESET_SLOTS[1], 'CINEMA');
assert.equal(defaultPresetFor('CINEMA', assigned, '01').id, '02');
assert.equal(assigned.filter(slot => slot.defaultFor?.includes('CINEMA')).length, 1);
assert.throws(() => assignDefault(assigned, PRESET_SLOTS[3], 'CINEMA'));
assert.equal(reorderPresets(assigned, ['missing', '01', '01']).length, PRESET_SLOTS.length);
assert.equal(normalizePresetPreferences({ presetSlots: assigned }).presetSlots.find(slot => slot.id === '02').defaultFor[0], 'CINEMA');

const base = process.env.L2_TEST_URL || 'http://localhost:3014';
assert.ok(['localhost', '127.0.0.1'].includes(new URL(base).hostname));
const out = path.resolve(process.env.L2_TEST_OUTPUT_DIR || 'artifacts/preset-workflows'); fs.mkdirSync(out, { recursive: true });
const prefs = { deviceId: crypto.randomUUID(), username: 'qa-preset', authorName: '테스트', presetSlots: structuredClone(PRESET_SLOTS), skins: INITIAL_SKINS, defaultPresetId: '01' };
const poster = 'https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg';
const movie = { ...INITIAL_ARCHIVES[0], id: crypto.randomUUID(), cat: 'CINEMA', title: 'TMDB 내보내기', img: poster, hasPhoto: true, quote: '내보내기에 포스터도 함께 담겨요.', cardAppearance: { slot: PRESET_SLOTS[2], skin: INITIAL_SKINS.noir, authorName: '테스트' } };
let records = [movie]; const saved = [], checks = [], errors = [];
const pass = text => { checks.push(text); console.log('PASS ' + text); }, delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
const page = await browser.newPage(); await page.setViewport({ width: 390, height: 844 }); await page.setBypassServiceWorker(true);
page.on('pageerror', error => errors.push(error.message));
await page.evaluateOnNewDocument(() => {
  localStorage.setItem('l2_first_visit_guides_v1', JSON.stringify({ eligible: false, seen: {} })); localStorage.setItem('l2_pwa_banner_dismissed_v1', '1'); localStorage.setItem('l2_auto_place_link_on', 'off');
  window.__shared = null; Object.defineProperty(navigator, 'canShare', { value: () => true });
  Object.defineProperty(navigator, 'share', { value: async data => {
    const file = data.files[0], image = await createImageBitmap(file);
    const encoded = await new Promise(resolve => { const reader = new FileReader(); reader.onload = () => resolve(reader.result); reader.readAsDataURL(file); });
    window.__shared = { width: image.width, height: image.height, bytes: file.size, type: file.type, encoded }; image.close();
  } });
});
await page.setRequestInterception(true);
page.on('request', async request => {
  const url = new URL(request.url()); if (!url.pathname.startsWith('/api/')) return request.continue();
  let data = { ...prefs, archives: records };
  if (url.pathname === '/api/presets' && request.method() === 'POST') { const body = JSON.parse(request.postData()); for (const key of ['presetSlots', 'defaultPresetId', 'skins', 'authorName']) if (body[key] !== undefined) prefs[key] = body[key]; data = prefs; }
  if (url.pathname === '/api/logs' && ['POST', 'PATCH'].includes(request.method())) { const item = JSON.parse(request.postData()); const entry = item.item || item; saved.push(entry); records = [...records.filter(record => record.id !== entry.id), entry]; data = { ...prefs, item: entry, archives: records }; }
  if (url.pathname === '/api/media/search') data = { results: [{ id: 278, type: 'movie', title: '새 영화 로그', poster, overview: '영화 예시 소개', rating: 8.7, year: '1994' }] };
  if (url.pathname.startsWith('/api/places')) data = { results: [] };
  await request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
});
async function button(text, scope = 'body') { for (const node of await page.$$(scope + ' button')) if (await node.evaluate((el, text) => el.textContent.trim() === text, text)) { await node.click(); return; } throw Error('Missing ' + text); }
async function nav(text) { await button(text, '.test-header nav'); await delay(450); }
async function waitSync() { await delay(650); }
async function order() { return page.$$eval('.preset-library-item', els => els.map(el => el.dataset.presetId)); }
try {
  await page.goto(base, { waitUntil: 'networkidle2' }); await page.waitForSelector('input[name=title]:not(:disabled)'); await nav('스튜디오');
  await button('색상', '.preset-tabs'); await page.click('.preset-current'); await page.waitForSelector('.preset-palette-picker');
  assert.equal(await page.$$eval('.preset-palette-item', els=>els.length), 21);
  for (const [width,height] of [[320,568],[768,1024],[1280,800]]) {
    await page.setViewport({width,height});
    const palette = await page.$eval('.preset-palette-picker', el=>({columns:getComputedStyle(el).gridTemplateColumns.split(' ').length,overflow:el.scrollWidth-el.clientWidth}));
    assert.equal(palette.columns,3); assert.ok(palette.overflow<=1);
    await page.screenshot({path:path.join(out,`palettes-${width}.png`)});
  }
  await button('MOCHA LINEN','.preset-palette-picker'); await page.waitForFunction(()=>!document.querySelector('.preset-palette-picker'));
  assert.ok(await page.$eval('.preset-current',el=>el.textContent.includes('MOCHA LINEN'))); await button('디자인','.preset-tabs');
  pass('21 bundled palettes, 10 new contrast-tested combinations and a three-column picker at 320/768/1280px');
  for (const width of [320, 768, 1280]) {
    await page.setViewport({ width, height: 900 });
    const geometry = await page.$eval('.preset-library-track', e => { const rail = e.querySelector('.preset-rail'), add = e.querySelector('.preset-add'); rail.scrollLeft = rail.scrollWidth; const a = add.getBoundingClientRect(), r = rail.getBoundingClientRect(); return { separate: !rail.contains(add), gap: a.left - r.right, inside: a.right <= innerWidth, last: rail.lastElementChild.getBoundingClientRect().right - r.right }; });
    assert.ok(geometry.separate && geometry.gap >= 4 && geometry.inside && geometry.last <= 1, JSON.stringify(geometry));
  }
  pass('fixed add button stays outside the scrolling list, including at the far end on phone/tablet/desktop');
  await page.setViewport({ width: 390, height: 844 }); await page.$eval('.studio-preset-rail', el => { el.scrollLeft = 0; });
  const original = await order(), handle = await page.$(`[data-preset-id="${original[0]}"] .preset-drag-handle`), from = await handle.boundingBox(), target = await (await page.$(`[data-preset-id="${original[1]}"]`)).boundingBox();
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2); await page.mouse.down(); await page.mouse.move(target.x + target.width / 2, target.y + target.height / 2, { steps: 12 }); await page.mouse.up(); await waitSync();
  assert.deepEqual((await order()).slice(0, 2), [original[1], original[0]]); assert.deepEqual(prefs.presetSlots.slice(0, 2).map(slot => slot.id), [original[1], original[0]]);
  await page.reload({ waitUntil: 'networkidle2' }); await nav('스튜디오'); assert.deepEqual((await order()).slice(0, 2), [original[1], original[0]]); pass('drag reorder includes the global default and survives server sync/reload');
  const touch = await page.createCDPSession(); await touch.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 1 });
  const beforeTouch = await order(), touchStart = await (await page.$(`[data-preset-id="${beforeTouch[0]}"] .preset-drag-handle`)).boundingBox(), touchTarget = await (await page.$(`[data-preset-id="${beforeTouch[1]}"]`)).boundingBox();
  const startX = touchStart.x + touchStart.width / 2, endX = touchTarget.x + touchTarget.width / 2, touchY = touchStart.y + touchStart.height / 2;
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: startX, y: touchY }] });
  for (let step = 1; step <= 12; step++) { await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: startX + (endX - startX) * step / 12, y: touchY }] }); await delay(16); }
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await waitSync();
  assert.deepEqual((await order()).slice(0, 2), [beforeTouch[1], beforeTouch[0]]); assert.equal(prefs.presetSlots[0].id, beforeTouch[1]);
  const beforeCancel = await order(), cancelFrom = await (await page.$(`[data-preset-id="${beforeCancel[0]}"] .preset-drag-handle`)).boundingBox(), cancelTo = await (await page.$(`[data-preset-id="${beforeCancel[1]}"]`)).boundingBox();
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: cancelFrom.x + cancelFrom.width / 2, y: cancelFrom.y + cancelFrom.height / 2 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: cancelTo.x + cancelTo.width / 2, y: cancelFrom.y + cancelFrom.height / 2 }] }); await delay(50);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchCancel', touchPoints: [] }); await waitSync(); assert.deepEqual(await order(), beforeCancel);
  await touch.send('Emulation.setTouchEmulationEnabled', { enabled: false }); await touch.detach(); pass('touch dragging reorders and persists; a canceled touch restores the prior order');
  const firstId = (await order())[0], keyboard = await page.$(`[data-preset-id="${firstId}"] .preset-drag-handle`); await keyboard.focus(); await page.keyboard.press('ArrowRight'); await waitSync(); assert.equal(prefs.presetSlots[1].id, firstId);
  await page.click(`[data-preset-id="${firstId}"] .preset-drag-handle`); await page.waitForSelector('.preset-order-actions'); await button('앞으로 이동', '.preset-order-actions'); await waitSync(); assert.equal(prefs.presetSlots[0].id, firstId); await page.keyboard.press('Escape'); pass('keyboard arrows and a tap-to-move menu provide alternatives to dragging');
  await page.$eval('[data-preset-id="03"] .preset-library-chip', el => el.click()); await page.click('.preset-default'); await page.waitForSelector('.preset-default-scopes');
  await page.$$eval('.preset-default-scopes>div>button:first-child', els => els.find(el => el.querySelector('strong').textContent === '영화').click()); await page.waitForFunction(() => !document.querySelector('.preset-default-scopes')); await waitSync();
  assert.equal(prefs.defaultPresetId, '01'); assert.ok(prefs.presetSlots.find(slot => slot.id === '03').defaultFor.includes('CINEMA'));
  assert.ok(await page.$eval('[data-preset-id="03"] .preset-library-chip', el => el.classList.contains('is-default') && el.textContent.includes('영화'))); pass('category default dialog applies immediately and leaves the overall default intact');
  await nav('+ 로그'); await page.click('.quick-actions button:first-child'); await page.waitForSelector('.photo-picker-options'); await button('영화 및 드라마 검색TMDB 공식 포스터로 기록', '.photo-picker-options'); await page.type('.media-search input', '영화'); await page.waitForSelector('.media-results button'); await page.click('.media-results button'); await page.waitForFunction(() => !document.querySelector('.media-picker'));
  await page.click('.quick-save-button'); await page.waitForSelector('.quick-category-sheet'); await page.$$eval('.quick-category-sheet button', els => els.find(el => el.querySelector('strong').textContent === '영화').click()); await page.waitForSelector('.logbook-row'); await waitSync();
  const created = saved.find(item => item.title === '새 영화 로그'); assert.ok(created); assert.equal(created.cardAppearance.slot.id, '03'); assert.equal(created.cardAppearance.slot.layout, 'ticket'); assert.equal(created.img, poster); assert.deepEqual(movie.cardAppearance.slot, PRESET_SLOTS[2]); pass('new TMDB log uses its category preset; original URL and old card snapshots are preserved');
  await page.$eval(`#record-${created.id}`, el => el.click()); await page.waitForSelector('.record-card-actions button:last-child:not(:disabled)', { timeout: 45000 }); assert.equal(await page.$('.record-card-error'), null);
  await page.click('.record-card-actions button:last-child'); await page.waitForFunction(() => window.__shared); const { encoded, ...share } = await page.evaluate(() => window.__shared);
  assert.ok(share.width <= 1080 && share.bytes <= 500 * 1024); assert.equal(share.type, 'image/jpeg'); fs.writeFileSync(path.join(out, 'tmdb-export.jpg'), Buffer.from(encoded.split(',')[1], 'base64')); pass('actual TMDB CDN poster exports and shares as JPEG after ordinary image caching, without a proxy or server upload');
  await page.$eval('.record-preset-chip[aria-pressed=false]', el => el.click()); await page.waitForFunction(() => !document.querySelector('.record-card-save').disabled); await page.click('.record-card-save'); await page.waitForFunction(() => document.querySelector('.record-card-save').dataset.saveState === 'saved'); pass('TMDB card preset changes also save to the logbook');
  await nav('스튜디오'); await page.$eval('[data-preset-id="03"] .preset-library-chip', el => el.click()); await page.click('.preset-default'); await page.waitForSelector('.preset-default-scopes'); await page.click('[aria-label="영화 기본값 해제"]'); await waitSync(); assert.ok(!prefs.presetSlots.some(slot => slot.defaultFor?.includes('CINEMA'))); pass('category override can return to the overall default');
  await page.keyboard.press('Escape'); await page.click('[aria-label="새 프리셋 추가"]'); await page.click('#preset-name',{clickCount:3}); await page.keyboard.press('Backspace'); await page.type('#preset-name','새 순서'); await delay(300);await page.waitForFunction(()=>{const rail=document.querySelector('.studio-preset-rail'),item=rail.querySelector('[aria-pressed=true]').closest('[data-preset-id]'),a=rail.getBoundingClientRect(),b=item.getBoundingClientRect();return b.left>=a.left&&b.right<=a.right;});
  const draftIds = await order(), draftId = draftIds.at(-1), previousId = draftIds.at(-2), newHandle = await (await page.$(`[data-preset-id="${draftId}"] .preset-drag-handle`)).boundingBox(), previousChip = await (await page.$(`[data-preset-id="${previousId}"]`)).boundingBox();
  await page.mouse.move(newHandle.x+newHandle.width/2,newHandle.y+newHandle.height/2); await page.mouse.down(); await page.mouse.move(previousChip.x+previousChip.width/2,previousChip.y+previousChip.height/2,{steps:12}); await page.mouse.up();
  assert.equal((await order()).at(-2),draftId); await page.click('.preset-save'); await waitSync(); assert.equal(prefs.presetSlots.at(-2).id,draftId);
  await page.reload({waitUntil:'networkidle2'}); await nav('스튜디오'); assert.equal((await order()).at(-2),draftId); pass('a newly added draft retains its dragged position when saved and reopened');
  assert.deepEqual(errors, []); fs.writeFileSync(path.join(out, 'results.json'), JSON.stringify({ checks, errors, share, network: 'Only public TMDB poster read; app APIs are isolated fixtures.' }, null, 2));
} catch (error) { await page.screenshot({ path: path.join(out, 'failure.png') }); throw error; }
finally { await browser.close(); }
