import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';

// Exercise the install hook against browser lifecycle events without installing an app.
await fs.mkdir('.test-data',{recursive:true});
const outfile=path.resolve('.test-data/pwa-install-hook.mjs');
await build({stdin:{contents:"export {usePwaInstall} from './src/components/PwaInstallControl';",resolveDir:process.cwd(),loader:'tsx'},outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent',external:['lucide-react','react-dom','react/jsx-runtime'],plugins:[{name:'hook-harness',setup(builder){
 builder.onResolve({filter:/^react$/},()=>({path:'react',namespace:'harness'}));
 builder.onLoad({filter:/.*/,namespace:'harness'},()=>({contents:'export const useState=(...args)=>globalThis.__pwaHooks.state(...args);export const useEffect=(...args)=>globalThis.__pwaHooks.effect(...args);export const useRef=()=>({current:null});export const useId=()=>"id";'}));
}}]});
const {usePwaInstall}=await import(pathToFileURL(outfile));
const original=Object.fromEntries(['window','document','__pwaHooks'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
const checks=[];
async function run(name,options,check){
 const win=new EventTarget(),media=new EventTarget(),states=[],effects=[],cleanups=[];let cursor=0,mounted=false;
 media.matches=Boolean(options.app);
 win.matchMedia=()=>media;win.navigator={userAgent:options.ua||'desktop',platform:options.platform||'Win32',maxTouchPoints:options.touch||0,standalone:options.iosApp};
 globalThis.window=win;globalThis.document={documentElement:{dataset:{}}};
 globalThis.__pwaHooks={state(initial){const index=cursor++;if(!(index in states))states[index]=initial;return [states[index],next=>{states[index]=typeof next==='function'?next(states[index]):next;}];},effect(effect){if(!mounted)effects.push(effect);}};
 const render=()=>{cursor=0;return usePwaInstall();};
 const first=render();mounted=true;effects.forEach(effect=>cleanups.push(effect()));
 const context={first,read:render,win,media,changeApp(value){media.matches=value;media.dispatchEvent(new Event('change'));}};
 try{await check(context);checks.push(name);}finally{cleanups.forEach(cleanup=>cleanup?.());}
}
function nativePrompt(outcome='accepted',fail=false){
 const event=new Event('beforeinstallprompt',{cancelable:true});let calls=0;
 event.userChoice=Promise.resolve({outcome,platform:'web'});event.prompt=async()=>{calls++;if(fail)throw new Error('unavailable');};
 return {event,calls:()=>calls};
}
try{
 await run('browser control waits for client detection',{},({first,read})=>{assert.equal(first.ready,false);assert.equal(read().ready,true);assert.equal(read().isStandalone,false);});
 await run('installed display mode hides installation control',{app:true},({read})=>assert.equal(read().isStandalone,true));
 await run('iOS home-screen mode is recognized',{iosApp:true,ua:'iPhone'},({read})=>{assert.equal(read().isStandalone,true);assert.equal(read().platform,'ios');});
 await run('desktop-mode iPad receives iPhone/iPad instructions',{platform:'MacIntel',touch:5},({read})=>assert.equal(read().platform,'ios'));
 await run('Android receives Android instructions',{ua:'Mozilla Android Chrome'},({read})=>assert.equal(read().platform,'android'));
 await run('Kakao in-app browser gets an external browser handoff',{ua:'Mozilla Android KAKAOTALK'},({read})=>assert.equal(read().inAppName,'카카오톡'));
 await run('unsupported browsers open the manual guide',{},async({read})=>{assert.equal(await read().triggerInstall(),'guide');assert.equal(read().guideOpen,true);assert.equal(read().canPromptNative,false);});
 await run('native install event is used once',{},async({read,win})=>{const prompt=nativePrompt();win.dispatchEvent(prompt.event);assert.equal(prompt.event.defaultPrevented,true);assert.equal(read().canPromptNative,true);assert.equal(await read().triggerInstall(),'installed');assert.equal(read().canPromptNative,false);await read().triggerInstall();assert.equal(prompt.calls(),1);assert.equal(read().guideOpen,true);});
 await run('dismissed install keeps the manual guide available',{},async({read,win})=>{const prompt=nativePrompt('dismissed');win.dispatchEvent(prompt.event);assert.equal(await read().triggerInstall(),'guide');assert.equal(read().guideOpen,true);assert.equal(read().canPromptNative,false);});
 await run('native prompt failure falls back to the guide',{},async({read,win})=>{const prompt=nativePrompt('accepted',true);win.dispatchEvent(prompt.event);assert.equal(await read().triggerInstall(),'guide');assert.equal(read().canPromptNative,false);});
 await run('install completion closes and hides the guide',{},({read,win})=>{read().openGuide();win.dispatchEvent(new Event('appinstalled'));assert.equal(read().isStandalone,true);assert.equal(read().guideOpen,false);});
 await run('switching to an app window closes the guide',{},({read,changeApp})=>{read().openGuide();changeApp(true);assert.equal(read().isStandalone,true);assert.equal(read().guideOpen,false);changeApp(false);assert.equal(read().isStandalone,false);});
 await run('returning to the page checks app display again',{},({read,win,media})=>{media.matches=true;win.dispatchEvent(new Event('pageshow'));assert.equal(read().isStandalone,true);});
}finally{for(const [key,descriptor] of Object.entries(original)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
console.log(JSON.stringify({status:'passed',checks}));
