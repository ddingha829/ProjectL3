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

async function pick(id){await page.click('.preset-library-open');await page.waitForSelector('.preset-collection-grid');await page.click(`.preset-collection-card[data-preset-id="${id}"]`);await delay(550);}
try{
 await page.goto(base,{waitUntil:'networkidle2'});await page.waitForSelector('input[name=title]:not(:disabled)');await nav('스튜디오');
 await button('색상','.preset-tabs');await page.click('.preset-current');await page.waitForSelector('.preset-palette-picker');assert.equal(await page.$$eval('.preset-palette-item',els=>els.length),21);
 for(const [width,height] of [[320,568],[768,1024],[1280,800]]){await page.setViewport({width,height});const g=await page.$eval('.preset-palette-picker',e=>({columns:getComputedStyle(e).gridTemplateColumns.split(' ').length,overflow:e.scrollWidth-e.clientWidth}));assert.equal(g.columns,3);assert.ok(g.overflow<=1);await page.screenshot({path:path.join(out,`palettes-${width}.png`)});}await page.keyboard.press('Escape');
 await page.setViewport({width:390,height:844});await button('디자인','.preset-tabs');
 await page.click('.preset-library-open');await page.waitForSelector('.preset-collection-grid');assert.equal(await page.$('.preset-drag-handle'),null);assert.equal(await page.$('.preset-order-actions'),null);
 const original=prefs.presetSlots.map(s=>s.id);await page.click('.preset-organize');await page.waitForSelector('.preset-sort-list');await page.click(`.preset-sort-item[data-preset-id="${original[0]}"]`);await page.click('[aria-label="3번째 위치에 넣기"]');assert.deepEqual(prefs.presetSlots.map(s=>s.id),original);await button('취소','.preset-collection-footer');assert.deepEqual(prefs.presetSlots.map(s=>s.id),original);
 await page.click('.preset-organize');await page.click(`.preset-sort-item[data-preset-id="${original[0]}"]`);await page.click('[aria-label="3번째 위치에 넣기"]');await button('순서 저장','.preset-collection-footer');await waitSync();assert.deepEqual(prefs.presetSlots.slice(0,2).map(s=>s.id),[original[1],original[0]]);await page.keyboard.press('Escape');
 await page.reload({waitUntil:'networkidle2'});await nav('스튜디오');assert.deepEqual(prefs.presetSlots.slice(0,2).map(s=>s.id),[original[1],original[0]]);pass('thumbnail collection replaces chip dragging; tap insertion is explicit, cancel leaves order intact, save survives reload');
 await page.click('.preset-library-open');await page.waitForSelector('.preset-collection-grid');await page.click('.preset-organize');const firstId=prefs.presetSlots[0].id;await (await page.$(`.preset-sort-item[data-preset-id="${firstId}"]`)).focus();await page.keyboard.press('Enter');await (await page.$('[aria-label="마지막 위치에 넣기"]')).focus();await page.keyboard.press('Enter');await button('순서 저장','.preset-collection-footer');await waitSync();assert.equal(prefs.presetSlots.at(-1).id,firstId);await page.keyboard.press('Escape');pass('keyboard alone can select, insert and save the preset order');
 await page.click('.preset-library-open');await page.waitForSelector('.preset-collection-grid');await page.click('.preset-create-open');await page.waitForSelector('#new-preset-name');await page.click('#new-preset-name',{clickCount:3});await page.type('#new-preset-name','나의 밤');await button('텍스트용','.preset-create-kinds');await page.click('.preset-copy-choice:nth-of-type(2) input');await button('만들고 편집하기 →','.preset-create-form');await page.waitForFunction(()=>!document.querySelector('.preset-create-form'));await waitSync();const createdPreset=prefs.presetSlots.find(s=>s.name==='나의 밤');assert.ok(createdPreset);assert.equal(createdPreset.layout,'broadside');assert.equal(createdPreset.defaultFor,undefined);assert.equal(await page.$eval('#preset-name',e=>e.value),'나의 밤');pass('new preset explicitly names, chooses kind and copies or starts clean; creation is durable immediately');
 await pick('03');await page.click('.preset-default');await page.waitForSelector('.preset-default-scopes');await page.$$eval('.preset-default-scopes>div>button:first-child',els=>els.find(e=>e.querySelector('strong').textContent==='영화').click());await page.waitForFunction(()=>!document.querySelector('.preset-default-scopes'));await waitSync();assert.equal(prefs.defaultPresetId,'01');assert.ok(prefs.presetSlots.find(s=>s.id==='03').defaultFor.includes('CINEMA'));pass('category defaults still apply immediately without changing the overall default');
 await nav('+ 로그');await page.click('.quick-movie-button');await page.waitForSelector('.media-search input');await page.type('.media-search input','영화');await page.waitForSelector('.media-results button');await page.click('.media-results button');await page.waitForFunction(()=>!document.querySelector('.media-picker'));await page.click('.quick-save-button');await page.waitForSelector('.quick-category-sheet');await page.$$eval('.quick-category-sheet button',els=>els.find(e=>e.querySelector('strong').textContent==='영화').click());await page.waitForSelector('.logbook-row');await waitSync();const created=saved.find(r=>r.title==='새 영화 로그');assert.ok(created);assert.equal(created.cardAppearance.slot.id,'03');assert.equal(created.img,poster);
 await page.$eval(`#record-${created.id}`,e=>e.click());await page.click('.record-editor-handle');await page.waitForSelector('.record-card-actions button:last-child:not(:disabled)',{timeout:45000});await page.click('.record-card-actions button:last-child');await page.waitForFunction(()=>window.__shared);let share=await page.evaluate(()=>window.__shared);assert.ok(share.width<=1080&&share.bytes<=500*1024);fs.writeFileSync(path.join(out,'tmdb-export.png'),Buffer.from(share.encoded.split(',')[1],'base64'));pass('TMDB category preset, original URL, cached CDN poster export and sharing remain correct');
 const beforePresets=JSON.stringify(prefs.presetSlots),beforeOthers=JSON.stringify(records.filter(r=>r.id!==created.id));await page.click('.record-design-tools [aria-label="다음 디자인"]');await button('색상','.record-design-tools .preset-tabs');await page.click('.record-design-tools .preset-current');await page.waitForSelector('.preset-palette-picker');await button('MOCHA LINEN','.preset-palette-picker');await button('세부사항','.record-design-tools .preset-tabs');await page.waitForSelector('.preset-details');await button('1:1','.preset-ratios');await page.click('.preset-toggles input[name=showScore]');await page.keyboard.press('Escape');assert.ok((await page.$eval('.record-preset-controls',e=>e.textContent)).includes('개별 디자인'));assert.ok(!(await page.$eval('.record-card-save',e=>e.disabled)));assert.equal(JSON.stringify(prefs.presetSlots),beforePresets);await page.click('.record-card-save');await page.waitForFunction(()=>document.querySelector('.record-card-save').dataset.saveState==='saved');await waitSync();let updated=records.find(r=>r.id===created.id);assert.equal(updated.cardAppearance.slot.ratio,'1:1');assert.equal(updated.cardAppearance.slot.skinId,'mocha');assert.equal(updated.cardAppearance.slot.showScore,false);assert.equal(JSON.stringify(records.filter(r=>r.id!==created.id)),beforeOthers);assert.equal(JSON.stringify(prefs.presetSlots),beforePresets);pass('individual layout, color, ratio and details save only to the selected log, never its preset or other logs');
 await page.click('.record-design-tools [aria-label="다음 팔레트"]');const pendingBg=await page.$eval('.record-card-stage [data-card-capture]',e=>e.style.getPropertyValue('--card-bg'));await page.click('.record-card-actions button:first-child');await page.waitForSelector('.record-editor');await page.click('.record-editor textarea[name=body]',{clickCount:3});await page.type('.record-editor textarea[name=body]','내용 수정 뒤에도 디자인은 유지해요.');await page.click('.record-editor .quick-save-button');await page.waitForFunction(()=>!document.querySelector('.record-editor'));assert.ok(await page.$('.record-card'));assert.equal(await page.$eval('.record-card-save',e=>e.disabled),false);assert.equal(await page.$eval('.record-card-stage [data-card-capture]',e=>e.style.getPropertyValue('--card-bg')),pendingBg);await page.click('.record-card-save');await waitSync();updated=records.find(r=>r.id===created.id);assert.equal(updated.quote,'내용 수정 뒤에도 디자인은 유지해요.');assert.equal(JSON.stringify(prefs.presetSlots),beforePresets);pass('content editing stays in the card sheet and retains an unsaved local design until Card Save');
 await page.click('.record-design-tools [aria-label="다음 팔레트"]');await button('변경 취소','.record-style-status');assert.equal(await page.$eval('.record-card-save',e=>e.disabled),true);await pick('01');assert.equal(await page.$eval('.record-card-save',e=>e.disabled),false);await page.click('.record-card-save');await waitSync();assert.equal(records.find(r=>r.id===created.id).cardAppearance.slot.id,'01');pass('reset restores the saved card; choosing a preset then saving still works');
 const text={...movie,id:crypto.randomUUID(),img:'',hasPhoto:false,title:'텍스트 기록',cat:'OTHER',cardAppearance:{slot:{...PRESET_SLOTS[0],layout:'broadside'},skin:INITIAL_SKINS.paper,authorName:'테스트'}};const group={...movie,id:crypto.randomUUID(),title:'그룹 기록',kind:'group',cat:'GROUP',memberIds:[movie.id,created.id],cardAppearance:{slot:PRESET_SLOTS[3],skin:INITIAL_SKINS.paper,authorName:'테스트'}};records.push(text,group);await page.reload({waitUntil:'networkidle2'});await nav('로그북');await page.$eval(`#record-${text.id}`,e=>e.click());await page.waitForSelector('.record-card');await button('디자인','.record-design-tools .preset-tabs');await page.click('.record-design-tools .preset-current');await page.waitForSelector('.preset-layout-picker');assert.equal(await page.$$eval('.preset-layout-picker button',e=>e.length),7);await page.keyboard.press('Escape');await nav('로그북');await page.$eval(`#record-${group.id}`,e=>e.click());await page.waitForSelector('.record-card');await page.click('.record-preset-controls .preset-library-open');await page.waitForSelector('.preset-collection-grid');assert.deepEqual(await page.$$eval('.preset-collection-caption strong',els=>els.map(e=>e.textContent)),['LIST']);assert.equal(await page.$('.preset-organize'),null);await page.keyboard.press('Escape');await button('디자인','.record-design-tools .preset-tabs');await page.click('.record-design-tools .preset-current');await page.waitForSelector('.preset-layout-picker');assert.equal(await page.$$eval('.preset-layout-picker button',els=>els.length),1);await page.keyboard.press('Escape');pass('text logs expose only text-compatible designs; group cards remain LIST-only in both library and local design tools');
 for(const [width,height]of[[320,568],[390,844],[768,1024],[1280,900]]){await page.setViewport({width,height});await delay(180);const r=await page.$eval('.record-card',e=>({overflow:e.scrollHeight-e.clientHeight,bottom:e.getBoundingClientRect().bottom,right:e.getBoundingClientRect().right}));assert.ok(r.bottom<=height+1&&r.right<=width+1&&r.overflow<=2,JSON.stringify({width,r}));await page.screenshot({path:path.join(out,`card-tools-${width}.png`)});}pass('card preview, collection chooser, local editing tools and actions fit phone/tablet/desktop without page scrolling');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2));
}catch(e){await page.screenshot({path:path.join(out,'failure.png')});throw e;}finally{await browser.close();}
