import assert from 'node:assert/strict';import {build} from 'esbuild';import {pathToFileURL} from 'node:url';import path from 'node:path';
await build({entryPoints:['src/unified/useStartupAnimation.ts'],outfile:'.test-data/startup-animation.mjs',bundle:true,platform:'node',format:'esm',logLevel:'silent',plugins:[{name:'hooks',setup(b){b.onResolve({filter:/^react$/},()=>({path:'hooks',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:'export const useState=(...a)=>globalThis.__startup.state(...a),useEffect=(...a)=>globalThis.__startup.effect(...a),useCallback=(f)=>f;'}));}}]});
const {useStartupAnimation}=await import(pathToFileURL(path.resolve('.test-data/startup-animation.mjs')));
const names=['matchMedia','document','setTimeout','clearTimeout','__startup'],saved=Object.fromEntries(names.map(n=>[n,Object.getOwnPropertyDescriptor(globalThis,n)]));let checks=0;
function fixture(reduced=false,off=false){let value,initialized=false,effect,cleanup,time=0,id=0;const timers=new Map(),media=new EventTarget();media.matches=reduced;
 globalThis.matchMedia=()=>media;globalThis.document={documentElement:{dataset:off?{motion:'off'}:{}}};globalThis.setTimeout=(fn,ms)=>{timers.set(++id,{fn,at:time+ms});return id;};globalThis.clearTimeout=id=>timers.delete(id);globalThis.__startup={state(initial){if(!initialized){value=initial;initialized=true;}return[value,v=>value=v];},effect(fn){if(!effect)effect=fn;}};
 const render=()=>useStartupAnimation();const current=render();cleanup=effect();return {current,render,media,cleanup,timers,tick(ms){time+=ms;for(const [i,t]of timers)if(t.at<=time){timers.delete(i);t.fn();}}};}
try{
 let f=fixture();assert.equal(f.render().complete,false);checks++;f.tick(2000);assert.equal(f.render().complete,false);checks++;f.current.finish();assert.equal(f.render().complete,true);checks++;assert.equal(f.render().complete,true);checks++;f.cleanup();assert.equal(f.timers.size,0);checks++;
 f=fixture();f.tick(2200);assert.equal(f.render().complete,true);checks++;f.cleanup();
 f=fixture(true);assert.equal(f.render().complete,true);checks++;f.cleanup();
 f=fixture(false,true);assert.equal(f.render().complete,true);checks++;f.cleanup();
 f=fixture();f.media.matches=true;f.media.dispatchEvent(new Event('change'));assert.equal(f.render().complete,true);checks++;f.cleanup();
 console.log(JSON.stringify({status:'passed',checks,coverage:['wait for end event','completion stays latched','fallback prevents lockout','reduced motion','app motion preference','cleanup']}));
}finally{for(const n of names)if(saved[n])Object.defineProperty(globalThis,n,saved[n]);else delete globalThis[n];}
