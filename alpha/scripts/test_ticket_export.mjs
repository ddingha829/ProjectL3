import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import puppeteer from 'puppeteer-core';
const require=createRequire(import.meta.url),ts=require('typescript'),modules=new Map();
function load(file){if(modules.has(file))return modules.get(file).exports;const m={exports:{}};modules.set(file,m);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(name=>name.startsWith('@/')?load(path.resolve('src',name.slice(2))+'.ts'):require(name),m,m.exports);return m.exports;}
const {PRESET_SLOTS,INITIAL_SKINS,INITIAL_ARCHIVES}=load(path.resolve('src/data/initialData.ts'));
const {resolveEffectiveSlot,getCardLayout}=load(path.resolve('src/lib/cardLayouts.ts'));
const {normalizePresetSlot}=load(path.resolve('src/lib/cardAppearance.ts'));
assert.deepEqual(getCardLayout('ticket').supportedRatios,['3:4','9:16']);
assert.equal(normalizePresetSlot({...PRESET_SLOTS[2],ratio:'1:1'}).ratio,'9:16');
assert.equal(resolveEffectiveSlot({hasPhoto:true,img:'poster'}, {...PRESET_SLOTS[2],ratio:'1:1'}).ratio,'9:16');
const base=process.env.L2_TEST_URL||'http://127.0.0.1:3014';assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const out=process.env.L2_TEST_OUTPUT_DIR||'artifacts/ticket-export';fs.mkdirSync(out,{recursive:true});
const poster='https://image.tmdb.org/t/p/w500/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg';
const photoBlob=await(await fetch(poster)).arrayBuffer();
const records=['9:16','3:4','1:1'].map((ratio,i)=>({...INITIAL_ARCHIVES[0],id:crypto.randomUUID(),cat:'CINEMA',title:'왕과 사는 남자',quote:'이런 부분이 재밌었구먼',note:'[TMDB 참고] 왕과 사는 남자 · 평점 7.1/10 계유정난의 소년을 뒤흔들고 어린 왕 이홍위는 왕위에서 쫓겨…',good:'',bad:'',loc:'',addressShort:'',fullAddress:'',img:poster,hasPhoto:true,score:'5.0',num:'05',cardAppearance:{slot:{...PRESET_SLOTS[2],layout:i===2?'cover':'ticket',ratio},skin:INITIAL_SKINS.oat,authorName:'준혁'}}));
const prefs={deviceId:crypto.randomUUID(),presetSlots:PRESET_SLOTS,skins:INITIAL_SKINS,defaultPresetId:'01',archives:records};
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const checks=[],errors=[];const pass=text=>{checks.push(text);console.log('PASS '+text);};
async function makePage(webkit=false,fail=false){
 const p=await browser.newPage();await p.setViewport({width:390,height:844});await p.setBypassServiceWorker(true);p.on('pageerror',e=>errors.push(e.message));
 if(webkit)await p.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1');
 await p.evaluateOnNewDocument(()=>{localStorage.setItem('l2_first_visit_guides_v1',JSON.stringify({eligible:false,seen:{}}));localStorage.setItem('l2_pwa_banner_dismissed_v1','1');localStorage.setItem('l2_auto_place_link_on','off');window.__export=null;Object.defineProperty(navigator,'canShare',{value:()=>true});Object.defineProperty(navigator,'share',{value:async data=>{const file=data.files[0];window.__export=await new Promise(resolve=>{const r=new FileReader();r.onload=()=>resolve({url:r.result,type:file.type,bytes:file.size});r.readAsDataURL(file);});}});});
 const state={fail};await p.setRequestInterception(true);p.on('request',r=>{
  const url=new URL(r.url());if(url.pathname.startsWith('/api/'))return r.respond({status:200,contentType:'application/json',body:JSON.stringify(prefs)});
  if(r.url()===poster)return r.respond(state.fail&&r.resourceType()==='fetch'?{status:503,headers:{'Access-Control-Allow-Origin':'*'},body:'unavailable'}:{status:200,contentType:'image/jpeg',headers:{'Access-Control-Allow-Origin':'*','Cache-Control':'public,max-age=3600'},body:Buffer.from(photoBlob)});
  return r.continue();
 });
 await p.goto(base,{waitUntil:'networkidle2'});return {p,state};
}
async function open(p,index){await p.$eval('.test-header nav button:nth-child(2)',e=>e.click());await p.waitForSelector('.logbook-row');await p.$eval('#record-'+records[index].id,e=>e.click());await p.waitForSelector('.record-card-stage [data-card-capture]');}
async function exportCard(p){await p.waitForSelector('.record-card-actions button:last-child:not(:disabled)',{timeout:30000});await p.evaluate(()=>{window.__export=null;});await p.click('.record-card-actions button:last-child');await p.waitForFunction(()=>window.__export);return p.evaluate(()=>window.__export);}
async function photoPixels(p,result,layout){return p.evaluate(async(result,layout)=>{
 const frame=document.querySelector('.record-card-stage [data-card-capture]'),img=frame.querySelector('img'),photo=img.parentElement;
 const b=frame.getBoundingClientRect(),r=photo.getBoundingClientRect(),logical=420/b.width;
 const image=new Image();image.src=result.url;await image.decode();const canvas=document.createElement('canvas');canvas.width=image.width;canvas.height=image.height;const context=canvas.getContext('2d');context.drawImage(image,0,0);
 const reference=new Image();reference.crossOrigin='anonymous';reference.src=img.currentSrc;await reference.decode();const ref=document.createElement('canvas');ref.width=reference.width;ref.height=reference.height;const rc=ref.getContext('2d');rc.drawImage(reference,0,0);
 const x=(r.left-b.left)*logical,y=(r.top-b.top)*logical,w=r.width*logical,h=r.height*logical;
 const fit=layout==='ticket'?Math.min(w/reference.width,h/reference.height):Math.max(w/reference.width,h/reference.height),iw=reference.width*fit,ih=reference.height*fit,ox=x+(w-iw)/2,oy=y+(h-ih)/2;
 let diff=0,n=0;for(let row=1;row<9;row++)for(let col=1;col<9;col++){
  const dx=x+w*col/10,dy=y+h*row/10,sx=(dx-ox)/fit,sy=(dy-oy)/fit;
  if(sx<0||sy<0||sx>=reference.width||sy>=reference.height)continue;
  const a=context.getImageData(Math.round(dx*image.width/420),Math.round(dy*image.width/420),1,1).data,e=rc.getImageData(Math.round(sx),Math.round(sy),1,1).data;
  diff+=Math.abs(a[0]-e[0])+Math.abs(a[1]-e[1])+Math.abs(a[2]-e[2]);n+=3;
 }
 const foot=frame.querySelector('[data-card-imprint]').parentElement.getBoundingClientRect(),content=photo.nextElementSibling.getBoundingClientRect();
 return {error:diff/n,samples:n/3,width:image.width,height:image.height,photoHeight:h,footerGap:(foot.top-content.bottom)*logical,fit:getComputedStyle(img).objectFit,liveSource:img.src,remainingSnapshots:document.querySelectorAll('body>div[inert][aria-hidden=true]').length};
 },result,layout);}
try{
 for(const webkit of [false,true]){
  const {p}=await makePage(webkit);
  for(let i=0;i<records.length;i++){
   await open(p,i);const result=await exportCard(p),layout=i===2?'cover':'ticket';const check=await photoPixels(p,result,layout);
   assert.ok(check.samples>=20&&check.error<(layout==='cover'?55:30),JSON.stringify({webkit,i,...check}));assert.ok(check.width<=1080&&result.bytes<=500*1024);assert.equal(result.type,'image/png');assert.equal(check.liveSource,poster,'live preview source unchanged');assert.equal(check.remainingSnapshots,0,'temporary capture removed');
   if(layout==='ticket'){assert.ok(check.photoHeight>(i===0?350:200),JSON.stringify(check));assert.ok(check.footerGap<20);assert.equal(check.fit,'contain');await p.click('.record-design-tools .preset-tabs button:nth-child(3)');await p.waitForSelector('.preset-ratios');assert.equal(await p.$$eval('.preset-ratios button',els=>els.find(e=>e.textContent==='1:1').disabled),true);await p.keyboard.press('Escape');}
   fs.writeFileSync(path.join(out,`${layout}-${i}-${webkit?'warmup':'standard'}.png`),Buffer.from(result.url.split(',')[1],'base64'));await p.screenshot({path:path.join(out,`${layout}-${i}-${webkit?'warmup':'standard'}.png`)});
   pass(`${webkit?'WebKit warm-up branch (Chrome UA simulation)':'Chrome'} ${layout} ${records[i].cardAppearance.slot.ratio}: poster pixels present, error ${check.error.toFixed(1)}, photo ${check.photoHeight.toFixed(0)}px, ≤1080px / ≤500KiB`);
  }
  await p.close();
 }
 const {p,state}=await makePage(false,true);await open(p,0);await p.waitForSelector('.record-card-error',{timeout:30000});assert.equal(await p.$eval('.record-card-actions button:last-child',e=>e.disabled),true);assert.equal(await p.$eval('.record-card-stage img',e=>e.naturalWidth>0),true);state.fail=false;await p.click('.record-card-error button');const retried=await exportCard(p);assert.ok((await photoPixels(p,retried,'ticket')).error<30);await p.close();pass('visible poster + failed export fetch reports an error, never a blank success; retry embeds and restores sharing');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({checks,errors,scope:'isolated API fixtures; cached real TMDB poster bytes; WebKit code branch simulated in Chrome, not an actual Safari device'},null,2));
}finally{await browser.close();}
