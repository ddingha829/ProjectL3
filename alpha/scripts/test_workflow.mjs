import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const base = process.argv[2] || 'http://localhost:3013';
const folder = 'C:/Users/User/Documents/Codex/2026-10-16/pets-plugin-work-pets-openai-curated/work/cardflow';
fs.mkdirSync(folder, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage(), errors = [], checks = [];
page.on('pageerror', error => errors.push(error.message));
await page.setBypassServiceWorker(true);
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
await page.evaluateOnNewDocument(() => {
  window.__downloads = [];
  const original = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.download) window.__downloads.push(this.href); else original.call(this); };
});
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const pass = message => { checks.push(message); console.log('PASS ' + message); };
async function closeToast() { const close = await page.$('.test-toast-close'); if (close) await close.click(); }
async function click(text, scope = 'body') {
  if (scope !== '.test-toast') await closeToast();
  for (const button of await page.$$(`${scope} button`)) {
    if (await button.evaluate((element, target) => element.getClientRects().length > 0 && (element.textContent.trim() === target || [...element.querySelectorAll('strong,span')].some(child => child.textContent.trim() === target)), text)) {
      await button.click(); await delay(60); return;
    }
  }
  throw new Error(`Missing ${text} in ${scope}`);
}
async function aria(label) { await closeToast(); await page.click(`button[aria-label="${label}"]`); await delay(60); }
async function fill(selector, text) { await page.click(selector, { clickCount: 3 }); await page.keyboard.press('Backspace'); if (text) await page.type(selector, text); }
async function until(read, predicate, label) {
  let value;
  for (let i = 0; i < 120; i++) { value = await read(); if (predicate(value)) return value; await delay(100); }
  throw new Error(`Timed out ${label}: ${JSON.stringify(value).slice(0, 350)}`);
}
const records = () => page.evaluate(async () => (await (await fetch('/api/logs', { cache: 'no-store' })).json()).archives);
const prefs = () => page.evaluate(async () => (await (await fetch('/api/presets', { cache: 'no-store' })).json()));
const ready = () => page.waitForSelector('input[name="title"]:not(:disabled)');
async function go(text) { await click(text, '.test-header nav'); }
async function saveCategory(label) {
  await click('로그 저장'); await page.waitForSelector('.quick-category-sheet');
  await click(label, '.quick-category-sheet'); await page.waitForSelector('.logbook-row');
}
async function create(title, category = '기타', body = '') {
  await go('+ 로그'); await ready(); await fill('input[name=title]', title);
  if (body) await fill('textarea[name=body]', body);
  await saveCategory(category);
  return (await until(records, rows => rows.some(item => item.title === title), title)).find(item => item.title === title);
}
async function open(item) {
  await go('로그북'); await page.waitForSelector(`#record-${item.id}`); await page.click(`#record-${item.id}`);
  await page.waitForSelector('.record-card [data-card-capture]'); await delay(230);
}
async function canvas(selector = '.record-card [data-card-capture]') {
  return page.$eval(selector, element => ({ layout: element.dataset.cardLayout, ratio: element.dataset.cardRatio, bg: element.style.getPropertyValue('--card-bg').trim(), text: element.innerText }));
}
async function fits(selector) {
  return page.$eval(selector, element => {
    const r = element.getBoundingClientRect();
    return { visible: r.top >= 0 && r.bottom <= innerHeight + 1 && r.left >= 0 && r.right <= innerWidth + 1, r: r.toJSON(), page: document.documentElement.scrollHeight, h: innerHeight, width: document.documentElement.scrollWidth, vw: innerWidth };
  });
}

try {
  await page.goto(base, { waitUntil: 'networkidle2' }); await ready();
  assert.deepEqual(await page.$$eval('.test-header nav button', buttons => buttons.map(button => button.textContent.trim())), ['+ 로그', '로그북', '스튜디오']);
  assert.equal(await page.$('.quick-categories'), null);
  assert.equal(await page.$eval('textarea', e => e.placeholder), '무슨 일상을 로그할까요?');
  for (const size of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 487, height: 956 }, { width: 768, height: 1024 }, { width: 1280, height: 800 }, { width: 1366, height: 768 }]) {
    await page.setViewport(size); await delay(120);
    const box = await fits('.quick-save'); assert(box.visible, JSON.stringify(box)); assert(box.page <= box.h + 1); assert(box.h-box.r.bottom<35,JSON.stringify(box));
  }
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await page.$eval('.quick-title label', e => getComputedStyle(e).opacity), '1');
  await fill('input[name=title]', '내 첫 일상'); await delay(160);
  const titleStyle = await page.$eval('input[name=title]', e => ({ size: parseFloat(getComputedStyle(e).fontSize), weight: getComputedStyle(e).fontWeight, label: getComputedStyle(e.previousElementSibling).opacity }));
  assert(titleStyle.size >= 32); assert.equal(titleStyle.weight, '900'); assert.equal(titleStyle.label, '0');
  await click('로그 저장'); await page.waitForSelector('.quick-category-sheet');
  await page.keyboard.press('Escape'); await page.waitForFunction(() => !document.querySelector('[role=dialog]'));
  assert.equal(await page.$eval('input[name=title]', e => e.value), '내 첫 일상');
  await saveCategory('기타');
  const first = (await until(records, rows => rows.length === 1, 'first log'))[0];
  assert.equal(first.cat, 'OTHER'); assert.equal(first.quote, ''); assert(first.cardAppearance);
  pass('3-tab navigation, viewport-height composer, bold title, deferred one-tap category and title-only save');

  await open(first); await click('내용 수정'); await page.waitForSelector('.record-editor');
  assert.equal(await page.$eval('.test-header nav [aria-current=page]', e => e.textContent), '로그북');
  assert.equal(await page.$('.record-editor .quick-design-panel'), null);
  await fill('.record-editor input[name=title]', '수정한 일상');
  await click('세부 설정', '.record-editor'); await page.waitForFunction(() => document.querySelectorAll('[role=dialog]').length === 2);
  await page.keyboard.press('Escape'); await page.waitForFunction(() => document.querySelectorAll('[role=dialog]').length === 1);
  assert(await page.$('.record-editor')); assert.equal(await page.$eval('body', e => e.style.overflow), 'hidden');
  await click('수정 저장', '.record-editor'); await page.waitForFunction(() => !document.querySelector('.record-editor'));
  await until(records, rows => rows[0].title === '수정한 일상', 'edit');
  const edited = (await records())[0]; assert.equal(edited.id, first.id); assert.equal(edited.timestamp, first.timestamp); assert.equal(edited.date, first.date);
  assert.deepEqual(edited.cardAppearance, first.cardAppearance);
  assert(await page.$('.record-card')); assert.equal(await page.$eval('body', e => e.style.overflow), '');
  await click('내용 수정'); await page.waitForSelector('.record-editor'); await fill('.record-editor input[name=title]', '버릴 편집'); await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.querySelector('[role=dialog]'));
  assert((await canvas()).text.includes('수정한 일상'));
  pass('content edits stay in the same card sheet; nested Escape, cancel, original dates and appearance preserved');

  await go('+ 로그'); await ready(); await fill('input[name=title]', '사진과 저녁');
  const upload = await page.$('input[type=file]'); await upload.uploadFile(path.resolve('public/images/korean.jpg'));
  await page.waitForSelector('.photo-memo-image img'); await page.waitForFunction(() => !document.querySelector('.quick-camera-button').disabled);
  const photoBox = await page.$eval('.photo-memo', root => {
    const input = root.querySelector('textarea'), panel = root.querySelector('.photo-memo-panel');
    return { width: input.getBoundingClientRect().width, root: root.getBoundingClientRect().width, height: input.getBoundingClientRect().height, border: getComputedStyle(panel).borderWidth };
  });
  assert(photoBox.root - photoBox.width <= 25); assert(photoBox.height >= 200); assert.equal(photoBox.border, '0px');
  await fill('textarea', '선선한 저녁에 오래 기억하고 싶은 한 끼.');
  await page.evaluate(() => window.scrollTo(0, 0)); await delay(100); assert((await fits('.quick-save')).visible);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); await delay(150); assert((await fits('.quick-save')).visible);
  assert.equal(await page.$eval('.photo-memo', e => e.dataset.memoDock), 'settled');
  await page.screenshot({ path: folder + '/photo-docked.png' });
  await saveCategory('미식');
  const photoItem = (await until(records, rows => rows.length === 2, 'photo log')).find(item => item.title === '사진과 저녁'); assert(photoItem.hasPhoto);
  pass('photo composer keeps a generous full-width textarea, scroll docking and continuously reachable save');

  const cinema = await create('어제의 영화', '영화');
  const place = await create('주말의 공간', '장소');
  await create('커피 노트', '미식'); await create('혼자 걷기');
  await go('로그북'); await page.waitForSelector('.logbook-row');
  const toolbar = await page.$eval('.logbook-toolbar', e => ({ filter: e.querySelector('.logbook-filter').getBoundingClientRect().left, search: e.querySelector('.logbook-search').getBoundingClientRect().left }));
  assert(toolbar.filter < toolbar.search);
  await page.evaluate(() => window.scrollTo(0, 380)); await delay(100);
  assert(Math.abs((await page.$eval('.logbook-toolbar', e => e.getBoundingClientRect().top)) - 8) < 2);
  await aria('분류 필터'); await click('영화', '.logbook-filter-options');
  assert.equal(await page.$$eval('.logbook-row', e => e.length), 1);
  await aria('분류 필터'); await click('전체', '.logbook-filter-options');
  await fill('.logbook-search input', '영화'); assert.equal(await page.$$eval('.logbook-row', e => e.length), 1); await fill('.logbook-search input', '');
  await aria('카드 보기'); await page.waitForSelector('.logbook-poster');
  for (const size of [{ width: 320, height: 568 }, { width: 487, height: 956 }]) {
    await page.setViewport(size); await delay(130);
    const columns = await page.$eval('.logbook-posters', e => getComputedStyle(e).gridTemplateColumns.split(' ').length); assert.equal(columns, 2);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  }
  const poster = await canvas(`#record-${photoItem.id} [data-card-capture]`);
  await page.click(`#record-${photoItem.id}`); await page.waitForSelector('.record-card');
  assert.deepEqual(await canvas(), poster);
  pass('sticky filter/search toolbar, category/search, 2-column cards and exact poster/detail correspondence');

  for (const size of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 390, height: 844 }, { width: 487, height: 956 }, { width: 1280, height: 800 }]) {
    await page.setViewport(size); await delay(160); const box = await fits('.record-card-actions'); assert(box.visible, JSON.stringify(box)); assert(box.page <= box.h + 1);
    const preview = await fits('.fit-card-artwork'); assert(preview.visible, JSON.stringify(preview));
  }
  await page.setViewport({ width: 390, height: 844 });
  await page.waitForFunction(() => !document.querySelector('.record-card-save').disabled, { timeout: 45000 }); await click('카드 저장');
  await page.waitForFunction(() => window.__downloads.length > 0);
  const dimensions = await page.evaluate(async () => { const blob = await (await fetch(window.__downloads.at(-1))).blob(); const image = await createImageBitmap(blob); return { width: image.width, height: image.height }; });
  assert.deepEqual(dimensions, { width: 1260, height: 1680 });
  await page.evaluate(() => { window.__shares = 0; navigator.canShare = () => true; navigator.share = async () => { window.__shares++; throw new DOMException('canceled', 'AbortError'); }; });
  await click('공유하기'); assert.equal(await page.evaluate(() => window.__shares), 1); assert.equal(await page.$('.test-toast.error'), null);
  pass('card and actions fit 5 viewports; canonical PNG output and native share cancellation');

  await go('로그북'); await page.waitForSelector('.logbook-row');
  const target = await page.$(`#record-${place.id}`); await target.scrollIntoView(); const r = await target.boundingBox();
  await page.mouse.move(r.x + r.width * .7, r.y + r.height * .5); await page.mouse.down(); await page.mouse.move(r.x + r.width * .7 - 90, r.y + r.height * .5, { steps: 12 }); await page.mouse.up(); await delay(280);
  const revealed = await page.$eval(`#record-${place.id}`, e => getComputedStyle(e.parentElement).transform); assert(revealed.includes('-88'));
  await aria(`${place.title} 삭제`); await until(records, rows => !rows.some(item => item.id === place.id), 'swipe delete');
  await click('실행 취소', '.test-toast'); await until(records, rows => rows.some(item => item.id === place.id), 'undo');
  pass('left swipe reveals delete without opening card; durable delete and undo');

  await click('모음 만들기'); await page.click(`#record-${first.id}`); await page.click(`#record-${photoItem.id}`); await page.click(`#record-${cinema.id}`);
  await click('다음 · 3'); await page.waitForSelector('#group-name'); await fill('#group-name', '연남동 맛집 리스트 3'); await click('그룹 저장');
  const group = (await until(records, rows => rows.some(item => item.cat === 'GROUP'), 'group')).find(item => item.cat === 'GROUP');
  assert.equal(group.memberIds.length, 3); assert.equal(group.cardAppearance.slot.layout, 'curation');
  assert.equal(await page.$eval(`#record-${group.id} .logbook-number`, e => e.textContent), '그룹');
  await aria('분류 필터'); await click('그룹', '.logbook-filter-options'); assert.equal(await page.$$eval('.logbook-row', e => e.length), 1);
  await page.click(`#record-${group.id}`); await page.waitForSelector('.record-card');
  const groupCanvas = await canvas(); for (const title of ['수정한 일상', '사진과 저녁', '어제의 영화']) assert(groupCanvas.text.includes(title));
  await click('담긴 로그 3개'); await page.waitForSelector('.group-members-list'); assert.equal(await page.$$eval('.group-members-list button', e => e.length), 3); await page.keyboard.press('Escape');
  await click('내용 수정'); await page.waitForSelector('.group-editor'); await fill('#edit-group-name', '나의 세 순간'); await click('그룹 저장 · 3개', '.group-editor');
  await page.waitForFunction(() => !document.querySelector('.group-editor')); await until(records, rows => rows.some(item => item.id === group.id && item.title === '나의 세 순간'), 'group edit');
  await page.reload({ waitUntil: 'networkidle2' }); await ready(); await open(group); assert((await canvas()).text.includes('나의 세 순간'));
  pass('named group is a durable logbook entry with category/badge, all members, sheet edit and reload');

  await go('스튜디오'); await page.waitForSelector('.preset-studio');
  await click('세부사항', '.preset-tabs');
  for (const size of [{ width: 320, height: 568 }, { width: 375, height: 667 }, { width: 487, height: 956 }, { width: 1280, height: 800 }]) {
    await page.setViewport(size); await delay(160); const box = await fits('.preset-footer'); assert(box.visible, JSON.stringify(box)); assert(box.page <= box.h + 1); assert((await fits('.fit-card-artwork')).visible);
  }
  await page.setViewport({ width: 390, height: 844 });
  const beforePresets = await prefs(); await aria('새 프리셋 추가'); await fill('#preset-name', '나의 밤');
  await aria('다음 디자인'); await click('색상', '.preset-tabs'); await aria('다음 팔레트');
  await click('세부사항', '.preset-tabs'); await click('1:1', '.preset-ratios');
  await page.click('.preset-toggles input[name=showDecorations]');
  assert.deepEqual((await prefs()).presetSlots, beforePresets.presetSlots);
  assert.equal((await prefs()).defaultPresetId, beforePresets.defaultPresetId);
  await page.screenshot({ path: folder + '/studio-draft.png' });
  await click('기본 프리셋 지정');
  await page.waitForSelector('.preset-default-scopes'); await click('전체 기본', '.preset-default-scopes');
  const savedPrefs = await until(prefs, value => value.presetSlots.some(slot => slot.name === '나의 밤'), 'immediate default preset save');
  const custom = savedPrefs.presetSlots.find(slot => slot.name === '나의 밤'); assert.equal(savedPrefs.defaultPresetId, custom.id);
  assert.equal(custom.showDecorations,false);
  assert.equal(await page.$eval('.preset-rail .is-default span', e => e.textContent), '나의 밤');
  assert.equal(savedPrefs.presetSlots[0].id, custom.id);
  assert.equal(await page.$eval('.preset-rail button:first-child', e=>e.classList.contains('is-default')),true);
  assert.equal(await page.$eval('.preset-save',e=>e.disabled),true);
  const snapshotBefore = (await records()).find(item => item.id === photoItem.id).cardAppearance;
  assert.deepEqual(snapshotBefore, photoItem.cardAppearance);
  await page.reload({ waitUntil: 'networkidle2' }); await ready(); await go('스튜디오'); await page.waitForSelector('#preset-name');
  assert.equal(await page.$eval('#preset-name', e => e.value), '나의 밤');
  await click('세부사항','.preset-tabs'); assert.equal(await page.$eval('input[name=showDecorations]',e=>e.checked),false);
  pass('compact studio fits 4 viewports; draft isolation, immediate default save, first orange chip and reload persistence');

  const withDefault = await create('새 기본 카드', '기타'); assert.equal(withDefault.cardAppearance.slot.id, custom.id); assert.equal(withDefault.cardAppearance.slot.ratio, '1:1');
  await open(photoItem); await click('나의 밤', '.record-preset-picker');
  const applied = (await until(records, rows => rows.find(item => item.id === photoItem.id).cardAppearance.slot.id === custom.id, 'apply preset')).find(item => item.id === photoItem.id);
  assert.equal(applied.cardAppearance.slot.ratio, '1:1'); assert.deepEqual((await prefs()).presetSlots, savedPrefs.presetSlots);
  assert.equal(applied.cardAppearance.slot.showDecorations,false);assert.equal(await page.$('.record-card [data-card-decoration]'),null);
  assert.deepEqual((await records()).find(item => item.id === first.id).cardAppearance, first.cardAppearance);
  await page.waitForFunction(() => !document.querySelector('.record-card-save').disabled, { timeout: 45000 }); await click('카드 저장');
  const square = await page.evaluate(async () => { const image = await createImageBitmap(await (await fetch(window.__downloads.at(-1))).blob()); return [image.width, image.height]; }); assert.deepEqual(square, [1260, 1260]);
  pass('new logs use saved default; applying a preset only changes the chosen card; square PNG remains canonical');

  await go('스튜디오'); await page.waitForSelector('.preset-studio'); await click('디자인', '.preset-tabs'); await page.click('.preset-current'); await page.waitForSelector('.preset-layout-picker'); assert((await page.$$('.preset-layout-picker button')).length >= 4); await page.keyboard.press('Escape');
  await click('색상', '.preset-tabs'); await click('분위기로 팔레트 만들기'); await page.waitForSelector('.preset-generate-form input');
  await fill('.preset-generate-form input', '이른 아침의 미술관'); await click('팔레트 만들기', '.preset-generate-form'); await page.waitForFunction(() => !document.querySelector('.preset-generate-form'), { timeout: 30000 });
  const oldSkin = (await prefs()).presetSlots.find(slot => slot.id === custom.id).skinId;
  const draftSkin = await page.$eval('.preset-preview [data-card-capture]', e => e.style.getPropertyValue('--card-bg').trim()); assert(draftSkin);
  assert.equal((await prefs()).presetSlots.find(slot => slot.id === custom.id).skinId, oldSkin);
  await click('프리셋 저장'); await until(prefs, value => value.presetSlots.find(slot => slot.id === custom.id).skinId !== oldSkin, 'generated palette saved');
  pass('design picker and generated mood palette change the draft until explicitly saved');

  // Reload from IndexedDB with all API traffic unavailable, then reconnect.
  await page.setRequestInterception(true); let offline = true;
  page.on('request', request => { if (offline && new URL(request.url()).pathname.startsWith('/api/')) void request.abort('internetdisconnected'); else void request.continue(); });
  await page.reload({ waitUntil: 'networkidle2' }); await ready(); await go('로그북'); await page.waitForSelector(`#record-${group.id}`);
  assert.equal(await page.$eval(`#record-${group.id} .logbook-number`, e => e.textContent), '그룹');
  await open(photoItem); assert.equal((await canvas()).ratio, '1:1');
  offline = false; await page.evaluate(() => window.dispatchEvent(new Event('online')));
  await go('로그북'); await aria('나의 세 순간 삭제 메뉴'); await aria('나의 세 순간 삭제');
  await until(records, rows => !rows.some(item => item.id === group.id), 'delete group');
  const retained = await records(); for (const id of group.memberIds) assert(retained.some(item => item.id === id));
  pass('offline document reload retains groups and card presets; deleting a group retains member logs');
  assert.deepEqual(errors, []);
  const final = { passed: true, checks, errors }; fs.writeFileSync(folder + '/workflow-results.json', JSON.stringify(final, null, 2));
  console.log(`All ${checks.length} workflow checks passed.`);
} catch (error) {
  console.error(error); console.log({ errors, checks }); await page.screenshot({ path: folder + '/workflow-failure.png', fullPage: true }).catch(() => {}); process.exitCode = 1;
} finally {
  // This temporary profile owns its records; never enumerate another user's data.
  await page.evaluate(async () => { const data = await (await fetch('/api/logs')).json(); for (const item of data.archives || []) await fetch('/api/logs?id=' + item.id, { method: 'DELETE' }); }).catch(() => {});
  await browser.close();
}
