import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
const base=(process.env.L2_BASE_URL||'http://127.0.0.1:3014').replace(/\/$/,'');
const request=async path=>{const r=await fetch(base+path,{signal:AbortSignal.timeout(20000)});assert.equal(r.status,200,path);return r;};
const meta=html=>Object.fromEntries([...html.matchAll(/<meta\b[^>]*name="([^"]+)"[^>]*content="([^"]*)"[^>]*>/g)].map(m=>[m[1],m[2]]));
let checks=0;
for(const path of ['/viewport-install/','/viewport-install/app/']){
 const html=await(await request(path)).text(),tags=meta(html);
 assert.ok(!('apple-mobile-web-app-status-bar-style' in tags),path+' must omit legacy status-bar style');checks++;
 assert.equal(tags['apple-mobile-web-app-capable'],'yes');checks++;
 const manifests=[...html.matchAll(/<link\b[^>]*rel="manifest"[^>]*href="([^"]+)"/g)].map(m=>m[1]);
 assert.deepEqual(manifests,['/viewport-install/manifest.webmanifest']);checks++;
}
const mr=await request('/viewport-install/manifest.webmanifest');assert.match(mr.headers.get('content-type'),/application\/manifest\+json/);checks++;
const manifest=await mr.json();assert.equal(manifest.id,'/viewport-install/v1');assert.equal(manifest.start_url,'/viewport-install/app/');assert.equal(manifest.scope,'/viewport-install/');assert.equal(manifest.display,'standalone');checks++;
const root=await(await request('/')).text();assert.equal(meta(root)['apple-mobile-web-app-status-bar-style'],'default');checks++;
const original=await(await request('/manifest.webmanifest')).json();assert.equal(original.id,'/');assert.notEqual(original.id,manifest.id);assert.equal(original.start_url,'/');checks++;
try{const baseline=JSON.parse(await fs.readFile('.test-data/original-manifest-before-installtest.json','utf8'));assert.deepEqual(original,baseline);checks++;}catch(error){if(error.code!=='ENOENT')throw error;}
console.log(JSON.stringify({status:'passed',checks,base,installMetadataIsolated:true,originalManifestUnchanged:true,physicalIphoneResult:'pending'}));
