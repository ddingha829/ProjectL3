import assert from 'node:assert/strict';
import fs from 'node:fs';
import puppeteer from 'puppeteer-core';
const folder='C:/Users/User/Documents/Codex/2026-10-16/pets-plugin-work-pets-openai-curated/work/cardflow';
fs.mkdirSync(folder,{recursive:true});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
const page=await browser.newPage(),errors=[],checks=[];page.on('pageerror',e=>errors.push(e.message));await page.setBypassServiceWorker(true);await page.setViewport({width:390,height:844,deviceScaleFactor:1});
const delay=ms=>new Promise(r=>setTimeout(r,ms));
const click=async(text,scope='body')=>{const toast=await page.$('.test-toast-close');if(toast)await toast.click();for(const b of await page.$$(scope+' button'))if(await b.evaluate((e,t)=>e.textContent.trim()===t||e.querySelector('strong')?.textContent===t,text)){await b.click();await delay(80);return;}throw Error('Missing '+text);};
const go=text=>click(text,'.test-header nav');const pass=text=>{checks.push(text);console.log('PASS '+text);};
try{
 await page.goto('http://localhost:3013',{waitUntil:'networkidle2'});await page.waitForSelector('input[name=title]:not(:disabled)');
 const records=await page.evaluate(async()=>{
  const prefs=await(await fetch('/api/presets')).json(),result=[];
  for(const [index,title] of ['우디집 성수','THE SUBSTANCE','주말의 티켓'].entries()){
   const slot=prefs.presetSlots[index],id=crypto.randomUUID();const item={id,num:'',cat:index===1?'CINEMA':'DINING',sub:index===1?'CINEMA · FILM':'DINING · SEONGSU',title,loc:'SEONGSU',addressShort:'서울 성동구 성수동',fullAddress:'서울 성동구 둘레7길 15',date:'26.10.17',timestamp:Date.now()+index,score:'4.8',quote:'성수동 골목 숨은 우드톤 와인바. 바질 들기름 파스타와 앰버 와인 페어링의 정점.',good:'통창 채광과 소믈리에의 정교한 내추럴 와인 큐레이션',bad:'',note:'2인석 위주라 단체보단 프라이빗 데이트에 최적',link:'',img:index===1?'/images/cinema.jpg':'/images/wine.jpg',hasPhoto:true,cropX:50,cropY:50,mapX:50,mapY:50,author:'여수피카츄',coordinates:{lat:37.54+index*.004,lng:127.055+index*.006},cardAppearance:{slot,skin:prefs.skins[slot.skinId],authorName:'여수피카츄'}};
   const response=await fetch('/api/logs',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item)});if(!response.ok)throw Error('seed '+response.status);result.push((await response.json()).item);
  }return result;
 });
 await page.reload({waitUntil:'networkidle2'});await page.waitForSelector('input[name=title]:not(:disabled)');
 for(const [index,item] of records.entries()){
  await go('로그북');await page.waitForSelector('#record-'+item.id);await page.click('#record-'+item.id);await page.waitForSelector('.record-card [data-card-capture]');await delay(300);
  const capture=await page.$('.record-card [data-card-preview]');await capture.screenshot({path:folder+`/preset-${index+1}.png`});
  const bounds=await page.$eval('.record-card [data-card-capture]',e=>{const r=e.getBoundingClientRect();return {height:r.height,content:e.innerText,text:getComputedStyle(e).getPropertyValue('--card-text').trim(),footer:[...e.querySelectorAll('[data-card-imprint]')].map(x=>x.getBoundingClientRect().bottom-r.top)};});
  assert(bounds.footer.every(bottom=>bottom<=bounds.height+1),JSON.stringify(bounds));
  if(index===0){assert.equal(bounds.text,'#FFFFFF');assert(bounds.content.includes('L2 SIGNAL'));assert.equal(await page.$eval('.record-card [aria-label="평점 4.8"]',e=>getComputedStyle(e).color),'rgb(0, 0, 0)');}
 }
 pass('new editorial, photo cover and ticket retain footer metadata with white orange ink');
 await go('스튜디오');await page.waitForSelector('.preset-studio');await page.click('button[aria-label="사진 예시"]');
 const layouts=['KAKAO','INSTA','TICKET','LIST','RECEIPT','POLAROID','MAGAZINE','PASSPORT','VINYL LP','LIBRARY','BROADSIDE'];
 const boundsFailures=[];
 for(const layout of layouts){
  await click('디자인','.preset-tabs');await page.click('.preset-current');await page.waitForSelector('.preset-layout-picker');await click(layout,'.preset-layout-picker');
  await click('세부사항','.preset-tabs');
  for(const ratio of ['3:4','1:1','9:16']){
   await click(ratio,'.preset-ratios');await delay(210);
   const data=await page.$eval('.preset-preview [data-card-capture]',e=>{const r=e.getBoundingClientRect(),footer=e.querySelector('[data-card-imprint]'),f=footer.getBoundingClientRect(),fields=[...footer.children].map(child=>child.getBoundingClientRect());return {ratio:e.dataset.cardRatio,layout:e.dataset.cardLayout,bottom:f.bottom,limit:r.bottom,scroll:document.documentElement.scrollHeight,h:innerHeight,oneLine:Math.max(...fields.map(r=>r.top))-Math.min(...fields.map(r=>r.top))<1,fits:fields.every(r=>r.left>=f.left-1&&r.right<=f.right+1),theme:footer.querySelector('[data-imprint-field=theme]').innerText,decorations:e.querySelectorAll('[data-card-decoration]').length};});
   if(data.bottom>data.limit+1||data.scroll>data.h+1||!data.oneLine||!data.fits)boundsFailures.push({layout,ratio,...data});
   assert(data.theme.startsWith('THEME:'));assert(data.decorations>0);
   await page.click('input[name=showDecorations]');
   assert.equal(await page.$('.preset-preview>.fit-card>.fit-card-artwork [data-card-decoration]'),null);
   assert(await page.$('.preset-preview>.fit-card>.fit-card-artwork [data-card-imprint] [data-imprint-field=theme]'));
   await page.click('input[name=showDecorations]');
  }
 }
 assert.deepEqual(boundsFailures,[]);
 pass('11 archetypes × 3 ratios: one-line metadata with THEME prefix; decoration toggle removes auxiliary copy and keeps record metadata');
 await go('로그북');await page.waitForSelector('.logbook-row');await page.click('button[aria-label="지도 보기"]');await page.waitForSelector('.leaflet-tile-loaded',{timeout:20000});await page.waitForSelector('.logbook-map-pin');await delay(500);
 assert.equal(await page.$$('.logbook-map-pin').then(a=>a.length),3);
 const map=await page.$eval('.logbook-map',e=>({filter:getComputedStyle(e.querySelector('.leaflet-tile-pane')).filter,attribution:e.querySelector('.leaflet-control-attribution').innerText,tiles:[...e.querySelectorAll('.leaflet-tile')].map(i=>i.src),pins:[...e.querySelectorAll('.logbook-map-pin')].map(e=>e.textContent)}));
 assert(map.filter.includes('invert(1)'));assert(map.attribution.includes('OpenStreetMap'));assert(map.tiles.every(url=>url.includes('.tile.openstreetmap.org/')));
 const tileCoordinates=map.tiles.map(url=>new URL(url).pathname.match(/\/(\d+)\/(\d+)\/(\d+)\.png$/)?.slice(1).map(Number)).filter(Boolean);
 const expectedPoint=records[0].coordinates;
 assert(tileCoordinates.some(([z,x,y])=>{const n=2**z;return x===Math.floor((expectedPoint.lng+180)/360*n)&&y===Math.floor((1-Math.asinh(Math.tan(expectedPoint.lat*Math.PI/180))/Math.PI)/2*n);}),JSON.stringify({expectedPoint,tileCoordinates}));
 fs.writeFileSync(folder+'/map-tile-coordinates.json',JSON.stringify({expectedPoint,tileCoordinates},null,2));
 await page.screenshot({path:folder+'/map-mobile.png'});
 const pin=await page.$('.logbook-map-pin');const selectedTitle=await pin.$eval('span',e=>e.textContent);await pin.click();await delay(100);assert.equal(await page.$eval('.logbook-map-focus strong',e=>e.textContent),selectedTitle);
 await page.click('.logbook-map-focus>button:first-child');await page.waitForSelector('.record-card');assert((await page.$eval('.record-card',e=>e.innerText)).includes(selectedTitle));
 await go('로그북');await page.waitForSelector('.logbook-row');await page.click('button[aria-label="지도 보기"]');await page.waitForSelector('.logbook-map-pin');await page.type('.logbook-search input','우디집');await page.waitForFunction(()=>document.querySelectorAll('.logbook-map-pin').length===1);
 await page.click('.logbook-search input',{clickCount:3});await page.keyboard.press('Backspace');await page.waitForFunction(()=>document.querySelectorAll('.logbook-map-pin').length===3);
 await page.click('button[aria-label="지도 확대"]');await page.click('button[aria-label="모든 장소 보기"]');
 await page.setViewport({width:320,height:568});await delay(200);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.setViewport({width:1280,height:800});await delay(300);await page.screenshot({path:folder+'/map-desktop.png'});
 pass('live OpenStreetMap tiles, dark tile pane, attribution, pins, selected log, search, zoom, re-entry and responsive sizing');
 await page.setViewport({width:390,height:844});
 await page.setRequestInterception(true);
 page.on('request',request=>{const url=new URL(request.url());if(url.pathname==='/api/places/search'&&url.searchParams.get('q')==='연결테스트')void request.respond({status:200,contentType:'application/json',body:JSON.stringify({results:[{id:'contract-place',name:'검증용 장소',short:'서울 성동구 성수동',fullAddress:'서울 성동구 성수동',loc:'SEONGSU',link:'https://www.google.com/maps/search/?api=1&query=37.54,127.055',x:50,y:50,category:'DINING',coordinates:{lat:37.54,lng:127.055}}]})});else void request.continue();});
 await go('+ 로그');await page.waitForSelector('input[name=title]:not(:disabled)');await page.type('input[name=title]','좌표를 저장한 오후');await click('장소','.quick-actions');await page.waitForSelector('[role=dialog] input[type=search]');await page.type('[role=dialog] input[type=search]','연결테스트');await page.waitForSelector('[aria-label="장소·작품 검색 결과"] button');await page.click('[aria-label="장소·작품 검색 결과"] button');await click('완료','.quick-dialog-panel');await click('로그 저장');await page.waitForSelector('.quick-category-sheet');await click('미식','.quick-category-sheet');await page.waitForSelector('.logbook-row');
 await page.waitForFunction(async()=>{const data=await(await fetch('/api/logs')).json();return data.archives.some(item=>item.title==='좌표를 저장한 오후'&&item.coordinates?.lat===37.54);});
 await page.click('button[aria-label="지도 보기"]');await page.waitForSelector('.logbook-map-pin');assert.equal(await page.$$('.logbook-map-pin').then(a=>a.length),3,'same-coordinate logs share a counted marker');assert((await page.$$eval('.logbook-map-pin',es=>es.map(e=>e.textContent))).some(t=>t.includes('+1')));
 pass('place-result coordinates survive composer save and appear as a counted marker for repeated visits');
 const positioned=await page.evaluate(async()=>(await(await fetch('/api/logs')).json()).archives.find(item=>item.title==='좌표를 저장한 오후'));
 await go('로그북');await page.waitForSelector('#record-'+positioned.id);await page.click('#record-'+positioned.id);await page.waitForSelector('.record-card');await click('내용 수정');await page.waitForSelector('.record-editor');await click('장소','.record-editor');await page.waitForSelector('[aria-label="선택한 장소·작품 제거"]');await page.click('[aria-label="선택한 장소·작품 제거"]');await click('완료','.quick-dialog-panel');await click('수정 저장','.record-editor');await page.waitForFunction(()=>!document.querySelector('.record-editor'));
 await page.waitForFunction(async id=>!(await(await fetch('/api/logs')).json()).archives.find(item=>item.id===id)?.coordinates,{},positioned.id);
 pass('removing a place in the content sheet also clears the persisted coordinate');
 assert.deepEqual(errors,[]);fs.writeFileSync(folder+'/map-preset-results.json',JSON.stringify({passed:true,checks,errors},null,2));console.log('All map/preset checks passed.');
}catch(e){console.error(e);console.log({checks,errors});await page.screenshot({path:folder+'/map-preset-failure.png',fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{await page.evaluate(async()=>{for(const item of (await(await fetch('/api/logs')).json()).archives||[])await fetch('/api/logs?id='+item.id,{method:'DELETE'});}).catch(()=>{});await browser.close();}
