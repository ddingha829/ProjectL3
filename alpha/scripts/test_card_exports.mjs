import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import puppeteer from 'puppeteer-core';
const require=createRequire(import.meta.url),ts=require('typescript'),cache=new Map(),root=process.cwd();
function load(file){if(cache.has(file))return cache.get(file).exports;const m={exports:{}};cache.set(file,m);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(name=>name.startsWith('@/')?load(path.join(root,'src',name.slice(2))+'.ts'):require(name),m,m.exports);return m.exports;}
const {INITIAL_SKINS,PRESET_SLOTS}=load(path.join(root,'src/data/initialData.ts'));
const {STUDIO_PHOTO_SAMPLE,STUDIO_TEXT_SAMPLE}=load(path.join(root,'src/data/studioSamples.ts'));
const {CARD_LAYOUTS}=load(path.join(root,'src/lib/cardLayouts.ts'));
const base=process.env.L2_TEST_URL||'http://localhost:3014';assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const out=path.resolve(process.env.L2_TEST_OUTPUT_DIR||'artifacts/card-exports');fs.mkdirSync(out,{recursive:true});
const slots=CARD_LAYOUTS.map(layout=>({...PRESET_SLOTS[0],id:`qa-${layout.id}`,name:layout.name,layout:layout.id,showNumber:false}));
const archives=CARD_LAYOUTS.flatMap((layout,i)=>['3:4','1:1','9:16'].map(ratio=>({...layout.isNoPhoto?STUDIO_TEXT_SAMPLE:STUDIO_PHOTO_SAMPLE,id:crypto.randomUUID(),num:'77',cat:layout.id==='curation'?'GROUP':'OTHER',...(layout.id==='curation'?{kind:'group',memberIds:[]}:{}),cardAppearance:{slot:{...slots[i],ratio},skin:INITIAL_SKINS.paper,authorName:'나의 기록'}})));
const prefs={deviceId:crypto.randomUUID(),presetSlots:slots,skins:INITIAL_SKINS,defaultPresetId:slots[0].id};
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage(),errors=[],results=[];page.on('pageerror',error=>errors.push(error.message));await page.setBypassServiceWorker(true);await page.setViewport({width:390,height:844});
await page.evaluateOnNewDocument(()=>{localStorage.setItem('l2_first_visit_guides_v1',JSON.stringify({eligible:false,seen:{}}));localStorage.setItem('l2_pwa_banner_dismissed_v1','1');localStorage.setItem('l2_auto_place_link_on','off');window.__export=null;Object.defineProperty(navigator,'canShare',{value:()=>true});Object.defineProperty(navigator,'share',{value:async data=>{const file=data.files[0],image=await createImageBitmap(file);window.__export={width:image.width,height:image.height,bytes:file.size,type:file.type};image.close();}});});
await page.setRequestInterception(true);page.on('request',request=>new URL(request.url()).pathname.startsWith('/api/')?request.respond({status:200,contentType:'application/json',body:JSON.stringify({...prefs,archives})}):request.continue());
try{
 await page.goto(base,{waitUntil:'networkidle2'});
 const navigate=async()=>{await page.$eval('.test-header nav button:nth-child(2)',e=>e.click());await page.waitForSelector('.logbook-row');};
 for(const item of archives){await navigate();await page.$eval(`#record-${item.id}`,e=>e.click());await page.waitForSelector('.record-card-actions button:last-child:not(:disabled)',{timeout:30000});await page.evaluate(()=>{window.__export=null;});await page.click('.record-card-actions button:last-child');await page.waitForFunction(()=>window.__export);const result=await page.evaluate(()=>window.__export);assert.ok(result.width<=1080&&result.bytes<=500*1024,JSON.stringify(result));assert.equal(result.type,'image/jpeg');const expected=item.cardAppearance.slot.ratio==='1:1'?1:item.cardAppearance.slot.ratio==='3:4'?4/3:16/9;assert.ok(Math.abs(result.height/result.width-expected)<.005);assert.ok(!(await page.$eval('.record-card [data-card-preview]',e=>e.textContent)).includes('77'),'log number hidden in all designs');results.push({layout:item.cardAppearance.slot.layout,ratio:item.cardAppearance.slot.ratio,...result});}
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({results,errors,api:'intercepted local fixtures only'},null,2));console.log('PASS all 11 layouts × 3 ratios: local JPEG export ≤1080px / ≤500KB, expected aspect ratio and number toggle');
}catch(error){await page.screenshot({path:path.join(out,'failure.png')});throw error;}finally{await browser.close();}
