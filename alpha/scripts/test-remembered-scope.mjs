import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
await fs.mkdir('.test-data',{recursive:true});
const outfile=path.resolve('.test-data/remembered-scope.mjs');
await build({stdin:{contents:"export {default as useScope} from './src/unified/useRememberedScope';",resolveDir:process.cwd(),loader:'tsx'},outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent',plugins:[{name:'hooks',setup(b){b.onResolve({filter:/^react$/},()=>({path:'hooks',namespace:'qa'}));b.onLoad({filter:/.*/,namespace:'qa'},()=>({contents:'export const useState=(...a)=>globalThis.__scopeHooks.state(...a);export const useRef=(...a)=>globalThis.__scopeHooks.ref(...a);export const useEffect=(...a)=>globalThis.__scopeHooks.effect(...a);export const useCallback=f=>f;'}));}}]});
const {useScope}=await import(pathToFileURL(outfile));
const keys=['location','localStorage','__scopeHooks'],original=Object.fromEntries(keys.map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)])),checks=[];
const storageKey=id=>'ticgle_last_scope_v1:'+id;
function run(name,check,{search='',saved={},blocked=false}={}){
 const storage=new Map(Object.entries(saved)),slots=[];let cursor=0,pending=[],dirty=false,props={owner:'',ready:false,groups:[]},value;
 globalThis.location={search};globalThis.localStorage={getItem(key){if(blocked)throw Error();return storage.get(key)||null;},setItem(key,value){if(blocked)throw Error();storage.set(key,value);}};
 globalThis.__scopeHooks={state(initial){const i=cursor++;if(!(i in slots))slots[i]={value:initial};return [slots[i].value,next=>{const value=typeof next==='function'?next(slots[i].value):next;if(value!==slots[i].value){slots[i].value=value;dirty=true;}}];},ref(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial});},effect(effect,deps){const i=cursor++,previous=slots[i];if(!previous||deps.some((x,n)=>!Object.is(x,previous.deps[n]))){slots[i]={effect,deps};pending.push(effect);}}};
 const render=(update={})=>{props={...props,...update};for(let n=0;n<10;n++){dirty=false;cursor=0;pending=[];value=useScope(props.owner,props.ready,props.groups);for(const effect of pending)effect();if(!dirty)return value;}throw Error('Scope restore render loop');};
 render();check({render,storage,read:()=>value,select(scope){value.setScope(scope);return render();},replay(){slots.filter(slot=>slot?.effect).forEach(slot=>slot.effect());return render();}});checks.push(name);
}
try{
 run('restores the last joined group after membership is loaded',({render})=>{assert.equal(render({owner:'cloud:a'}).scopeReady,false);const value=render({ready:true,groups:['group']});assert.equal(value.scope,'group');assert.equal(value.scopeReady,true);},{saved:{[storageKey('cloud:a')]:'group'}});
 run('persists a selected group and survives a cold start',({render,select,storage})=>{render({owner:'cloud:a',ready:true,groups:['group']});select('group');assert.equal(storage.get(storageKey('cloud:a')),'group');});
 run('an explicit share scope beats a saved group',({render,replay})=>{assert.equal(render({owner:'cloud:a',ready:true,groups:['group','linked']}).scope,'linked');assert.equal(replay().scope,'linked');},{search:'?scope=linked&view=map',saved:{[storageKey('cloud:a')]:'group'}});
 run('explicit personal scope is respected',({render})=>assert.equal(render({owner:'cloud:a',ready:true,groups:['group']}).scope,'mine'),{search:'?scope=mine',saved:{[storageKey('cloud:a')]:'group'}});
 run('unknown entry scope falls back safely',({render})=>assert.equal(render({owner:'cloud:a',ready:true,groups:['group']}).scope,'mine'),{search:'?scope=foreign',saved:{[storageKey('cloud:a')]:'group'}});
 run('leaving a group returns to personal records',({render,storage})=>{assert.equal(render({owner:'cloud:a',ready:true,groups:['group']}).scope,'group');assert.equal(render({groups:[]}).scope,'mine');assert.equal(storage.get(storageKey('cloud:a')),'mine');},{saved:{[storageKey('cloud:a')]:'group'}});
 run('different accounts restore their own group',({render,select,storage})=>{render({owner:'cloud:a',ready:true,groups:['a-group']});select('a-group');render({owner:'',groups:[]});assert.equal(render({owner:'cloud:b',groups:['b-group']}).scope,'b-group');assert.equal(storage.get(storageKey('cloud:a')),'a-group');},{saved:{[storageKey('cloud:b')]:'b-group'}});
 run('the example account never overwrites a real account',({render,select,storage})=>{render({owner:'demo',ready:true,groups:['example']});select('example');assert.equal(storage.get(storageKey('cloud:a')),'group');},{saved:{[storageKey('cloud:a')]:'group'}});
 run('disabled device storage does not prevent using a group',({render,select})=>{render({owner:'cloud:a',ready:true,groups:['group']});assert.equal(select('group').scope,'group');},{blocked:true});
}finally{for(const [key,descriptor] of Object.entries(original)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
console.log(JSON.stringify({status:'passed',checks}));
