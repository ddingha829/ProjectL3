import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import assert from 'node:assert/strict';
import {build} from 'esbuild';

await fs.mkdir('.test-data',{recursive:true});
const outfile=path.resolve('.test-data/notification-onboarding.mjs');
await build({entryPoints:['src/unified/useNotificationOnboarding.ts'],outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent',plugins:[{name:'onboarding-hooks',setup(b){
 b.onResolve({filter:/^react$/},()=>({path:'hooks',namespace:'harness'}));
 b.onLoad({filter:/hooks/,namespace:'harness'},()=>({contents:'export const useState=(...a)=>globalThis.__introHooks.state(...a);export const useEffect=(...a)=>globalThis.__introHooks.effect(...a);'}));
}}]});
const {default:useGuide,shouldOfferNotificationGuide,notificationGuideKey}=await import(pathToFileURL(outfile));
const context={userId:'first-account',ios:true,standalone:true,loaded:true,available:true,pushReady:true,permission:'default',connected:false};
const checks=[];
for(const [name,change,expected]of [
 ['installed iPhone with real login is offered the guide',{},true],
 ['Safari without installation is not prompted',{standalone:false},false],
 ['Android or desktop is not prompted',{ios:false},false],
 ['signed-out and example accounts are not prompted',{userId:''},false],
 ['waits for account notification settings',{loaded:false},false],
 ['unavailable backend is not advertised',{available:false},false],
 ['unconfigured push server is not advertised',{pushReady:false},false],
 ['connected device is not prompted again',{connected:true},false],
 ['dismissed guide is not repeated',{seen:true},false],
 ['denied OS permission is respected',{permission:'denied'},false],
 ['unsupported browser is not prompted',{permission:'unsupported'},false],
 ['already granted permission can configure a fresh account',{permission:'granted'},true],
]){assert.equal(shouldOfferNotificationGuide({...context,seen:false,...change}),expected,name);checks.push(name);}

const keys=['localStorage','requestAnimationFrame','cancelAnimationFrame','__introHooks'];
const original=Object.fromEntries(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
const values=new Map(),frames=new Map(),slots=[];let cursor=0,dirty=false,pending=[],frameId=0,current,options=context,blocked=true;
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:key=>values.get(key)||null,setItem:(key,value)=>values.set(key,value)}});
Object.defineProperty(globalThis,'requestAnimationFrame',{configurable:true,value:callback=>{frames.set(++frameId,callback);return frameId;}});
Object.defineProperty(globalThis,'cancelAnimationFrame',{configurable:true,value:id=>frames.delete(id)});
globalThis.__introHooks={
 state(initial){const i=cursor++;if(!slots[i])slots[i]={value:initial};return [slots[i].value,value=>{if(!Object.is(slots[i].value,value)){slots[i].value=value;dirty=true;}}];},
 effect(effect,deps){const i=cursor++;if(!slots[i]||deps.some((value,n)=>!Object.is(value,slots[i].deps[n]))){const cleanup=slots[i]?.cleanup;slots[i]={effect,deps,cleanup};pending.push(slots[i]);}},
};
const render=()=>{cursor=0;pending=[];dirty=false;current=useGuide(options,blocked);for(const slot of pending){slot.cleanup?.();slot.cleanup=slot.effect();}};
const settle=()=>{for(let n=0;n<12;n++){if(dirty)render();else if(frames.size){const callbacks=[...frames.values()];frames.clear();callbacks.forEach(callback=>callback());}else break;}};
try{
 render();settle();assert.equal(current.open,false);checks.push('waits for the existing tour or other modal');
 blocked=false;render();settle();assert.equal(current.open,true);checks.push('opens after the tour completes');
 blocked=true;render();settle();assert.equal(current.open,false);checks.push('never overlaps another modal');
 blocked=false;render();settle();current.dismiss();settle();assert.equal(current.open,false);assert.equal(values.get(notificationGuideKey(context.userId)),'1');checks.push('Later persists dismissal for this account on this device');
 options={...context,userId:''};render();settle();options=context;render();settle();assert.equal(current.open,false);checks.push('logging in again does not repeat the guide');
 options={...context,userId:'second-account'};render();assert.equal(current.open,false);settle();assert.equal(current.open,true);checks.push('new account has its own guide state without an account-switch flash');
}finally{
 slots.filter(slot=>slot?.effect).forEach(slot=>slot.cleanup?.());
 for(const [key,descriptor]of Object.entries(original))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];
}
console.log(JSON.stringify({status:'passed',checks:checks.length,names:checks}));
