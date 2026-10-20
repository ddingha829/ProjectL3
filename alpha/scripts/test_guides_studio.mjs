import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import puppeteer from 'puppeteer-core';

const require=createRequire(import.meta.url),ts=require('typescript'),modules=new Map(),root=process.cwd();
function load(file){if(modules.has(file))return modules.get(file).exports;const m={exports:{}};modules.set(file,m);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(name=>name.startsWith('@/')?load(path.join(root,'src',name.slice(2))+'.ts'):require(name),m,m.exports);return m.exports;}
const {INITIAL_SKINS,PRESET_SLOTS,INITIAL_ARCHIVES}=load(path.join(root,'src/data/initialData.ts'));
const {skinContrast}=load(path.join(root,'src/lib/skinValidation.ts'));
const {cardShareData,googleMapShareUrl}=load(path.join(root,'src/lib/cardShare.ts'));
const out=path.resolve(process.env.L2_TEST_OUTPUT_DIR||'artifacts/guides-studio');fs.mkdirSync(out,{recursive:true});
const base=process.env.L2_TEST_URL||'http://localhost:3013';
const browser=await puppeteer.launch({executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const checks=[],errors=[],calls=[];const delay=ms=>new Promise(r=>setTimeout(r,ms));const pass=text=>{checks.push(text);console.log('PASS '+text);};
const prefs={deviceId:randomUUID(),username:null,recoveryCode:'L2-MOCK-MOCK',authorName:'테스트',presetSlots:structuredClone(PRESET_SLOTS),skins:structuredClone(INITIAL_SKINS),defaultPresetId:PRESET_SLOTS[0].id,aiUsage:{used:0,limit:20}};
const records=INITIAL_ARCHIVES.slice(0,3).map((item,i)=>({...item,id:randomUUID(),timestamp:Date.now()-i*100000,img:i===2?'':item.img,hasPhoto:i!==2,cardAppearance:{slot:PRESET_SLOTS[0],skin:INITIAL_SKINS.signal,authorName:'테스트'}}));
records[0].link='https://www.google.com/maps/search/?api=1&query=cafe&query_place_id=fixture';records[0].coordinates={lat:37.56,lng:126.98};records[1].link='';records[1].coordinates=null;
const original=JSON.stringify(records);
async function makePage(existing=false){
 const p=await browser.newPage();await p.setViewport({width:390,height:844,deviceScaleFactor:1.5});await p.setBypassServiceWorker(true);p.on('pageerror',e=>errors.push(e.message));
 await p.evaluateOnNewDocument((existing,profile)=>{localStorage.setItem('l2_auto_place_link_on','off');if(existing&&!localStorage.getItem('l2_test_preferences_v2'))localStorage.setItem('l2_test_preferences_v2',JSON.stringify(profile));},existing,prefs);
 await p.evaluateOnNewDocument(()=>{window.__shares=[];Object.defineProperty(navigator,'canShare',{configurable:true,value:data=>!!data.files?.length});Object.defineProperty(navigator,'share',{configurable:true,value:async data=>{const file=data.files[0],view=await createImageBitmap(file);window.__shares.push({keys:Object.keys(data),text:data.text,title:data.title,url:data.url,files:data.files.length,width:view.width,height:view.height,bytes:file.size,type:file.type});}});});
 await p.setRequestInterception(true);p.on('request',async r=>{
  const url=new URL(r.url());if(!url.pathname.startsWith('/api/'))return r.continue();calls.push({url:url.pathname,method:r.method()});
  let data={...prefs,archives:records};
  if(url.pathname==='/api/presets'&&r.method()==='POST'){const update=JSON.parse(r.postData());for(const key of ['presetSlots','skins','authorName','defaultPresetId'])if(update[key]!==undefined)prefs[key]=update[key];data=prefs;}
  if(url.pathname==='/api/ai/skin'){const skin={...INITIAL_SKINS.mist,id:'ai-fixture',name:'SOFT SEA'};data={skin,provider:'FIXTURE'};}
  if(url.pathname.startsWith('/api/places'))data={results:[]};
  await r.respond({status:200,contentType:'application/json',body:JSON.stringify(data)});
 });
 return p;
}
async function button(p,text,scope='body'){for(const e of await p.$$(scope+' button'))if(await e.evaluate((el,t)=>el.getClientRects().length&&el.textContent.trim()===t,text)){await e.click();return;}throw Error('Button missing '+text);}
async function guide(p){await p.waitForSelector('.first-visit-guide');await p.waitForFunction(()=>document.querySelector('.first-guide-highlight')?.offsetWidth>0);}
async function closeGuide(p){await button(p,'건너뛰기','.first-guide-footer');await p.waitForFunction(()=>!document.querySelector('.first-visit-guide'));await delay(100);}
async function navigate(p,text){await button(p,text,'.test-header nav');await delay(600);}
async function shot(p,name){await p.evaluate(()=>document.fonts.ready);await p.screenshot({path:path.join(out,name+'.png')});}
async function bounds(p){return p.evaluate(()=>[...document.querySelectorAll('.first-guide-label')].map(e=>{const r=e.getBoundingClientRect();return{left:r.left,top:r.top,right:r.right,bottom:r.bottom};}));}
try{
 const sample=new File(['fixture'],'card.png',{type:'image/png'});
 assert.deepEqual(Object.keys(cardShareData({link:'',coordinates:null},sample)),['files']);
 assert.equal(cardShareData(records[0],sample).text,records[0].link);
 for(const link of ['https://google.com.evil.example/maps/place/test','https://example.com/maps','javascript:alert(1)','https://www.google.com/search?q=cafe'])assert.equal(googleMapShareUrl({link,coordinates:null}),null);
 assert.equal(googleMapShareUrl({link:'https://maps.app.goo.gl/fixture',coordinates:null}),'https://maps.app.goo.gl/fixture');
 assert.ok(googleMapShareUrl({link:'',coordinates:{lat:37.56,lng:126.98}}).includes('37.56%2C126.98'));
 assert.equal(googleMapShareUrl({link:'',coordinates:{lat:91,lng:126.98}}),null);pass('share data contains only the image and an optional real Google Maps URL; rejects unrelated URLs and invalid coordinates');
 const p=await makePage();await p.goto(base,{waitUntil:'networkidle2'});await p.waitForSelector('[aria-label="홈 화면에 앱 설치 안내"]');
 assert.equal(await p.$('.first-visit-guide'),null,'installation remains first');
 await p.click('[aria-label="설치 안내 끄기"]');await p.waitForFunction(()=>!document.querySelector('.pwa-top-popup'));await guide(p);
 assert.equal(await p.$$eval('.first-guide-highlight',els=>els.length),1);assert.equal(await p.$('svg.first-guide-lines'),null);
 assert.equal(await p.$eval('.test-shell',e=>e.inert),true);await shot(p,'first-log-guide');
 await p.mouse.click(5,400);await p.waitForFunction(()=>document.querySelector('.first-guide-label')?.textContent.includes('2 / 6'));assert.ok(await p.$('.first-visit-guide'));for(let i=0;i<5;i++){await p.mouse.click(5,400);await delay(50);}await p.waitForFunction(()=>!document.querySelector('.first-visit-guide'));
 assert.equal(await p.$eval('input[name=title]',e=>e.value),'');assert.equal(await p.$eval('.test-shell',e=>e.inert),false);
 await p.reload({waitUntil:'networkidle2'});await delay(700);assert.equal(await p.$('.first-visit-guide'),null);pass('first-time guide waits for installation, uses a real target highlight, each tap advances and the final tap dismisses without click-through and survives reload');

 await navigate(p,'로그북');await guide(p);await shot(p,'logbook-menu-guide');for(let i=0;i<4;i++){await button(p,'다음','.first-guide-footer');await delay(50);};await delay(80);await shot(p,'logbook-search-guide');await closeGuide(p);
 await p.click('.logbook-row');await guide(p);await shot(p,'card-guide');assert.equal(await p.$('.record-nophoto-tabs'),null);await p.keyboard.press('Escape');await p.waitForFunction(()=>!document.querySelector('.first-visit-guide'));pass('logbook and card guides, optional guide sections and keyboard dismissal');
 if(await p.$eval('.record-editor-handle',e=>e.getAttribute('aria-expanded')==='false'))await p.click('.record-editor-handle');await p.click('.record-preset-controls .preset-library-open');await p.waitForSelector('.preset-collection-grid');
 assert.equal(await p.$('.preset-organize'),null);assert.equal(await p.$('.preset-create-open'),null);
 await p.$eval('.quick-dialog-panel',e=>{e.scrollTop=e.scrollHeight;});await delay(100);assert.ok(await p.$('.record-card'));await p.keyboard.press('Escape');pass('card presets open a thumbnail collection; scrolling the sheet never navigates the app and offers no preset-management controls');
 if(await p.$eval('.record-editor-handle',e=>e.getAttribute('aria-expanded')==='false'))await p.click('.record-editor-handle');await p.click('.record-preset-controls .preset-library-open');await p.waitForSelector('.preset-collection-grid');await p.click('.preset-collection-card[data-preset-id="02"]');
 await p.waitForSelector('.record-card-actions button:last-child:not(:disabled)',{timeout:30000});await button(p,'공유하기','.record-card-actions');
 await p.waitForFunction(()=>window.__shares.length>=1);const mapped=await p.evaluate(()=>window.__shares.at(-1));assert.deepEqual(mapped.keys,['files','text']);assert.equal(mapped.text,records[0].link);assert.equal(mapped.files,1);assert.ok(mapped.width<=1080&&mapped.bytes<=500*1024);assert.equal(mapped.type,'image/png');assert.equal(mapped.width,mapped.height,'export must use the new square preset, never the outgoing portrait card');
 await navigate(p,'로그북');await p.$$eval('.logbook-row',els=>els[1].click());await delay(600);await p.click('.record-editor-handle');await p.waitForSelector('.record-card-actions button:last-child:not(:disabled)',{timeout:30000});await button(p,'공유하기','.record-card-actions');
 await p.waitForFunction(()=>window.__shares.length>=2);const imageOnly=await p.evaluate(()=>window.__shares.at(-1));assert.deepEqual(imageOnly.keys,['files']);assert.equal(imageOnly.files,1);pass('actual native-share invocation: Google-linked card adds only map URL, unlinked card has only the image; export uses current preset');

 await navigate(p,'스튜디오');await guide(p);await shot(p,'studio-library-guide');for(let i=0;i<5;i++){await button(p,'다음','.first-guide-footer');await delay(50);};await delay(80);await shot(p,'studio-controls-guide');await closeGuide(p);
 assert.equal(await p.$eval('.preset-library-open .preset-selector-copy small',e=>e.textContent),'편집할 프리셋');assert.equal(await p.$eval('.preset-name-field label',e=>getComputedStyle(e).display),'block');
 assert.ok((await p.$eval('.preset-preview',e=>e.textContent)).includes('오후의 한 잔'));
 await p.waitForFunction(()=>[...document.querySelectorAll('.preset-preview img')].some(e=>e.complete&&e.naturalWidth>0));
 await shot(p,'studio-photo');
 await p.click('button[aria-label="글 예시"]');await delay(650);assert.ok((await p.$eval('.preset-preview',e=>e.textContent)).includes('천천히 걸은 저녁'));assert.equal(await p.$$eval('.preset-preview .fit-card-artwork img',els=>els.length),0);await shot(p,'studio-text');
 await p.click('.preset-current');await p.waitForSelector('.preset-layout-picker');assert.equal(await p.$$eval('.preset-layout-picker button',els=>els.length),7);await p.click('button[aria-label="추가 정보 닫기"]');
 await p.click('button[aria-label="사진 예시"]');await delay(600);await p.click('.preset-current');await p.waitForSelector('.preset-layout-picker');assert.equal(await p.$$eval('.preset-layout-picker button',els=>els.length),12);await button(p,'RECEIPT비스트로 감열 영수증','.preset-layout-picker');await delay(650);await shot(p,'studio-receipt');pass('separate preset library and visible name, coherent fictional photo/text samples, twelve normal photo designs, seven text designs and a separate group-only LIST');

 await button(p,'색상','.preset-tabs');await p.click('.preset-current');await p.waitForSelector('.preset-palette-picker');
 for(const id of ['oat','mist','rose','lilac']){assert.ok((await p.$eval('.preset-palette-picker',e=>e.textContent)).includes(INITIAL_SKINS[id].name));assert.ok(skinContrast(INITIAL_SKINS[id].text,INITIAL_SKINS[id].bg)>=4.5);}
 await shot(p,'soft-palettes');await button(p,'OAT MILK','.preset-palette-picker');await p.click('.preset-current');await p.waitForSelector('.preset-palette-picker');await p.click('button[aria-label="OAT MILK 팔레트 삭제"]');await p.keyboard.press('Escape');await delay(650);
 await p.reload({waitUntil:'networkidle2'});await navigate(p,'스튜디오');await delay(100);assert.equal(await p.$('.first-visit-guide'),null);await button(p,'색상','.preset-tabs');await p.click('.preset-current');await p.waitForSelector('.preset-palette-picker');assert.ok(!(await p.$eval('.preset-palette-picker',e=>e.textContent)).includes('OAT MILK'));assert.equal(prefs.skins.oat.hidden,true);await p.click('button[aria-label="추가 정보 닫기"]');
 await p.click('.preset-current');await p.waitForSelector('.preset-palette-picker');await button(p,'분위기로 팔레트 만들기');await p.waitForSelector('.preset-generate-form');await p.type('.preset-generate-form input','잔잔한 바다');await button(p,'팔레트 만들기','.preset-generate-form');await p.waitForFunction(()=>document.querySelector('.preset-current')?.textContent.includes('SOFT SEA'));await p.click('.preset-current');await p.waitForSelector('.preset-palette-picker');await p.click('[aria-label="SOFT SEA 팔레트 삭제"]');await p.keyboard.press('Escape');await delay(600);assert.equal(prefs.skins['ai-fixture'].hidden,true);assert.equal(JSON.stringify(records),original);pass('four readable soft palettes; bundled and generated color deletion survives reload/sync and preserves saved card snapshots');
 await p.click('.preset-current');await p.waitForSelector('.preset-palette-picker');await p.click('[aria-label="SWISS PAPER 팔레트 삭제"]');await p.keyboard.press('Escape');await p.waitForFunction(()=>document.querySelector('.preset-current')?.textContent.includes('SAGE MIST'));
 await p.click('.preset-current');await p.waitForSelector('.preset-palette-picker');
 for(const id of Object.keys(INITIAL_SKINS).filter(id=>!['oat','paper','mist'].includes(id))){await p.click(`.preset-palette-picker [aria-label="${INITIAL_SKINS[id].name} 팔레트 삭제"]`);await delay(30);}
 assert.equal(await p.$$eval('.preset-palette-item',els=>els.length),1);assert.equal(await p.$eval('.preset-palette-del',e=>e.disabled),true);await p.click('button[aria-label="추가 정보 닫기"]');await delay(450);assert.equal(prefs.skins.paper.hidden,true);assert.ok(prefs.presetSlots.every(slot=>slot.skinId==='mist'));assert.equal(JSON.stringify(records),original);pass('deleting even the fallback paper palette selects a remaining color; the final color cannot be deleted');

 for(const [width,height] of [[320,568],[390,844],[768,1024],[1280,800]]){
  await p.setViewport({width,height});await delay(180);
  const selector=await p.$eval('.preset-library-open',e=>{e.focus({preventScroll:true});const r=e.getBoundingClientRect();return{left:r.left,right:r.right};});assert.ok(selector.left>=0&&selector.right<=width+1,'collection selector stays inside viewport');
  const stage=await p.$eval('.preset-studio',e=>{const r=e.getBoundingClientRect();return{right:r.right,bottom:r.bottom,scroll:e.scrollHeight,height:e.clientHeight};});assert.ok(stage.right<=width+1&&stage.bottom<=height+1,JSON.stringify({width,height,stage}));assert.ok(stage.scroll<=stage.height+3,'Studio must fit '+JSON.stringify({width,height,stage}));
  await navigate(p,'+ 로그');const aligned=await p.evaluate(()=>{const a=document.querySelector('.test-header').getBoundingClientRect(),b=document.querySelector('.quick-input-surface').getBoundingClientRect();return Math.abs(a.x-b.x)<2&&Math.abs(a.width-b.width)<2;});assert.ok(aligned,'composer and header should share width');await shot(p,`composer-${width}`);await navigate(p,'스튜디오');
 }
 pass('Studio and main composer fit 320×568 / 390×844 / 768×1024 / 1280×800; composer width follows header');
 pass('preset collection selector remains fully visible on phone, tablet and desktop');

 await p.setViewport({width:390,height:844});await p.click('.test-settings-button');await guide(p);await shot(p,'settings-account-guide');for(let i=0;i<3;i++){await button(p,'다음','.first-guide-footer');await delay(50);};await delay(150);await shot(p,'settings-data-guide');await closeGuide(p);await p.click('button[aria-label="추가 정보 닫기"]');
 await p.click('.test-settings-button');await delay(600);assert.equal(await p.$('.first-visit-guide'),null);pass('first-time settings guide and once-only behavior');
 const existing=await makePage(true);await existing.goto(base,{waitUntil:'networkidle2'});const banner=await existing.$('[aria-label="설치 안내 끄기"]');if(banner)await banner.click();await delay(800);assert.equal(await existing.$('.first-visit-guide'),null);await existing.click('.test-settings-button');await delay(600);assert.equal(await existing.$('.first-visit-guide'),null);await button(existing,'사용 가이드 다시 보기','.modern-settings');await guide(existing);pass('existing installations are not interrupted; explicit Settings replay starts guidance');
 for(const [width,height] of [[320,568],[768,1024],[1280,800]]){await existing.setViewport({width,height});await delay(120);for(const b of await bounds(existing))assert.ok(b.left>=0&&b.top>=0&&b.right<=width+1&&b.bottom<=height+1);}
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors,api:'isolated fixtures; no live API writes or Google generation calls',calls:calls.length},null,2));
 console.log('All guide/studio checks passed.');
}catch(e){for(const p of await browser.pages())try{await p.screenshot({path:path.join(out,'failure-'+(await p.title()).replace(/[^a-z]/gi,'').slice(0,10)+'.png')});}catch{}throw e;}finally{await browser.close();}
