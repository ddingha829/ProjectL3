import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundle=await build({stdin:{contents:"export * from './src/unified/photoUrls';export * from './src/unified/cloudRefresh';",resolveDir:process.cwd()},bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {photoUrls,createRefreshQueue,cloudPollDelay}=await import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64'));
const checks=[],check=(name,run)=>{run();checks.push(name);},deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const originalNow=Date.now;let now=100000;Date.now=()=>now;
try{
 const calls=[],gate=deferred();let wait=gate.promise,denied=false;
 const client={storage:{from(bucket){assert.equal(bucket,'l2u-photos');return {async createSignedUrls(paths,ttl){calls.push({paths,ttl});await wait;return {data:paths.map(path=>({path,signedUrl:denied?'':`https://photo.invalid/${path}?issued=${now}`,error:denied?'denied':null})),error:null};}};}}};
 const first=photoUrls(client,'a',['one','two','one']),overlap=photoUrls(client,'a',['one','two']);
 check('overlapping pages sign each unique photo once in one batch',()=>{assert.equal(calls.length,1);assert.deepEqual(calls[0].paths,['one','two']);assert.equal(calls[0].ttl,60);});
 gate.resolve();const [a,b]=await Promise.all([first,overlap]);check('same account reuses identical authorized image URLs',()=>assert.deepEqual(a,b));
 now+=15000;await photoUrls(client,'a',['one']);check('short-lived memory cache avoids immediate repeat signing',()=>assert.equal(calls.length,1));
 await photoUrls(client,'b',['one']);check('switching accounts never reuses another account signature',()=>assert.equal(calls.length,2));
 now+=15000;await photoUrls(client,'a',['one']);check('photo signatures refresh before their original 60-second expiry',()=>assert.equal(calls.length,3));
 denied=true;const failed=await photoUrls(client,'a',['denied']);check('denied photos do not expose a URL',()=>assert.equal(failed.get('denied'),''));denied=false;await photoUrls(client,'a',['denied']);check('failure does not poison retries',()=>assert.equal(calls.length,5));
 await photoUrls(client,'a',Array.from({length:201},(_,i)=>'large-'+i));check('large boards use bounded batches instead of one request per image',()=>{assert.deepEqual(calls.slice(5).map(c=>c.paths.length),[100,100,1]);});
 await photoUrls(client,'a',[]);check('text-only feeds do not call photo storage',()=>assert.equal(calls.length,8));

 const queue=createRefreshQueue(),jobs=[];const task=()=>{const job=deferred();jobs.push(job);return job.promise;};
 const running=queue.run('account:1',task,false);const duplicates=Array.from({length:25},()=>queue.run('account:1',task,false));
 check('focus and visibility bursts share one read',()=>assert.equal(jobs.length,1));
 queue.run('account:1',task,true);queue.run('account:1',task,true);jobs[0].resolve();await Promise.resolve();
 check('in-flight realtime changes retain exactly one trailing refresh',()=>assert.equal(jobs.length,2));jobs[1].resolve();await Promise.all([running,...duplicates]);
 const old=queue.run('old-account',task);queue.run('old-account',task);const fresh=queue.run('new-account',task);jobs[2].resolve();await old;check('an old account cannot schedule another refresh after a switch',()=>assert.equal(jobs.length,4));jobs[3].resolve();await fresh;
 check('healthy realtime reduces idle polling 90 percent with a 30-second fallback',()=>{assert.equal(cloudPollDelay(true),300000);assert.equal(cloudPollDelay(false),30000);});
 console.log(JSON.stringify({status:'passed',checks:checks.length,verified:checks}));
}finally{Date.now=originalNow;}
