import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {randomUUID} from 'node:crypto';
import puppeteer from 'puppeteer-core';

const root=process.cwd(),require=createRequire(import.meta.url),ts=require('typescript'),modules=new Map();
function load(file){if(modules.has(file))return modules.get(file).exports;const module={exports:{}};modules.set(file,module);const source=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText;new Function('require','module','exports',source)(name=>name.startsWith('@/')?load(path.join(root,'src',name.slice(2))+'.ts'):require(name),module,module.exports);return module.exports;}
const {INITIAL_SKINS,INITIAL_ARCHIVES,PRESET_SLOTS}=load(path.join(root,'src/data/initialData.ts'));
const output='C:/Users/User/Documents/Codex/2026-10-16/pets-plugin-work-pets-openai-curated/outputs';fs.mkdirSync(output,{recursive:true});
const prefs={deviceId:randomUUID(),username:'feedback-test',recoveryCode:'L2-TEST-TEST',authorName:'테스트',presetSlots:PRESET_SLOTS,skins:INITIAL_SKINS,defaultPresetId:PRESET_SLOTS[0].id,aiUsage:{used:0,limit:30}};
const rows=new Map([0,1].map((n)=>{const item={...INITIAL_ARCHIVES[0],id:randomUUID(),title:`기존 로그 ${n+1}`,img:'',hasPhoto:false,timestamp:Date.now()-100000+n,cardAppearance:{slot:PRESET_SLOTS[4],skin:INITIAL_SKINS.paper,authorName:'테스트'}};return[item.id,item];}));
const api={hold:false,requests:[],waiting:[],errors:[]};
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
const page=await browser.newPage();await page.setBypassServiceWorker(true);await page.setViewport({width:390,height:844});await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'no-preference'}]);
page.on('pageerror',e=>api.errors.push(e.message));
await page.evaluateOnNewDocument(()=>{
 localStorage.setItem('l2_first_visit_guides_v1',JSON.stringify({eligible:false,seen:{}}));
 window.__feedback={haptics:[],writes:[],phases:[],failLocal:false};
 Object.defineProperty(navigator,'vibrate',{configurable:true,value:pattern=>{window.__feedback.haptics.push({pattern,time:performance.now()});return true;}});
 const put=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(value,...args){
  if(window.__feedback.failLocal&&value?.outbox?.some(op=>op.item?.title==='실패해도 남는 글'))throw new DOMException('기기 저장 공간이 부족해요.','QuotaExceededError');
  if(value?.archives){const titles=value.archives.map(item=>item.title);this.transaction.addEventListener('complete',()=>window.__feedback.writes.push({titles,time:performance.now()}),{once:true});}
  return put.call(this,value,...args);
 };
 document.addEventListener('DOMContentLoaded',()=>{let lastSaved=false,lastArrival='';new MutationObserver(()=>{
  const saved=!!document.querySelector('.quick-category-sheet [data-save-state=saved]');if(saved&&!lastSaved)window.__feedback.phases.push({type:'saved',time:performance.now()});lastSaved=saved;
  const arrival=document.querySelector('.logbook-row.just-added');if(arrival&&lastArrival!==arrival.id){lastArrival=arrival.id;window.__feedback.phases.push({type:'arrival',id:arrival.id,time:performance.now()});}
 }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['class','data-save-state']});});
});
await page.setRequestInterception(true);
page.on('request',async request=>{
 const url=new URL(request.url());if(!url.pathname.startsWith('/api/')){await request.continue();return;}
 const json=body=>request.respond({status:200,contentType:'application/json',body:JSON.stringify(body)});
 try{
  if(url.pathname==='/api/session'){await json(prefs);return;}
  if(url.pathname==='/api/presets'){await json(prefs);return;}
  if(url.pathname==='/api/logs'){
   if(['POST','PATCH'].includes(request.method())){const item=JSON.parse(request.postData());api.requests.push({method:request.method(),item});rows.set(item.id,item);const reply=()=>json({item,archives:[...rows.values()]});if(api.hold)api.waiting.push(reply);else await reply();return;}
   if(request.method()==='DELETE'){rows.delete(url.searchParams.get('id'));}
   await json({...prefs,archives:[...rows.values()]});return;
  }
  await json({results:[],googleStatus:'not_configured'});
 }catch(e){if(!page.isClosed())api.errors.push(e.message);}
});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
async function click(text,scope='body') {for(const b of await page.$$(scope+' button'))if(await b.evaluate((e,t)=>e.getClientRects().length&&(e.textContent.trim()===t||[...e.querySelectorAll('strong,span')].some(child=>child.textContent.trim()===t)),text)){await b.click();return;}throw Error('Missing '+text);}
const ready=()=>page.waitForSelector('input[name=title]:not(:disabled)');
const settled=()=>page.waitForFunction(()=>!document.querySelector('.test-main')?.getAnimations().some(a=>a.playState==='running'));
async function go(text){const toast=await page.$('.test-toast-close');if(toast)await toast.click();await click(text,'.test-header nav');await delay(360);}
async function category(text='기타',double=false){await click('로그 저장');await page.waitForSelector('.quick-category-sheet');const buttons=await page.$$('.quick-category-sheet button');for(const b of buttons)if(await b.evaluate((e,t)=>e.querySelector('strong').textContent===t,text)){await b.click({clickCount:double?2:1});return;}throw Error('category');}
const feedback=()=>page.evaluate(()=>window.__feedback);
const successes=async()=>(await feedback()).haptics.filter(e=>e.pattern===22);
async function release(){api.hold=false;for(const reply of api.waiting.splice(0))await reply();await delay(120);}
async function hasTitle(title){await page.waitForFunction(t=>[...document.querySelectorAll('.logbook-title')].some(e=>e.textContent===t),{},title);}
const checks=[];const pass=s=>{checks.push(s);console.log('PASS '+s);};
try{
 await page.goto('http://localhost:3013',{waitUntil:'networkidle2'});await ready();await page.waitForSelector('[aria-label="홈 화면에 앱 설치 안내"]');
 await page.click('button[aria-label="설치 안내 끄기"]');await page.waitForFunction(()=>!document.querySelector('[aria-label="홈 화면에 앱 설치 안내"]'));
 api.hold=true;await page.type('input[name=title]','저장되는 순간');await category('기타',true);
 await page.waitForSelector('.quick-category-sheet button[data-save-state=saved]');
 assert.equal(await page.$eval('.quick-title input',e=>e.value),'저장되는 순간');assert.equal(await page.$eval('.test-header nav button',e=>e.disabled),true);
 assert.equal(await page.evaluate(()=>localStorage.getItem('l2:quick-log:v1:new')),null);
 await page.screenshot({path:output+'/ProjectL3-save-confirmation.png'});
 await hasTitle('저장되는 순간');const created=[...rows.values()].find(e=>e.title==='저장되는 순간');
 await page.waitForFunction(id=>document.activeElement?.id===`record-${id}`,{},created.id);
 const trail=await feedback(),stored=trail.writes.find(e=>e.titles.includes('저장되는 순간')),confirmed=trail.phases.find(e=>e.type==='saved'),arrived=trail.phases.find(e=>e.type==='arrival');
 assert(stored.time<=confirmed.time&&confirmed.time<arrived.time);assert(arrived.time-confirmed.time>=170);assert.equal((await successes()).length,1);assert((await successes())[0].time>=stored.time);
 assert.equal(api.requests.filter(e=>e.item.title==='저장되는 순간').length,1);assert(api.waiting.length>0,'transition must not wait for server sync');
 assert.equal(await page.$$eval('.logbook-row:not(.just-added)',all=>all.every(e=>getComputedStyle(e).animationName==='none')),true);
 assert((await page.$eval('.swipe-log.is-arriving',e=>getComputedStyle(e).animationName)).includes('logbook-arrive'));
 await settled();await page.waitForFunction(()=>!document.querySelector('.swipe-log.is-arriving')?.getAnimations().some(a=>a.playState==='running'));
 await page.screenshot({path:output+'/ProjectL3-save-arrival.png'});await release();
 pass('durable write → one haptic/check → delayed arrival/focus; double-click is deduplicated and slow sync does not block');
 await page.click(`#record-${created.id}`);await page.waitForSelector('.test-main .record-card');await settled();await go('로그북');await page.waitForSelector('.test-main .logbook-row');assert.equal(await page.$('.logbook-row.just-added'),null);
 pass('returning from card detail does not replay arrival; older rows stay still');
 await page.click(`#record-${created.id}`);await page.waitForSelector('.test-main .record-card');await settled();assert.equal(await page.$eval('.record-card-save',e=>e.textContent.trim()),'카드 저장');assert.equal(await page.$eval('.record-card-save',e=>e.disabled),true);
 await click('INSTA','.record-preset-rail');await page.waitForFunction(()=>!document.querySelector('.record-card-save').disabled);await page.click('.record-card-save',{clickCount:2});await page.waitForSelector('.record-card-save [data-save-state=saved]');
 assert.equal(api.requests.filter(e=>e.method==='PATCH'&&e.item.id===created.id).length,1);assert.equal((await successes()).length,2);assert.equal(rows.get(created.id).cardAppearance.slot.id,PRESET_SLOTS[1].id);assert.equal(await page.$eval('.record-card-actions button:last-child',e=>e.textContent.trim()),'공유하기');
 pass('card save keeps its label, confirms success once and prevents repeated writes');
 await click('내용 수정','.record-card-actions');await page.waitForSelector('.record-editor');const beforeHaptics=(await successes()).length;await page.type('.record-editor textarea[name=body]','편집한 메모');await click('수정 저장','.record-editor');await page.waitForSelector('.record-editor .save-feedback[data-save-state=saved]');assert.equal(await page.$eval('.record-editor textarea[name=body]',e=>e.value),'편집한 메모');await page.waitForFunction(()=>!document.querySelector('.record-editor'));assert(await page.$('.record-card'));assert.equal((await successes()).length,beforeHaptics+1);
 pass('content edit acknowledges success without blanking the form and returns to the same card');
 await go('+ 로그');await ready();await page.type('input[name=title]','실패해도 남는 글');await page.type('textarea[name=body]','보존해야 할 본문');await page.evaluate(()=>window.__feedback.failLocal=true);const beforeFailure=(await successes()).length;await category();await page.waitForSelector('.quick-category-sheet + [role=alert]');
 assert.equal((await successes()).length,beforeFailure);assert.equal(await page.$eval('input[name=title]',e=>e.value),'실패해도 남는 글');assert.equal(await page.$eval('textarea[name=body]',e=>e.value),'보존해야 할 본문');assert.equal(api.requests.filter(e=>e.item.title==='실패해도 남는 글').length,0);assert.equal(await page.$('.quick-category-sheet [data-save-state=saved]'),null);
 await page.evaluate(()=>window.__feedback.failLocal=false);await click('기타','.quick-category-sheet');await hasTitle('실패해도 남는 글');assert.equal((await successes()).length,beforeFailure+1);
 pass('local save failure preserves title/body and gives no false success; retry saves once');
 await go('+ 로그');await ready();await page.type('input[name=title]','오프라인의 완료');api.hold=true;await page.setOfflineMode(true);await category();await hasTitle('오프라인의 완료');assert(await page.$('.logbook-row.just-added'));await page.setOfflineMode(false);await release();
 pass('offline save still reaches the locally durable logbook');
 await page.click('button[aria-label="설정 열기"]');await page.waitForSelector('.modern-settings');const toggles=await page.$$('.settings-toggle-row');for(const label of toggles)if(await label.evaluate(e=>e.textContent.includes('부드러운 모션'))){await(await label.$('input')).click();break;}await page.click('button[aria-label="추가 정보 닫기"]');
 assert.equal(await page.$eval('html',e=>e.dataset.motion),'off');await go('+ 로그');await ready();await page.type('input[name=title]','움직임 없이 저장');await category();await hasTitle('움직임 없이 저장');assert.equal(await page.$eval('.logbook-row.just-added',e=>getComputedStyle(e).animationName),'none');
 const totalSuccess=(await successes()).length;await page.reload({waitUntil:'networkidle2'});await ready();assert.equal(await page.$eval('input[name=title]',e=>e.value),'');await go('로그북');await hasTitle('움직임 없이 저장');assert.equal(await page.$('.logbook-row.just-added'),null);assert.equal((await successes()).length,0);
 pass('motion-off keeps functional confirmation; reload has no restored submitted draft, duplicate or replay');
 for(const size of [{width:320,height:568},{width:768,height:1024},{width:1280,height:800}]){await page.setViewport(size);await go('+ 로그');await ready();await page.type('input[name=title]','화면 확인');await click('로그 저장');await page.waitForSelector('.quick-category-sheet');assert(await page.$eval('.quick-category-sheet',e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.bottom<=innerHeight;}));await page.keyboard.press('Escape');}
 assert.deepEqual(api.errors,[]);fs.writeFileSync(output+'/ProjectL3-save-feedback-results.json',JSON.stringify({passed:true,api:'isolated fixtures; no production database requests',checks,confirmedBeforeReload:totalSuccess},null,2));console.log('All save-feedback checks passed.');
}catch(error){console.error(error);console.log({pageErrors:api.errors});await page.screenshot({path:output+'/ProjectL3-save-feedback-failure.png',fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();}
