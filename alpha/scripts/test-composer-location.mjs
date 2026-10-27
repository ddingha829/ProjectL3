import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
await fs.mkdir('.test-data',{recursive:true});
const outfile=path.resolve('.test-data/composer-location.mjs');
await build({stdin:{contents:"export {default as ComposerLocation} from './src/social/ComposerLocation';",resolveDir:process.cwd(),loader:'tsx'},outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent',jsx:'automatic',external:['lucide-react','react-dom'],plugins:[{name:'location-hook-harness',setup(builder){
 builder.onResolve({filter:/^react$/},()=>({path:'hooks',namespace:'harness'}));
 builder.onResolve({filter:/^react\/jsx-runtime$/},()=>({path:'jsx',namespace:'harness'}));
 builder.onLoad({filter:/hooks/,namespace:'harness'},()=>({contents:'export const useState=(...args)=>globalThis.__locationHooks.state(...args);export const useEffect=(...args)=>globalThis.__locationHooks.effect(...args);export const useRef=(...args)=>globalThis.__locationHooks.ref(...args);export const useCallback=(...args)=>globalThis.__locationHooks.callback(...args);export const useId=()=>"id";'}));
 builder.onLoad({filter:/jsx/,namespace:'harness'},()=>({contents:'export const Fragment="fragment";export const jsx=(type,props)=>({type,props});export const jsxs=jsx;'}));
}}]});
const {ComposerLocation}=await import(pathToFileURL(outfile));
const original=Object.fromEntries(['navigator','__locationHooks'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
const checks=[];
function walk(node,predicate){if(!node||typeof node!=='object')return; if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=walk(child,predicate);if(found)return found;}}
function text(node){if(typeof node==='string')return node;if(!node||typeof node!=='object')return '';return [node.props?.children].flat(Infinity).map(text).join('');}
function run(name,check,initial={}){
 const slots=[],requests=[],changes=[];let cursor=0,pending=[],props={active:true,automatic:true,work:false,...initial,onChange:value=>changes.push(value)},tree;
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{geolocation:{getCurrentPosition(success,failure){requests.push({success,failure});}}}});
 const next=()=>cursor++;
 globalThis.__locationHooks={
  state(initial){const i=next();if(!(i in slots))slots[i]={value:initial};return [slots[i].value,value=>{slots[i].value=typeof value==='function'?value(slots[i].value):value;}];},
  ref(initial){const i=next();return slots[i]??(slots[i]={current:initial});},
  callback(value){const i=next();return slots[i]??(slots[i]=value);},
  effect(effect,deps){const i=next(),previous=slots[i];if(!previous||deps.some((value,index)=>!Object.is(value,previous.deps[index]))){slots[i]={effect,deps,cleanup:previous?.cleanup};pending.push(slots[i]);}},
 };
 const render=(update={})=>{props={...props,...update};cursor=0;pending=[];tree=ComposerLocation(props);for(const effect of pending){effect.cleanup?.();effect.cleanup=effect.effect();}return tree;};
 const button=label=>walk(tree,node=>node.type==='button'&&(node.props['aria-label']===label||text(node)===label));
 const context={requests,changes,render,button,strictReplay(){const effects=slots.filter(slot=>slot?.effect);effects.forEach(effect=>effect.cleanup?.());effects.forEach(effect=>{effect.cleanup=effect.effect();});}};
 try{render();check(context);checks.push(name);}finally{slots.filter(slot=>slot?.effect).forEach(effect=>effect.cleanup?.());}
}
try{
 run('automatic location starts once',({requests,render})=>{assert.equal(requests.length,1);render();assert.equal(requests.length,1);});
 run('StrictMode replay restarts a cancelled lookup',({requests,strictReplay})=>{strictReplay();assert.equal(requests.length,2);});
 run('late errors cannot stop the newer location lookup',({requests,strictReplay,render,button})=>{strictReplay();requests[0].failure({code:2});render();assert.match(text(button('현재 위치 및 근처 장소')),/위치 확인 중/);requests[1].failure({code:2});render();assert.doesNotMatch(text(button('현재 위치 및 근처 장소')),/위치 확인 중/);});
 run('permission denial leaves a manual location choice',({requests,render,button})=>{requests[0].failure({code:1});render();assert.match(text(button('현재 위치 및 근처 장소')),/위치 선택/);button('현재 위치 및 근처 장소').props.onClick();render();assert.ok(button('위치 없이'));});
 run('location-free choice stops the pending indicator',({requests,render,button,changes})=>{button('현재 위치 및 근처 장소').props.onClick();render();button('위치 없이').props.onClick();render();assert.doesNotMatch(text(button('현재 위치 및 근처 장소')),/위치 확인 중/);requests[0].failure({code:2});assert.deepEqual(changes,[undefined]);});
 run('switching to a work cancels GPS and switching back retries',({requests,render})=>{render({work:true});assert.equal(requests.length,1);render({work:false});assert.equal(requests.length,2);});
 run('editing does not request GPS automatically',({requests,render})=>{assert.equal(requests.length,0);render();assert.equal(requests.length,0);},{automatic:false});
 run('work entry never asks for GPS',({requests,render})=>{assert.equal(requests.length,0);render();assert.equal(requests.length,0);},{work:true});
}finally{for(const [key,descriptor] of Object.entries(original)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
console.log(JSON.stringify({status:'passed',checks}));
