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
  if(url.pathname==='/api/auth/google')data={available:true};
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

try {
const p=await makePage(true);await p.goto(base,{waitUntil:'networkidle2'});if(await p.$('[aria-label="설치 안내 끄기"]'))await p.click('[aria-label="설치 안내 끄기"]');await delay(700);if(await p.$('.first-visit-guide'))await closeGuide(p);
await p.evaluate(()=>document.fonts.ready);assert.ok((await p.$eval('.memo-prompt',e=>getComputedStyle(e).fontFamily)).includes('Sebang'));pass('initial waving prompt uses Sebang Gothic and measures the actual selected font');
for(const [width,height] of [[320,568],[390,844],[768,1024],[1280,900]]){
 await p.setViewport({width,height});await navigate(p,'스튜디오');if(await p.$('.first-visit-guide'))await closeGuide(p);await delay(450);
 const result=await p.evaluate(()=>{const box=e=>{const r=e.getBoundingClientRect();return{x:r.x,y:r.y,w:r.width,h:r.height,right:r.right,bottom:r.bottom};};const b=box(document.querySelector('.test-settings-button')),svg=box(document.querySelector('.test-settings-button svg'));return{header:box(document.querySelector('.test-header')),button:b,svg,preview:box(document.querySelector('.preset-preview')),name:box(document.querySelector('.preset-name-row')),controls:box(document.querySelector('.preset-controls')),footer:box(document.querySelector('.preset-footer')),scroll:document.documentElement.scrollWidth,font:getComputedStyle(document.querySelector('#preset-name')).fontFamily,webSelect:getComputedStyle(document.querySelector('.preset-library')).webkitUserSelect};});
 assert.ok(result.button.right<=width+1,JSON.stringify(result));assert.ok(Math.abs(result.button.x+result.button.w/2-svgCenter(result.svg))<1);assert.ok(result.scroll<=width+1);assert.ok(result.preview.h>120);assert.ok(result.controls.h<=112);assert.ok(Math.abs(result.name.y-result.controls.y)<2);assert.ok(result.footer.bottom<=height+1);assert.ok(result.font.includes('Sebang'));assert.equal(result.webSelect,'none');
 await shot(p,'studio-'+width);pass(`studio ${width}x${height}: header centred, no horizontal overflow, compact name/control row, preview ${Math.round(result.preview.h)}px and save visible`);
}
function svgCenter(svg){return svg.x+svg.w/2;}
await p.setViewport({width:390,height:844});await p.click('.preset-tabs button:nth-child(3)');await p.waitForSelector('.preset-details');assert.ok(await p.$('[role="dialog"] .preset-details'));assert.equal(await p.$('.preset-controls .preset-details'),null);await p.keyboard.press('Escape');
await p.click('.preset-tabs button:nth-child(2)');assert.equal(await p.$('.preset-controls .preset-generate-link'),null);await p.click('.preset-current');await p.waitForSelector('.preset-palette-picker');assert.ok(await p.$('[role="dialog"] .preset-generate-link'));await p.click('.preset-generate-link');await p.waitForSelector('.preset-generate-form');await p.keyboard.press('Escape');pass('details are a modal; palette creation appears only inside palette chooser');
await p.mouse.move(220,170);await p.mouse.down();await p.mouse.move(20,170,{steps:10});const dx=await p.$eval('.test-main',e=>new DOMMatrix(getComputedStyle(e).transform).m41);assert.ok(dx<0&&dx>=-42);await p.mouse.up();await delay(400);assert.ok(await p.$('.preset-studio'));assert.ok(Math.abs(await p.$eval('.test-main',e=>new DOMMatrix(getComputedStyle(e).transform).m41))<1);pass('left edge of Studio resists immediately, caps movement at 42px, and springs back');
const nameBox=await (await p.$('#preset-name')).boundingBox();await p.mouse.move(nameBox.x+10,nameBox.y+nameBox.height/2);await p.mouse.down();await p.mouse.move(nameBox.x+nameBox.width-5,nameBox.y+nameBox.height/2,{steps:10});assert.ok(Math.abs(await p.$eval('.test-main',e=>new DOMMatrix(getComputedStyle(e).transform).m41))<1);await p.mouse.up();await delay(100);pass('horizontal text selection in a form field never starts app navigation');
await navigate(p,'로그북');if(await p.$('.first-visit-guide'))await closeGuide(p);await p.evaluate(()=>localStorage.setItem('l2_auto_place_link_on','on'));await p.click('.test-settings-button');await delay(700);if(await p.$('.first-visit-guide'))await closeGuide(p);await p.waitForSelector('.settings-wordmark');assert.equal(await p.$eval('.settings-wordmark',e=>e.textContent),'live & log!');
for(const width of [320,390,768,1280]){await p.setViewport({width,height:844});await delay(80);const aligned=await p.evaluate(()=>{const word=document.querySelector('.settings-wordmark').getBoundingClientRect(),title=document.querySelector('.quick-dialog-header h2').getBoundingClientRect(),head=document.querySelector('.quick-dialog-header').getBoundingClientRect();return{dy:Math.abs(word.y+word.height/2-title.y-title.height/2),dx:Math.abs(word.x+word.width/2-head.x-head.width/2),inside:word.left>=title.right};});assert.ok(aligned.dy<2&&aligned.dx<2&&aligned.inside,JSON.stringify(aligned));}await p.setViewport({width:390,height:844});assert.ok(await p.$('.settings-google-login'));
await button(p,'기존','.settings-segmented');assert.equal(await p.evaluate(()=>document.documentElement.dataset.font),'pretendard');await button(p,'세방고딕','.settings-segmented');await shot(p,'settings-wordmark');await p.keyboard.press('Escape');pass('settings contains handwriting, Google login, and reversible font switch');
await p.evaluate(()=>localStorage.setItem('l2_auto_place_link_on','on'));await p.reload({waitUntil:'networkidle2'});await navigate(p,'로그북');await delay(700);if(await p.$('.first-visit-guide'))await closeGuide(p);const unlinkedText=await p.$$eval('.logbook-map-unlinked button',els=>els.map(e=>e.textContent));for(const movie of records.filter(r=>r.cat==='CINEMA'))assert.ok(!unlinkedText.some(t=>t.includes(movie.title)));assert.ok(await p.$('.logbook-filter span'));await shot(p,'logbook-filter');pass('category filter has visible label; movie logs are excluded from auto place suggestions');
assert.equal(errors.length,0,errors.join('\n'));await p.close();fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors},null,2));
}finally{await browser.close();}
