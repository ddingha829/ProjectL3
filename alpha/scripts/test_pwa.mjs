import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const folder=process.env.L2_TEST_OUTPUT_DIR||'C:/Users/User/Documents/Codex/2026-10-16/pets-plugin-work-pets-openai-curated/work/test-integration';
fs.mkdirSync(folder,{recursive:true});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
const page=await browser.newPage();const errors=[],workerUrls=[];page.on('pageerror',e=>errors.push(e.message));page.on('workercreated',worker=>workerUrls.push(worker.url()));
const base=process.env.L2_TEST_URL||'http://localhost:3014';
if(!['localhost','127.0.0.1'].includes(new URL(base).hostname)||process.env.L2_TEST_ALLOW_EXTERNAL!=='false')throw new Error('Use an isolated local server with L2_TEST_ALLOW_EXTERNAL=false.');
await page.evaluateOnNewDocument(()=>{localStorage.setItem('l2_first_visit_guides_v1',JSON.stringify({eligible:false,seen:{}}));localStorage.setItem('l2_pwa_banner_dismissed_v1','1');});
await page.setViewport({width:390,height:844,deviceScaleFactor:1});
const click=async text=>{for(const button of await page.$$('button')){if(await button.evaluate((el,t)=>el.textContent.trim()===t||el.querySelector('strong')?.textContent===t,text)){await button.click();return;}}throw new Error('Missing '+text);};
const ready=async()=>{await page.waitForSelector('textarea:not(:disabled)');await page.waitForFunction(()=>!document.querySelector('input[name="title"]')?.disabled);};
const records=()=>page.evaluate(async()=>{const res=await fetch('/api/logs',{cache:'no-store'});if(!res.ok)throw new Error('GET '+res.status);return (await res.json()).archives;});
async function waitForServerCount(count){
 let lastError;
 for(let attempt=0;attempt<150;attempt++){
  try{const rows=await records();if(rows.length===count)return rows;}catch(error){lastError=error;}
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 throw new Error('Server record count did not reach '+count+(lastError?': '+lastError.message:''));
}
try{
 await page.goto(base,{waitUntil:'networkidle2'});await ready();
 assert.equal(await page.evaluate(async()=>(await(await fetch('/api/session')).json()).storeKind),'file','Never write QA fixtures into Supabase');
 await page.waitForFunction(()=>document.documentElement.dataset.offlineReady==='true',{timeout:30000});
 const cache=await page.evaluate(async()=>{const keys=await caches.keys();const requests=(await Promise.all(keys.filter(k=>k.startsWith('l2-test-shell-')).map(async k=>(await (await caches.open(k)).keys()).map(r=>r.url)))).flat();return {keys,requests};});
 for(const font of ['sebang-gothic-regular.woff2','sebang-gothic-bold.woff2','caveat-wordmark.ttf','sebang-gothic-italic-regular.woff2','sebang-gothic-italic-bold.woff2','gaegu-regular.woff2','gaegu-bold.woff2','single-day.woff2'])assert.ok(cache.requests.some(url=>url.endsWith('/fonts/'+font)),font+' cached for offline');
 assert(cache.requests.some(url=>url.includes('/_next/static/')));assert(!cache.requests.some(url=>url.includes('/api/')));
 assert.ok(workerUrls.length>0,'PNG worker warmed while online');
 await page.setOfflineMode(true);await page.reload({waitUntil:'networkidle2'});await ready();
 assert.ok(await page.evaluate(async()=>{const faces=await Promise.all([document.fonts.load('400 24px Gaegu','오늘'),document.fonts.load('700 24px Gaegu','오늘'),document.fonts.load('400 24px \"Single Day\"','똠방각하')]);return faces.every(list=>list.length>0&&list.every(face=>face.status==='loaded'));}),'bold Gaegu and Single Day load offline');
 const workerResult=await page.evaluate(async url=>{
  const worker=new Worker(url);
  try{return await new Promise((resolve,reject)=>{
   const timer=setTimeout(()=>reject(new Error('Offline PNG worker timed out')),10000);
   worker.onerror=()=>{clearTimeout(timer);reject(new Error('Offline PNG worker failed'));};
   worker.onmessage=async event=>{clearTimeout(timer);try{if(event.data.error)throw new Error(event.data.error);const image=await createImageBitmap(new Blob([event.data.png],{type:'image/png'}));const canvas=document.createElement('canvas');canvas.width=canvas.height=16;const c=canvas.getContext('2d');c.drawImage(image,0,0);resolve([c.getImageData(0,0,1,1).data[3],c.getImageData(8,8,1,1).data[3]]);image.close();}catch(error){reject(error);}};
   const pixels=new Uint8Array(16*16*4).fill(255);pixels.fill(0,0,4);worker.postMessage({pixels:pixels.buffer,width:16,height:16},[pixels.buffer]);
  });}finally{worker.terminate();}
 },workerUrls[0]);assert.deepEqual(workerResult,[0,255],'offline PNG encoder preserves alpha');
 await page.type('input[name="title"]','오프라인의 순간');await page.type('textarea','오프라인에서도 남기는 작고 선명한 순간.');await click('로그 저장');await page.waitForSelector('.quick-category-sheet');await click('기타');await page.waitForSelector('.logbook-row');
 await page.reload({waitUntil:'networkidle2'});await ready();await click('로그북');await page.waitForSelector('.logbook-row');assert.equal(await page.$$eval('.logbook-row',items=>items.length),1);
 await page.screenshot({path:folder+'/04-real-offline-reload.png',fullPage:true});
 await page.setOfflineMode(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 const rows=await waitForServerCount(1);assert.equal(rows[0].title,'오프라인의 순간');assert.equal(new Set(rows.map(row=>row.id)).size,1);
 const cookieNames=(await page.cookies()).map(c=>c.name);assert(cookieNames.includes('l2_test_device'));assert(!cookieNames.includes('l2_device'));
 for(const item of rows)await page.evaluate(async id=>{await fetch('/api/logs?id='+id,{method:'DELETE'});},item.id);
 assert.deepEqual(errors,[]);
 const result={passed:true,cachedAssets:cache.requests.length,checks:['offline PNG worker retains transparency','service worker precaches app and secondary screens','no private API response cached','full document reload offline','offline create and second document reload','reconnect without duplicate','cookie isolated from original'],errors};
 fs.writeFileSync(folder+'/pwa-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(error){console.error(error);console.log({errors});await page.screenshot({path:folder+'/pwa-failure.png',fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();}
