import assert from 'node:assert/strict';
import {build} from 'esbuild';
const output=await build({entryPoints:['src/unified/useFeedPagination.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent',plugins:[{name:'hooks',setup(b){b.onResolve({filter:/^react$/},()=>({path:'hooks',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:'export const useState=(...a)=>globalThis.__feed.state(...a);export const useRef=(...a)=>globalThis.__feed.ref(...a);export const useEffect=(...a)=>globalThis.__feed.effect(...a);export const useCallback=(...a)=>globalThis.__feed.callback(...a);'}));}}]});
const {default:useFeed}=await import('data:text/javascript;base64,'+Buffer.from(output.outputFiles[0].text).toString('base64'));
const slots=[],calls=[];let cursor=0,effects=[],options={enabled:true,remote:true,query:{scope:'mine',category:'all',query:'',sort:'recent',photosOnly:false,saved:false},load:(query,next)=>new Promise((resolve,reject)=>calls.push({query,next,resolve,reject}))};
const changed=(a,b)=>!a||a.some((v,i)=>v!==b[i]);
globalThis.__feed={state(initial){const i=cursor++;slots[i]??={value:initial};return [slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v;}];},ref(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial});},callback(fn,deps){const i=cursor++;if(!slots[i]||changed(slots[i].deps,deps))slots[i]={fn,deps};return slots[i].fn;},effect(fn,deps){const i=cursor++;if(!slots[i]||changed(slots[i].deps,deps)){slots[i]?.cleanup?.();slots[i]={deps};effects.push(()=>{slots[i].cleanup=fn();});}}};
function render(){cursor=0;const result=useFeed(options);for(const effect of effects.splice(0))effect();return result;}
const settle=()=>new Promise(r=>setTimeout(r,5));
try{
 render();await settle();assert.equal(calls.length,1);assert.equal(calls[0].next,undefined);assert.equal(render().loading,true);
 calls[0].resolve({cursor:{date:'2026-10-29',id:'a'},hasMore:true});await settle();let result=render();assert.equal(result.count,4);assert.equal(result.loading,false);
 result.more();result.more();assert.equal(calls.length,2);assert.equal(calls[1].next.id,'a');calls[1].reject(Error('offline'));await settle();result=render();assert.equal(result.count,4);assert.ok(result.error);
 result.more();calls[2].resolve({cursor:{date:'2026-10-28',id:'b'},hasMore:true});await settle();result=render();assert.equal(result.count,8);assert.equal(result.error,'');
 options={...options,enabled:false};render();await settle();options={...options,enabled:true};render();await settle();assert.equal(render().count,8);assert.equal(calls.length,3);
 result.more();options={...options,query:{...options.query,category:'book'}};render();await settle();assert.equal(calls.length,5);calls[3].resolve({cursor:{id:'stale'},hasMore:false});await settle();assert.equal(render().count,4);assert.equal(render().loading,true);
 calls[4].resolve({cursor:{id:'new'},hasMore:false});await settle();result=render();assert.equal(result.hasMore,false);assert.equal(result.count,4);
 options={...options,remote:false};render();await settle();render().more();assert.equal(render().count,8);assert.equal(calls.length,5);
 console.log(JSON.stringify({status:'passed',checks:20,verified:['first four','single flight','failure retains cursor','retry','stale query ignored','cached pages avoid network']}));
}finally{for(const slot of slots)slot?.cleanup?.();delete globalThis.__feed;}
