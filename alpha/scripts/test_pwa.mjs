import assert from 'node:assert/strict';
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
const folder='C:/Users/User/Documents/Codex/2026-10-16/pets-plugin-work-pets-openai-curated/work/test-integration';
fs.mkdirSync(folder,{recursive:true});
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--no-sandbox']});
const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
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
 assert(cache.requests.some(url=>url.includes('/_next/static/')));assert(!cache.requests.some(url=>url.includes('/api/')));
 await page.setOfflineMode(true);await page.reload({waitUntil:'networkidle2'});await ready();
 await page.type('input[name="title"]','오프라인의 순간');await page.type('textarea','오프라인에서도 남기는 작고 선명한 순간.');await click('로그 저장');await page.waitForSelector('.quick-category-sheet');await click('기타');await page.waitForSelector('.logbook-row');
 await page.reload({waitUntil:'networkidle2'});await ready();await click('로그북');await page.waitForSelector('.logbook-row');assert.equal(await page.$$eval('.logbook-row',items=>items.length),1);
 await page.screenshot({path:folder+'/04-real-offline-reload.png',fullPage:true});
 await page.setOfflineMode(false);await page.evaluate(()=>window.dispatchEvent(new Event('online')));
 const rows=await waitForServerCount(1);assert.equal(rows[0].title,'오프라인의 순간');assert.equal(new Set(rows.map(row=>row.id)).size,1);
 const cookieNames=(await page.cookies()).map(c=>c.name);assert(cookieNames.includes('l2_test_device'));assert(!cookieNames.includes('l2_device'));
 for(const item of rows)await page.evaluate(async id=>{await fetch('/api/logs?id='+id,{method:'DELETE'});},item.id);
 assert.deepEqual(errors,[]);
 const result={passed:true,cachedAssets:cache.requests.length,checks:['service worker precaches app and secondary screens','no private API response cached','full document reload offline','offline create and second document reload','reconnect without duplicate','cookie isolated from original'],errors};
 fs.writeFileSync(folder+'/pwa-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}catch(error){console.error(error);console.log({errors});await page.screenshot({path:folder+'/pwa-failure.png',fullPage:true}).catch(()=>{});process.exitCode=1;}
finally{await browser.close();}
