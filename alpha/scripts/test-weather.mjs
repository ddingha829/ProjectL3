import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url));
const compiled=await build({stdin:{contents:"export {requestWeather} from './src/social/weatherClient';export {handleWeather} from './src/server/weatherService';",resolveDir:root},bundle:true,platform:'node',format:'esm',write:false});
const {requestWeather,handleWeather}=await import('data:text/javascript;base64,'+Buffer.from(compiled.outputFiles[0].text).toString('base64'));
const response=(body,status=200)=>Response.json(body,{status});
const weather={condition:'cloud',temperature:16};
let passed=0;
async function test(name,run){await run();passed++;console.log('PASS '+name);}
const stalled=(_url,{signal})=>new Promise((resolve,reject)=>{if(signal.aborted)reject(new DOMException('Aborted','AbortError'));else signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true});});
await test('lookup sends coordinates and same-origin request header',async()=>{
 const actual=await requestWeather(37.56,126.98,{fetcher:async(url,init)=>{assert.equal(url,'/api/weather');assert.equal(init.headers['X-L2-Request'],'1');assert.deepEqual(JSON.parse(init.body),{lat:37.56,lng:126.98});return response({weather});}});assert.deepEqual(actual,weather);
});
await test('invalid weather is rejected',()=>assert.rejects(requestWeather(37,127,{fetcher:async()=>response({weather:{condition:'cloud',temperature:999}})})));
await test('quota errors explain manual fallback',()=>assert.rejects(requestWeather(37,127,{fetcher:async()=>response({error:'quota'},503)}),/한도/));
await test('timeout finishes with retry guidance',()=>assert.rejects(requestWeather(37,127,{fetcher:stalled,timeoutMs:10}),/지연/));
await test('closing cancels the request; reopening can fetch again',async()=>{
 const controller=new AbortController();const pending=requestWeather(37,127,{fetcher:stalled,signal:controller.signal});controller.abort();await assert.rejects(pending,{name:'AbortError'});assert.deepEqual(await requestWeather(37,127,{fetcher:async()=>response({weather})}),weather);
});
await test('late response after cancellation is ignored',async()=>{const controller=new AbortController();await assert.rejects(requestWeather(37,127,{signal:controller.signal,fetcher:async()=>{controller.abort();return response({weather});}}),{name:'AbortError'});});
const now=Date.now();const request=(lat=37.56,lng=126.98)=>new Request('https://example.test/api/weather',{method:'POST',body:JSON.stringify({lat,lng})});
await test('server maps provider observations to a validated snapshot',async()=>{const result=await handleWeather(request(),'fixture-key',async()=>response({current:{temp_c:16,is_day:1,condition:{code:1003},last_updated_epoch:Math.floor(now/1000)-300}}),now);assert.equal(result.status,200);assert.equal((await result.json()).weather.temperature,16);});
await test('invalid coordinates never reach the provider',async()=>{assert.equal((await handleWeather(request(999),'fixture-key',async()=>{throw Error('unexpected');},now)).status,400);});
await test('provider key remains server-side and invalid-key failures are safe',async()=>{const result=await handleWeather(request(35,129),'fixture-key',async()=>response({error:{code:2006}},401),now);assert.deepEqual(await result.json(),{error:'configuration'});});
await test('stale provider data is rejected',async()=>{const result=await handleWeather(request(33,126),'fixture-key',async()=>response({current:{temp_c:16,is_day:1,condition:{code:1000},last_updated_epoch:Math.floor(now/1000)-20000}}),now);assert.equal(result.status,503);});
console.log(JSON.stringify({passed}));

// Optional real React lifecycle fixture. No credentials, GPS or user records.
if(process.argv.includes('--serve')){
 const bundle=await build({entryPoints:[root+'scripts/weather-fixture.tsx'],absWorkingDir:root,bundle:true,platform:'browser',format:'esm',write:false,jsx:'automatic',alias:{'@':root+'src'},define:{'process.env.NODE_ENV':'"development"'}});
 const server=createServer(async(req,res)=>{
  if(req.url==='/fixture.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);return;}
  if(req.url==='/api/weather'){for await(const _ of req){}setTimeout(()=>{res.setHeader('Content-Type','application/json');res.end(JSON.stringify({weather}));},1500);return;}
  res.setHeader('Content-Type','text/html');res.end('<!doctype html><html lang="ko"><meta charset="utf-8"><title>Weather lifecycle QA</title><style>body{font:16px system-ui;background:#f7f5f0;color:#171717;padding:24px}button{padding:12px;margin:5px}svg{width:20px;height:20px}.quick-dialog-backdrop{position:fixed;inset:0;background:#0008;display:grid;place-items:center}.quick-dialog-panel{background:white;padding:24px;border-radius:20px}pre{white-space:pre-wrap}</style><div id="root"></div><script type="module" src="/fixture.js"></script></html>');
 });server.listen(3024,'127.0.0.1',()=>console.log('Weather lifecycle fixture: http://127.0.0.1:3024'));
}
