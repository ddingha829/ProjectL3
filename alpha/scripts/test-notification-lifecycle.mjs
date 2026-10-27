import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
import assert from 'node:assert/strict';
await fs.mkdir('.test-data',{recursive:true});const outfile=path.resolve('.test-data/notification-lifecycle.mjs');
await build({entryPoints:['src/unified/useNotifications.ts'],outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent',plugins:[{name:'notification-harness',setup(builder){
 builder.onResolve({filter:/^react$/},()=>({path:'hooks',namespace:'harness'}));
 builder.onResolve({filter:/notificationClient$/},()=>({path:'io',namespace:'harness'}));
 builder.onLoad({filter:/hooks/,namespace:'harness'},()=>({contents:'export const useState=(...a)=>globalThis.__notifyHooks.state(...a);export const useEffect=(...a)=>globalThis.__notifyHooks.effect(...a);export const useRef=(...a)=>globalThis.__notifyHooks.ref(...a);export const useCallback=(...a)=>globalThis.__notifyHooks.callback(...a);'}));
 builder.onLoad({filter:/io/,namespace:'harness'},()=>({contents:'export const notificationRequest=(...a)=>globalThis.__notifyIO.request(...a);export const webPushApplicationKey=()=>new Uint8Array(65);'}));
}}]});
const {default:useNotifications}=await import(pathToFileURL(outfile));
const globalKeys=['window','document','navigator','Notification','matchMedia','localStorage','location','history','__notifyIO','__notifyHooks'];
const original=Object.fromEntries(globalKeys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
const checks=[];
async function run(name,config,check){
 const win=new EventTarget(),doc=new EventTarget(),values=new Map(),slots=[],calls=[],watches=[],cleared=[],shown=[];let cursor=0,pending=[],dirty=false,current,prefs={newLogs:false,nearby:false,lastNearbyAt:null,seenLogIds:[],...config.prefs},geoSuccess;
 const uid='12345678-1234-4234-8234-123456789001';let options={userId:uid,ready:true,logs:[{id:'12345678-1234-4234-8234-123456789002',authorId:'friend',createdAt:1,place:{id:'google:one',lat:37.5,lng:127,name:'Cafe'}}],refresh:async()=>{},onOpen:()=>true,onNotice:()=>{}};
 doc.visibilityState='visible';win.location={};
 const reg={active:{postMessage:()=>{}},pushManager:{getSubscription:async()=>null,subscribe:async()=>({toJSON:()=>({endpoint:'https://fcm.googleapis.com/fcm/send/test',keys:{}})})},showNotification:async(...args)=>shown.push(args)};
 const service=new EventTarget();service.getRegistration=async()=>reg;service.register=async()=>reg;service.ready=Promise.resolve(reg);
 const notification={permission:config.permission||'default',requestPermission(){calls.push('permission');return Promise.resolve(config.deny?'denied':'granted');}};
 win.Notification=notification;
 const globals={window:win,document:doc,navigator:{userAgent:'desktop',platform:'Win32',maxTouchPoints:0,serviceWorker:service,geolocation:{getCurrentPosition(success){calls.push('geolocation');if(config.deferGeo)geoSuccess=success;else success();},watchPosition(success){watches.push(success);return watches.length;},clearWatch(id){cleared.push(id);}}},Notification:notification,matchMedia:()=>({matches:false}),localStorage:{getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)},location:{search:'',href:'https://app.test/'},history:{replaceState:()=>{}},__notifyIO:{request:async(route,body)=>{calls.push({route,body});if(route==='settings'&&!body)return {available:true,pushReady:true,publicKey:'test',preferences:prefs};if(route==='settings'){prefs={...prefs,newLogs:body.newLogs,nearby:body.nearby};return {preferences:prefs};}return {notification:null};}}};
 for(const [key,value]of Object.entries(globals))Object.defineProperty(globalThis,key,{configurable:true,value});
 if(config.device)values.set('l2_notification_device_v1:'+uid,JSON.stringify(config.device));
 const next=()=>cursor++,changed=(deps,previous)=>!previous||deps.some((value,i)=>!Object.is(value,previous.deps[i]));
 globalThis.__notifyHooks={state(initial){const i=next();if(!slots[i])slots[i]={value:initial};return [slots[i].value,value=>{slots[i].value=typeof value==='function'?value(slots[i].value):value;dirty=true;}];},ref(initial){const i=next();return slots[i]??(slots[i]={current:initial});},callback(fn,deps){const i=next();if(changed(deps,slots[i]))slots[i]={value:fn,deps};return slots[i].value;},effect(effect,deps){const i=next();if(changed(deps,slots[i])){const cleanup=slots[i]?.cleanup;slots[i]={effect,deps,cleanup};pending.push(slots[i]);}}};
 const render=update=>{options={...options,...update};cursor=0;pending=[];dirty=false;current=useNotifications(options);for(const effect of pending){effect.cleanup?.();effect.cleanup=effect.effect();}return current;};
 const flush=async()=>{for(let n=0;n<20;n++){await Promise.resolve();if(dirty)render();}};
 try{render();await flush();await check({read:()=>current,flush,render,calls,watches,cleared,shown,doc,options,geo:()=>geoSuccess?.()});checks.push(name);}finally{slots.filter(slot=>slot?.effect).forEach(slot=>slot.cleanup?.());}
}
try{
 await run('loading settings never requests notification/GPS permission',{},async({calls,watches})=>{assert.equal(calls.includes('permission'),false);assert.equal(calls.includes('geolocation'),false);assert.equal(watches.length,0);});
 await run('nearby opt-in asks permission inside the click and saves no coordinates',{},async({read,calls,flush})=>{const pending=read().save({nearby:true,newLogs:false});assert.equal(calls.at(-1),'permission');await pending;await flush();assert.ok(calls.includes('geolocation'));const saved=calls.find(c=>c.body?.action==='save');assert.deepEqual(Object.keys(saved.body).sort(),['action','nearby','newLogs']);assert.equal(read().prefs.nearby,true);});
 await run('denied notification permission leaves preferences unchanged',{deny:true},async({read,calls})=>{await read().save({nearby:true,newLogs:false});assert.equal(calls.some(c=>c.body?.action==='save'),false);assert.equal(calls.includes('geolocation'),false);});
 await run('account switch during location prompt cannot save another account preferences',{deferGeo:true},async({read,flush,render,geo,calls})=>{const pending=read().save({nearby:true,newLogs:false});await flush();render({userId:'different-account'});geo();await pending;assert.equal(calls.some(c=>c.body?.action==='save'),false);});
 await run('nearby watch pauses when the app is hidden',{permission:'granted',prefs:{nearby:true},device:{nearby:true,connected:true}},async({watches,doc,cleared,flush})=>{assert.equal(watches.length,1);doc.visibilityState='hidden';doc.dispatchEvent(new Event('visibilitychange'));await flush();assert.equal(cleared.includes(1),true);});
 await run('six-hour cooldown does not keep GPS running',{permission:'granted',prefs:{nearby:true,lastNearbyAt:Date.now()},device:{nearby:true,connected:true}},async({watches})=>assert.equal(watches.length,0));
 await run('permission denial does not prevent turning a notification off',{permission:'denied',prefs:{newLogs:true,nearby:true},device:{nearby:true,connected:true}},async({read,calls,flush})=>{await read().save({newLogs:false,nearby:true});await flush();assert.equal(read().prefs.newLogs,false);assert.equal(calls.includes('permission'),false);});
 await run('turning another alert off does not silently authorize GPS on a new device',{permission:'granted',prefs:{newLogs:true,nearby:true}},async({read,watches,flush})=>{await read().save({newLogs:false,nearby:true});await flush();assert.equal(watches.length,0);});
}finally{for(const [key,descriptor]of Object.entries(original))if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}
console.log(JSON.stringify({status:'passed',checks}));
