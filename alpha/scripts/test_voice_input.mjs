import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require=createRequire(import.meta.url),ts=require('typescript'),modules=new Map();
function load(file){if(modules.has(file))return modules.get(file).exports;const m={exports:{}};modules.set(file,m);new Function('require','module','exports',ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText)(name=>name.startsWith('@/')?load(path.resolve('src',name.slice(2))+'.ts'):require(name),m,m.exports);return m.exports;}
const {PRESET_SLOTS,INITIAL_SKINS}=load(path.resolve('src/data/initialData.ts'));
const {chromium,webkit}=await import(process.env.L2_PLAYWRIGHT_PATH?pathToFileURL(process.env.L2_PLAYWRIGHT_PATH).href:'playwright');
const isWebkit=process.env.L2_TEST_WEBKIT==='true',engine=isWebkit?'webkit':'chrome';
const base=process.env.L2_TEST_URL||'http://127.0.0.1:3015';assert.ok(['localhost','127.0.0.1'].includes(new URL(base).hostname));
const out=path.resolve(process.env.L2_TEST_OUTPUT_DIR||'artifacts/voice/'+engine);fs.mkdirSync(out,{recursive:true});
const browser=isWebkit?await webkit.launch({headless:true}):await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const errors=[],checks=[];const pass=text=>{checks.push(text);console.log('PASS '+engine+' '+text);};
const contexts=[];
async function setup(mode='standard'){
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,serviceWorkers:'block'});contexts.push(context);
 await context.addInitScript(({mode})=>{
  localStorage.setItem('l2_first_visit_guides_v1',JSON.stringify({eligible:false,seen:{}}));localStorage.setItem('l2_pwa_banner_dismissed_v1','1');localStorage.setItem('l2_auto_place_link_on','off');
  const instances=[];window.__speech={instances,mode};
  class Recognition{
   constructor(){instances.push(this);this.starts=0;this.stops=0;this.aborts=0;}
   start(){this.starts++;if(window.__speech.mode==='throw')throw new Error('unavailable');}
   stop(){this.stops++;}
   abort(){this.aborts++;}
  }
  Object.defineProperty(window,'SpeechRecognition',{configurable:true,writable:true,value:mode==='prefix'||mode==='missing'?undefined:Recognition});
  Object.defineProperty(window,'webkitSpeechRecognition',{configurable:true,writable:true,value:mode==='prefix'?Recognition:undefined});
 },{mode});
 let archives=[],saved=null;const prefs={deviceId:crypto.randomUUID(),username:'voice-qa',presetSlots:structuredClone(PRESET_SLOTS),skins:structuredClone(INITIAL_SKINS),authorName:'테스트',defaultPresetId:'02'};
 const requests=[];
 await context.route('**/*',async route=>{const req=route.request(),url=new URL(req.url());if(!url.pathname.startsWith('/api/'))return route.continue();requests.push({url:url.pathname,method:req.method()});let data={...prefs,archives};if(url.pathname==='/api/logs'&&req.method()==='POST'){saved=JSON.parse(req.postData());archives=[saved];data={item:saved,archives};}if(url.pathname.startsWith('/api/places'))data={results:[]};return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify(data)});});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(base,{waitUntil:'networkidle'});await page.locator('.voice-log-button').waitFor();await page.waitForFunction(()=>!document.querySelector('.voice-log-button').disabled);
 return{context,page,requests,saved:()=>saved};
}
const last=page=>page.evaluate(()=>{const r=window.__speech.instances.at(-1);return r&&{lang:r.lang,continuous:r.continuous,interimResults:r.interimResults,starts:r.starts,stops:r.stops,aborts:r.aborts};});
const emit=async(page,kind,value)=>{await page.evaluate(({kind,value})=>{const r=window.__speech.instances.at(-1);if(kind==='result')r.onresult?.({results:value.map(([text,final])=>({0:{transcript:text},isFinal:final}))});else if(kind==='error')r.onerror?.({error:value});else r['on'+kind]?.();},{kind,value});await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));};
const start=async page=>{await page.getByRole('button',{name:'음성 입력',exact:true}).click();await emit(page,'start');};
const body=page=>page.locator('textarea[name=body]');
try{
 const f=await setup(),{page}=f;
 assert.equal(await page.evaluate(()=>window.__speech.instances.length),0);pass('no microphone session or paid API request on page load');
 await page.locator('input[name=title]').fill('말로 남긴 오후');await body(page).fill('원래 메모.');await start(page);
 assert.deepEqual(await last(page),{lang:'ko-KR',continuous:true,interimResults:true,starts:1,stops:0,aborts:0});assert.equal(await page.locator('.quick-save-button').isDisabled(),true);
 await emit(page,'result',[['오늘 카페',false]]);assert.equal(await body(page).inputValue(),'원래 메모.');assert.equal(await page.locator('.voice-log-interim>span').innerText(),'인식 중');assert.equal(await page.locator('.voice-log-interim>p').innerText(),'오늘 카페');
 await emit(page,'result',[['오늘 카페에 갔다.',true],['커피가',false]]);assert.equal(await body(page).inputValue(),'원래 메모. 오늘 카페에 갔다.');
 await body(page).fill((await body(page).inputValue())+' 직접 쓴 메모.');
 await emit(page,'result',[['오늘 카페에 갔다.',true],['커피가 맛있었다.',true]]);await emit(page,'result',[['오늘 카페에 갔다.',true],['커피가 맛있었다.',true]]);
 assert.equal(await body(page).inputValue(),'원래 메모. 오늘 카페에 갔다. 직접 쓴 메모. 커피가 맛있었다.');
 await page.getByRole('button',{name:'음성 입력 완료',exact:true}).click();assert.equal((await last(page)).stops,1);assert.equal(await page.locator('.quick-save-button').isDisabled(),true);
 await emit(page,'result',[['오늘 카페에 갔다.',true],['커피가 맛있었다.',true],['또 가고 싶다.',true]]);await emit(page,'end');
 assert.equal(await body(page).inputValue(),'원래 메모. 오늘 카페에 갔다. 직접 쓴 메모. 커피가 맛있었다. 또 가고 싶다.');assert.equal(await page.locator('.quick-save-button').isDisabled(),false);pass('Korean interim/final recognition appends once, preserves typing and waits for final results before save');
 await start(page);await emit(page,'result',[['두 번째 입력.',true]]);await emit(page,'end');assert.ok((await body(page).inputValue()).endsWith('또 가고 싶다. 두 번째 입력.'));assert.equal(await page.evaluate(()=>window.__speech.instances.length),2);await page.waitForTimeout(500);assert.equal(await page.evaluate(()=>window.__speech.instances.length),2);pass('new sessions accept index zero again and natural end never restarts the microphone');
 const confirmed=await body(page).inputValue();await start(page);await emit(page,'result',[['확인할 문구.',false]]);await emit(page,'end');assert.equal(await body(page).inputValue(),confirmed);assert.equal(await page.getByRole('button',{name:'내용에 추가',exact:true}).isVisible(),true);await page.getByRole('button',{name:'내용에 추가',exact:true}).click();assert.equal(await body(page).inputValue(),confirmed+' 확인할 문구.');await start(page);await emit(page,'result',[['지울 문구',false]]);await emit(page,'error','network');await page.getByRole('button',{name:'문구 지우기',exact:true}).click();assert.equal(await page.locator('.voice-log-interim').count(),0);pass('unconfirmed text survives natural end or service failure for explicit accept/discard');
 await start(page);await emit(page,'error','not-allowed');assert.match(await page.locator('.voice-log-notice').innerText(),/마이크 권한/);assert.equal(await page.getByRole('button',{name:'음성 입력',exact:true}).isEnabled(),true);assert.ok((await body(page).inputValue()).includes('두 번째 입력.'));
 for(const error of ['network','audio-capture','service-not-allowed','no-speech','language-not-supported']){await start(page);await emit(page,'error',error);assert.match(await page.locator('.voice-log-notice').innerText(),/키보드의 마이크/);}
 pass('permission, network, microphone and unsupported-service failures preserve text and offer keyboard dictation');
 await start(page);await page.evaluate(()=>{window.__staleResult=window.__speech.instances.at(-1).onresult;});await page.getByRole('button',{name:'설정 열기',exact:true}).click();await page.waitForFunction(()=>window.__speech.instances.at(-1).aborts===1);const before=await body(page).inputValue();await page.evaluate(()=>window.__staleResult({results:[{0:{transcript:'늦은 결과'},isFinal:true}]}));assert.equal(await body(page).inputValue(),before);await page.getByRole('dialog',{name:'설정',exact:true}).getByRole('button',{name:'추가 정보 닫기',exact:true}).click();pass('settings overlay stops capture and stale callbacks cannot alter a draft');
 await start(page);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});assert.equal((await last(page)).aborts,1);await page.evaluate(()=>{delete document.hidden;});
 await start(page);await page.locator('.test-header nav').getByRole('button',{name:'로그북',exact:true}).click();assert.equal((await last(page)).aborts,1);await page.locator('.test-header nav').getByRole('button',{name:'+ 로그',exact:true}).click();await page.waitForFunction(expected=>document.querySelector('textarea[name=body]')?.value===expected,before);assert.equal(await body(page).inputValue(),before);pass('backgrounding and navigation terminate capture; confirmed draft text is restored');
 await start(page);await page.getByRole('button',{name:'사진',exact:true}).click();await page.waitForFunction(()=>window.__speech.instances.at(-1).aborts===1);await page.getByRole('button',{name:'추가 정보 닫기',exact:true}).click();pass('photo/options dialogs suspend recognition');
 await body(page).fill('가'.repeat(4995));await start(page);await emit(page,'result',[['긴 음성 문구를 추가합니다.',true]]);assert.equal((await body(page).inputValue()).length,5000);await page.waitForFunction(()=>window.__speech.instances.at(-1).aborts===1);assert.equal(await page.getByRole('button',{name:'음성 입력',exact:true}).isDisabled(),true);pass('5000-character limit also applies to dictated text and stops further capture');
 await body(page).fill('저장할 내용.');await start(page);await emit(page,'result',[['말로 쓴 로그.',true]]);await emit(page,'end');
 for(const [width,height] of [[320,740],[390,844],[768,1024],[1280,900]]){await page.setViewportSize({width,height});for(const theme of ['light','dark']){await page.evaluate(theme=>document.documentElement.classList.toggle('light',theme==='light'),theme);const layout=await page.locator('.voice-log-button').evaluate(el=>{const r=el.getBoundingClientRect();return{w:r.width,h:r.height,right:r.right,scroll:document.documentElement.scrollWidth,width:innerWidth};});assert.ok(layout.w>=44&&layout.h>=44&&layout.right<=width,JSON.stringify(layout));assert.ok(layout.scroll<=layout.width+1,JSON.stringify(layout));}await page.screenshot({path:path.join(out,'voice-'+width+'.png')});}pass('mobile/tablet/desktop and light/dark controls retain touch size without horizontal overflow');
 await page.setViewportSize({width:390,height:844});await start(page);await emit(page,'result',[['인식 중 예시',false]]);await page.screenshot({path:path.join(out,'listening.png')});await emit(page,'end');
 await page.locator('.quick-save-button').click();await page.getByRole('button',{name:'미식',exact:false}).first().click();await page.waitForFunction(()=>!!document.querySelector('.logbook-toolbar'));assert.equal(f.saved().quote,'저장할 내용. 말로 쓴 로그.');assert.ok(!f.requests.some(r=>/summary|generate|speech|transcri/i.test(r.url)));pass('reviewed text uses normal log save and makes no Gemini/STT API calls');
 await page.locator('#record-'+f.saved().id).click();await page.locator('.record-editor-handle').click();await page.getByRole('button',{name:'내용 수정',exact:true}).click();await page.waitForFunction(()=>document.querySelector('textarea[name=body]')?.value==='저장할 내용. 말로 쓴 로그.');await start(page);await emit(page,'result',[['수정 화면에서도 추가.',true]]);await emit(page,'end');assert.equal(await body(page).inputValue(),'저장할 내용. 말로 쓴 로그. 수정 화면에서도 추가.');await page.getByRole('dialog',{name:'내용 수정',exact:true}).getByRole('button',{name:'추가 정보 닫기',exact:true}).click();assert.equal(f.saved().quote,'저장할 내용. 말로 쓴 로그.');pass('existing log content editor supports dictation without changing saved content on cancel');
 for(const mode of ['prefix','missing','throw']){const {page:p}=await setup(mode);await p.getByRole('button',{name:'음성 입력',exact:true}).click();if(mode==='prefix'){await emit(p,'start');await emit(p,'result',[['접두사 브라우저.',true]]);await emit(p,'end');assert.equal(await body(p).inputValue(),'접두사 브라우저.');}else{assert.match(await p.locator('.voice-log-notice').innerText(),/키보드의 마이크/);assert.equal(await p.locator('.voice-log-button').getAttribute('aria-pressed'),'false');}}pass('webkitSpeechRecognition fallback, missing API and synchronous start failure');
 const slow=await setup();await slow.page.getByRole('button',{name:'음성 입력',exact:true}).click();await slow.page.getByRole('button',{name:'마이크 연결 중 · 중지',exact:true}).click();await emit(slow.page,'start');assert.equal(await slow.page.locator('.voice-log-button').getAttribute('aria-label'),'음성 입력 마치는 중');await slow.page.waitForFunction(()=>document.querySelector('.voice-log-button').getAttribute('aria-pressed')==='false',{},{timeout:5500});assert.equal((await last(slow.page)).aborts,1);pass('stop during pending permission cannot reopen listening; missing end event times out safely');
 assert.deepEqual(errors,[]);fs.writeFileSync(path.join(out,'results.json'),JSON.stringify({engine,checks,errors},null,2));
}finally{await Promise.all(contexts.map(c=>c.close()));await browser.close();}
