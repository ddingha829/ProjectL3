import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer-core';

const output='C:/Users/User/Documents/Codex/2026-10-16/pets-plugin-work-pets-openai-curated/outputs';
fs.mkdirSync(output,{recursive:true});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
const page=await browser.newPage(),errors=[];
page.on('pageerror',error=>errors.push(error.message));
await page.setBypassServiceWorker(true);
await page.emulateMediaFeatures([{name:'prefers-reduced-motion',value:'reduce'}]);
await page.setViewport({width:390,height:844,deviceScaleFactor:1});
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const ready=()=>page.waitForSelector('input[name=title]:not(:disabled)');
async function click(text,scope='body'){
 const toast=await page.$('.test-toast-close');if(toast)await toast.click();
 for(const button of await page.$$(scope+' button'))if(await button.evaluate((e,t)=>e.getClientRects().length&&(e.textContent.trim()===t||[...e.querySelectorAll('strong,span')].some(child=>child.textContent.trim()===t)),text)){await button.click();return;}
 throw Error('Missing '+text);
}
const go=text=>click(text,'.test-header nav');
async function motion(value){await page.click('button[aria-label="설정 열기"]');await page.waitForSelector('[aria-label="애니메이션 설정"]');await click(value,'[aria-label="애니메이션 설정"]');await page.click('button[aria-label="추가 정보 닫기"]');await page.waitForFunction(()=>!document.querySelector('[role=dialog]'));}
const animationState=()=>page.evaluate(()=>({background:getComputedStyle(document.querySelector('.quick-input-surface'),'::before').animationName,transform:getComputedStyle(document.querySelector('.quick-input-surface'),'::before').transform,letter:getComputedStyle(document.querySelector('.memo-prompt>span')).transform,motion:document.documentElement.dataset.motion}));
const records=()=>page.evaluate(async()=>(await(await fetch('/api/logs')).json()).archives);
async function saved(title){await page.waitForFunction(async t=>(await(await fetch('/api/logs')).json()).archives.some(e=>e.title===t),{},title);return(await records()).find(e=>e.title===title);}
try{
 await page.goto('http://localhost:3013',{waitUntil:'networkidle2'});await ready();
 assert.equal((await animationState()).background,'composer-current-a');assert.equal((await animationState()).motion,'on');
 await motion('기기 설정');assert.equal((await animationState()).background,'none');
 await page.reload({waitUntil:'networkidle2'});await ready();assert.equal((await animationState()).motion,'auto');assert.equal((await animationState()).background,'none');
 await motion('켜기');
 const first=await animationState();await delay(500);const second=await animationState();
 assert.equal(second.motion,'on');assert.equal(second.background,'composer-current-a');assert.notEqual(first.transform,second.transform);assert.notEqual(first.letter,second.letter);
 await page.reload({waitUntil:'networkidle2'});await ready();assert.equal((await animationState()).motion,'on');
 console.log('PASS fresh browser animates despite OS reduced motion; explicit Auto/On persist; gradient and prompt actually change over time');
 for(const size of [{width:320,height:568},{width:375,height:667},{width:768,height:1024},{width:1024,height:768},{width:1280,height:800},{width:1366,height:768}]){
  await page.setViewport(size);await delay(100);
  const result=await page.evaluate(()=>{
   const surface=document.querySelector('.quick-input-surface'),save=document.querySelector('.quick-save').getBoundingClientRect(),prompt=document.querySelector('.memo-prompt').getBoundingClientRect(),last=document.querySelector('.memo-prompt>span:last-child').getBoundingClientRect();
   return {h:innerHeight,w:innerWidth,page:document.documentElement.scrollHeight,width:document.documentElement.scrollWidth,bottom:save.bottom,surface:surface.getBoundingClientRect().height,containsControls:!!surface.querySelector('.quick-actions,.quick-save'),promptFits:last.right<=prompt.right+1,nav:[...document.querySelectorAll('.test-header nav button')].map(e=>({size:parseFloat(getComputedStyle(e).fontSize),weight:+getComputedStyle(e).fontWeight,top:e.getBoundingClientRect().top}))};
  });
  assert(result.page<=result.h+1&&result.width<=result.w+1,JSON.stringify(result));assert(result.h-result.bottom>=0&&result.h-result.bottom<35,JSON.stringify(result));assert(result.surface>result.h*.5,JSON.stringify(result));assert(!result.containsControls);assert(result.promptFits,JSON.stringify(result));assert(result.nav.every(e=>e.size>=14&&e.weight>=800));assert.equal(new Set(result.nav.map(e=>e.top)).size,1);
  if(size.width===1280)await page.screenshot({path:output+'/ProjectL3-composer-desktop.png'});
 }
 await page.setViewport({width:390,height:844});await delay(100);await page.screenshot({path:output+'/ProjectL3-composer-mobile.png'});
 console.log('PASS viewport-filling composer, bottom save, separate controls, single-line prompt and bold nav across phones/tablets/desktop');
 const upload=await page.$('input[type=file]');await upload.uploadFile(path.resolve('public/images/korean.jpg'));
 await page.waitForSelector('.photo-memo-image img');
 const photoState=()=>page.$eval('.photo-memo-image',e=>({height:e.getBoundingClientRect().height,active:e.getAnimations().some(a=>a.id==='photo-insert'&&a.playState==='running'),memo:e.nextElementSibling.getBoundingClientRect().top}));
 const start=await photoState();await delay(160);const midway=await photoState();await delay(650);const end=await photoState();
 assert(start.active,JSON.stringify(start));assert(midway.height>start.height,JSON.stringify({start,midway}));assert(end.height>=midway.height);assert(end.memo>start.memo);assert(!end.active);assert(await page.$eval('textarea[name=body]',e=>e.getBoundingClientRect().height>=200));
 await page.type('textarea[name=body]','사진을 담으며 부드럽게 이어지는 메모');assert.equal(await page.$('.memo-prompt'),null);
 await page.type('input[name=title]','움직임 테스트');await click('로그 저장');await page.waitForSelector('.quick-category-sheet');await click('미식','.quick-category-sheet');await saved('움직임 테스트');
 console.log('PASS photo grows progressively and moves the same spacious memo downward; typing removes animated prompt');
 await go('+ 로그');await ready();await click('장소','.quick-actions');await page.waitForSelector('input[type=search]');
 const response=page.waitForResponse(r=>r.url().includes('/api/places/search?')&&r.url().includes(encodeURIComponent('리움미술관')));
 await page.type('input[type=search]','리움미술관');const data=await(await response).json();
 assert.equal(data.googleStatus,'ready');const index=data.results.findIndex(e=>e.source==='GOOGLE');assert(index>=0);assert(Number.isFinite(data.results[index].coordinates.lat));
 await page.waitForSelector('ul[aria-label="장소·작품 검색 결과"] button');await(await page.$$('ul[aria-label="장소·작품 검색 결과"] button'))[index].click();await click('완료','.quick-dialog-panel');
 await click('로그 저장');await page.waitForSelector('.quick-category-sheet');await click('장소','.quick-category-sheet');const location=await saved(data.results[index].name);
 assert.deepEqual(location.coordinates,data.results[index].coordinates);
 await page.click('button[aria-label="지도 보기"]');await page.waitForSelector('.leaflet-tile-loaded',{timeout:20000});await page.waitForSelector('.logbook-map-pin');assert((await page.$$eval('.logbook-map-pin',elements=>elements.map(e=>e.textContent))).some(text=>text.includes(location.title)));
 console.log('PASS live Google search after billing connection → actual coordinates saved → OSM map pin');
 await go('스튜디오');await page.waitForSelector('.preset-studio');await page.click('button[aria-label="다음 디자인"]');await delay(90);
 const slide=await page.$eval('.fit-card',e=>({animation:getComputedStyle(e.querySelector('.fit-card-artwork')).animationName,transform:getComputedStyle(e.querySelector('.fit-card-artwork')).transform,out:!!e.querySelector('.fit-card-outgoing'),inert:e.querySelector('.fit-card-outgoing')?.inert,direction:e.style.getPropertyValue('--card-direction')}));
 assert.equal(slide.animation,'card-slide-in');assert(slide.out&&slide.inert);let matrix=slide.transform.match(/matrix\(([^)]+)\)/)[1].split(',').map(Number);assert.equal(matrix[0],1);assert.equal(matrix[3],1);assert(matrix[4]>0);assert.equal(matrix[5],0);
 await delay(760);assert.equal(await page.$('.fit-card-outgoing'),null);
 await page.click('button[aria-label="이전 디자인"]');await delay(90);assert.equal(await page.$eval('.fit-card',e=>e.style.getPropertyValue('--card-direction')),'-1');
 for(let i=0;i<4;i++){await page.click('button[aria-label="다음 디자인"]');await delay(40);}await delay(780);assert.equal(await page.$('.fit-card-outgoing'),null);assert.equal(await page.$$('.preset-preview [data-card-capture]').then(e=>e.length),1);
 console.log('PASS lateral card transition retains old/new artwork, respects direction, settles and survives rapid cycling');
 await go('로그북');await page.waitForSelector('.logbook-row');await page.click('button[aria-label="목록 보기"]');
 await page.evaluate(()=>scrollTo(0,document.documentElement.scrollHeight));const bounds=await page.$eval('.logbook-row',e=>{const r=e.getBoundingClientRect();return{x:r.x+r.width*.5,y:r.y+r.height*.5};});
 await page.mouse.move(bounds.x,bounds.y);await page.mouse.down();await page.mouse.move(bounds.x,bounds.y-90,{steps:5});
 assert.equal(await page.$eval('.logbook-collection',e=>e.dataset.elastic),'dragging');await page.mouse.up();assert.equal(await page.$eval('.logbook-collection',e=>e.dataset.elastic),'spring');await delay(650);assert.equal(await page.$eval('.logbook-collection',e=>e.dataset.elastic),'idle');assert.equal(await page.$('.record-card'),null);
 console.log('PASS logbook boundary stretches and springs back without opening a log');
 await go('+ 로그');await ready();await motion('끄기');assert.equal((await animationState()).background,'none');
 await page.reload({waitUntil:'networkidle2'});await ready();assert.equal((await animationState()).motion,'off');assert.equal((await animationState()).background,'none');
 await motion('기기 설정');assert.equal((await animationState()).background,'none');
 await motion('켜기');assert.deepEqual(errors,[]);console.log('All motion, responsive layout and live Google checks passed.');
}finally{await browser.close();}
