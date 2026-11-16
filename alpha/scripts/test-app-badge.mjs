import assert from 'node:assert/strict';import {build} from 'esbuild';
const built=await build({entryPoints:['src/unified/appBadge.ts'],bundle:true,write:false,platform:'node',format:'esm'});const {syncAppBadge,clearAppBadge}=await import('data:text/javascript;base64,'+Buffer.from(built.outputFiles[0].text).toString('base64'));
const original=Object.getOwnPropertyDescriptor(globalThis,'navigator'),calls=[],messages=[];const setNavigator=value=>Object.defineProperty(globalThis,'navigator',{value,configurable:true});
try{
 setNavigator({});await syncAppBadge('a',3,100);assert.deepEqual(calls,[],'unsupported platforms do nothing');
 setNavigator({setAppBadge:async count=>calls.push(count),clearAppBadge:async()=>calls.push(0)});await syncAppBadge('a',3,100);await syncAppBadge('a',0,200);assert.deepEqual(calls,[3,0],'foreground count and read-to-clear work without a worker');
 calls.length=0;setNavigator({setAppBadge:async count=>calls.push(count),clearAppBadge:async()=>calls.push(0),serviceWorker:{getRegistration:async()=>({active:{postMessage:message=>messages.push(message)}})}});
 await syncAppBadge('a',7,300);assert.equal(calls.length,0,'active worker owns timestamp ordering instead of racing a page badge update');assert.deepEqual(messages[0],{type:'L2_APP_BADGE',ownerId:'a',count:7,updatedAt:300});
 await clearAppBadge();assert.deepEqual(calls,[0],'logout clears the local icon even before the account message is processed');
 await syncAppBadge('a',-1,300);await syncAppBadge('a',NaN,300);assert.equal(messages.length,1,'invalid counts are never sent');
 setNavigator({setAppBadge:async()=>{throw Error('permission denied')}});await syncAppBadge('a',2,400);await clearAppBadge();
 console.log('PASS foreground badge support detection, worker ordering, read clearing, logout clearing and denied-permission fallback');
}finally{if(original)Object.defineProperty(globalThis,'navigator',original);else delete globalThis.navigator;}
