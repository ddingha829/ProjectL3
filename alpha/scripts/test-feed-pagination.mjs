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

 const observers=[];globalThis.window={};globalThis.IntersectionObserver=class{constructor(callback,config){this.callback=callback;this.config=config;observers.push(this);}observe(node){this.node=node;}disconnect(){this.disconnected=true;}show(){this.callback([{isIntersecting:true}]);}};
 const root={getBoundingClientRect:()=>({top:0,bottom:300}),addEventListener(){},removeEventListener(){}};
 const node={closest:()=>root,getBoundingClientRect:()=>({top:350,bottom:400})};
 options={...options,remote:true,query:{...options.query,scope:'auto'}};result=render();result.sentinel(node);render();await settle();const firstAuto=calls.at(-1);firstAuto.resolve({cursor:{id:'auto-first'},hasMore:true});await settle();result=render();
 const observer=observers.at(-1);assert.equal(observer.node,node);assert.equal(observer.config.root,root);const beforeAuto=calls.length;observer.show();observer.show();assert.equal(calls.length,beforeAuto+1,'automatic trigger is single-flight');assert.equal(calls.at(-1).next.id,'auto-first');render();assert.equal(observer.disconnected,true);
 calls.at(-1).resolve({cursor:{id:'auto-last'},hasMore:false});await settle();result=render();assert.equal(result.count,8);observer.show();assert.equal(calls.length,beforeAuto+1,'disconnected callbacks cannot load another page');
 // Replacing a conditional sentinel must reattach even with unchanged paging state.
 options={...options,remote:false};render();result=render();const replacement={...node};result.sentinel(replacement);render();assert.equal(observers.at(-1).node,replacement);const localBefore=calls.length;observers.at(-1).show();result=render();assert.equal(result.count,12);assert.equal(calls.length,localBefore,'cached/local auto paging makes no network call');
 // Old browsers use passive scroll + one animation frame, rather than a manual button.
 delete globalThis.IntersectionObserver;const frames=new Map();let seq=0;globalThis.requestAnimationFrame=fn=>{frames.set(++seq,fn);return seq;};globalThis.cancelAnimationFrame=id=>frames.delete(id);window.addEventListener=()=>{};window.removeEventListener=()=>{};
 options={...options,remote:true,query:{...options.query,scope:'fallback'}};render();await settle();calls.at(-1).resolve({cursor:{id:'fallback-first'},hasMore:true});await settle();render();const fallbackBefore=calls.length;for(const [id,fn]of [...frames]){frames.delete(id);fn();}assert.equal(calls.length,fallbackBefore+1);render();calls.at(-1).reject(Error('offline'));await settle();result=render();assert.ok(result.error);assert.equal(frames.size,0,'errors stop automatic retry loops');
 console.log(JSON.stringify({status:'passed',checks:32,verified:['first four','single flight','failure retains cursor','retry','stale query ignored','cached pages avoid network','automatic single-flight paging','replaced sentinel reattaches','completed pages stop','local auto paging has no network','scroll fallback','errors do not auto-retry']}));
}finally{for(const slot of slots)slot?.cleanup?.();delete globalThis.__feed;delete globalThis.window;delete globalThis.IntersectionObserver;delete globalThis.requestAnimationFrame;delete globalThis.cancelAnimationFrame;}
