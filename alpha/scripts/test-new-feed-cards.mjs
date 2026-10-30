import assert from 'node:assert/strict';
import {build} from 'esbuild';
const out=await build({entryPoints:['src/unified/useNewFeedCards.ts'],bundle:true,format:'esm',platform:'node',write:false,loader:{'.css':'empty'},plugins:[{name:'hooks',setup(b){b.onResolve({filter:/^react$/},()=>({path:'hooks',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:'export const useRef=(...a)=>globalThis.__arrival.ref(...a);export const useState=(...a)=>globalThis.__arrival.state(...a);export const useEffect=(...a)=>globalThis.__arrival.effect(...a);'}));}}]});
const {default:useArrivals}=await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));
const slots=[],effects=[],listeners=new Map(),storage=new Map(),observers=[];
let cursor=0,owner='a',enabled=true,context='mine',now=1000;
const nodes=Array.from({length:8},(_,i)=>({dataset:{logId:String(i)}}));
const items=nodes.map((n,i)=>({id:n.dataset.logId,createdAt:500+i})),root={current:{querySelectorAll:()=>nodes}};
const originalNow=Date.now;Date.now=()=>now;
globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};
globalThis.document={visibilityState:'visible',addEventListener:(k,f)=>listeners.set(k,f),removeEventListener:k=>listeners.delete(k)};
globalThis.IntersectionObserver=class{constructor(fn){this.fn=fn;this.nodes=[];observers.push(this);}observe(n){this.nodes.push(n);}unobserve(){}disconnect(){this.disconnected=true;}};
globalThis.window={IntersectionObserver,addEventListener(){},removeEventListener(){}};
globalThis.__arrival={ref(v){const i=cursor++;return slots[i]??(slots[i]={current:v});},state(v){const i=cursor++;slots[i]??={value:v};return [slots[i].value,n=>slots[i].value=typeof n==='function'?n(slots[i].value):n];},effect(fn,deps){const i=cursor++;if(!slots[i]||deps.some((v,j)=>v!==slots[i].deps[j])){slots[i]?.cleanup?.();slots[i]={deps};effects.push(()=>slots[i].cleanup=fn());}}};
const render=()=>{cursor=0;useArrivals(owner,enabled,items,root,context);effects.splice(0).forEach(f=>f());};
const show=()=>{const o=observers.at(-1);o.fn(o.nodes.map(target=>({target,isIntersecting:true,intersectionRatio:1})));};
try{
 storage.set('ticgle:feed-visit:v1:a','400');render();render();show();
 assert.equal(nodes.filter(n=>n.dataset.newArrival).length,4);
 enabled=false;render();assert.equal(nodes.filter(n=>n.dataset.newArrival).length,0);
 enabled=true;context='other';render();assert.ok(observers.at(-1).disconnected,'menu return cannot replay four already consumed cards');
 document.visibilityState='hidden';listeners.get('visibilitychange')();now=2000;
 document.visibilityState='visible';listeners.get('visibilitychange')();render();assert.ok(observers.at(-1).disconnected,'old cards are not new on resume');
 owner='b';render();render();assert.equal(storage.get('ticgle:feed-visit:v1:b'),'2000');assert.ok(observers.at(-1).disconnected,'first visit for another account remains quiet');
 console.log(JSON.stringify({status:'passed',checks:6,verified:['four visible highlights','cleanup','no replay between menus','resume boundary','account isolation','first visit quiet']}));
}finally{slots.forEach(s=>s?.cleanup?.());Date.now=originalNow;for(const k of ['__arrival','window','document','localStorage','IntersectionObserver'])delete globalThis[k];}
