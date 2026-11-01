import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
await fs.mkdir('.test-data',{recursive:true});
const outfile=path.resolve('.test-data/kakao-launch-component.mjs');
await build({entryPoints:['src/social/CardImageActions.tsx'],outfile,bundle:true,format:'esm',platform:'node',jsx:'automatic',loader:{'.css':'empty'},external:['lucide-react'],logLevel:'silent',plugins:[{name:'share-harness',setup(b){
 b.onResolve({filter:/^react$/},()=>({path:'hooks',namespace:'qa'}));
 b.onResolve({filter:/^react\/jsx-runtime$/},()=>({path:'jsx',namespace:'qa'}));
 b.onResolve({filter:/kakaoCardShare$/},()=>({path:'kakao',namespace:'qa'}));
 b.onResolve({filter:/cardExport$/},()=>({path:'export',namespace:'qa'}));
 b.onResolve({filter:/editorialExport$/},()=>({path:'editorial',namespace:'qa'}));
 b.onResolve({filter:/ExportActionIcon$/},()=>({path:'icon',namespace:'qa'}));
 b.onLoad({filter:/.*/,namespace:'qa'},({path:p})=>({contents:{hooks:'export const useState=(...a)=>globalThis.__shareHooks.state(...a);export const useRef=(...a)=>globalThis.__shareHooks.ref(...a);export const useEffect=(...a)=>globalThis.__shareHooks.effect(...a);',jsx:'export const Fragment="fragment";export const jsx=(type,props)=>({type,props});export const jsxs=jsx;',kakao:'export const warmKakao=()=>globalThis.__shareMock.warm();export const prepareKakaoCard=(...a)=>globalThis.__shareMock.prepare(...a);',export:'export const isShareCanceled=e=>e instanceof DOMException&&e.name==="AbortError";export const downloadCardFile=()=>{};',editorial:'export const exportEditorialFace=async()=>globalThis.__shareMock.files;export const exportEditorialMode=async()=>globalThis.__shareMock.files;export const saveEditorialFiles=async()=>{};export const pairEditorialFiles=async()=>globalThis.__shareMock.pair;',icon:'export default function Icon(){return null;}' }[p]}));
}}]});
const {default:Actions}=await import(pathToFileURL(outfile));
const originals=Object.fromEntries(['window','navigator','__shareHooks','__shareMock'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
const walk=(node,predicate)=>{if(!node||typeof node!=='object')return; if(predicate(node))return node;for(const child of [node.props?.children].flat(Infinity)){const found=walk(child,predicate);if(found)return found;}};
const text=node=>typeof node==='string'?node:node&&typeof node==='object'?[node.props?.children].flat(Infinity).map(text).join(''):'';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const checks=[];
async function run(name,options,verify){
 const slots=[];let cursor=0,effects=[],tree,gesture=false;const metrics={prepared:0,opened:0,native:0,warmed:0,synchronous:false};
 const file=new File(['mock'],'card.png',{type:'image/png'}),pair=new File(['pair'],'pair.png',{type:'image/png'});
 const nav={userAgent:options.ios===false?'Android Chrome':'iPhone Safari',platform:options.ipad?'MacIntel':'iPhone',maxTouchPoints:options.ipad?5:1,standalone:options.installed!==false,canShare:()=>options.canShare!==false,share(data){metrics.native++;assert.equal(gesture,true,'native share must run inside the click');assert.deepEqual(data.files,globalThis.__shareMock.files);if(options.nativeError)return Promise.reject(options.nativeError);return Promise.resolve();}};
 if(options.ipad)nav.userAgent='Macintosh Safari';
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:nav});Object.defineProperty(globalThis,'window',{configurable:true,value:{matchMedia:()=>({matches:nav.standalone})}});
 globalThis.__shareMock={files:[file],pair,warm:async()=>{metrics.warmed++;},prepare:async image=>{metrics.prepared++;await flush();if(options.prepareError)throw Error('mock upload failed');return()=>{assert.equal(gesture,true,'SDK launch must run inside a fresh click');metrics.synchronous=true;metrics.opened++;};}};
 globalThis.__shareHooks={state(initial){const i=cursor++;if(!(i in slots))slots[i]={value:typeof initial==='function'?initial():initial};return [slots[i].value,v=>{slots[i].value=typeof v==='function'?v(slots[i].value):v;}];},ref(initial){const i=cursor++;return slots[i]??(slots[i]={current:initial});},effect(fn,deps){const i=cursor++,prev=slots[i];if(!prev||deps.some((v,n)=>!Object.is(v,prev.deps[n]))){slots[i]={deps,fn,cleanup:prev?.cleanup};effects.push(slots[i]);}}};
 const render=()=>{cursor=0;effects=[];tree=Actions({root:{current:{}},title:'카드',hasPhoto:true});for(const e of effects){e.cleanup?.();e.cleanup=e.fn();}return tree;};
 const button=label=>walk(tree,n=>n.type==='button'&&(n.props['aria-label']===label||text(n)===label));
 const click=async label=>{const b=button(label);assert.ok(b,`missing ${label}`);assert.ok(!b.props.disabled);gesture=true;b.props.onClick();gesture=false;await flush();await flush();render();render();};
 const alert=()=>text(walk(tree,n=>n.props?.role==='alert'));
 try{render();await click('앞면 1장 선택');render();await verify({metrics,click,button,render,alert,mock:globalThis.__shareMock});checks.push(name);}finally{slots.filter(s=>s?.fn).forEach(e=>e.cleanup?.());}
}
try{
 // Assertions for the primary installed-iPhone route.
 await run('native chooser starts within user activation',{},async({click,metrics,button})=>{await click('카카오톡으로 이미지 보내기');assert.equal(metrics.native,1);assert.equal(metrics.prepared,0);assert.equal(metrics.opened,0);assert.equal(metrics.warmed,0);assert.equal(button('다른 앱으로 공유'),undefined);});
 await run('native cancel keeps files ready without an error',{nativeError:new DOMException('cancel','AbortError')},async({click,button,alert})=>{await click('카카오톡으로 이미지 보내기');assert.equal(alert(),'');assert.ok(button('이미지 저장'));});
 await run('native failure retains a usable save fallback',{nativeError:new Error('blocked')},async({click,button,alert})=>{await click('카카오톡으로 이미지 보내기');assert.match(alert(),/이미지를 저장/);assert.ok(!button('카카오톡으로 이미지 보내기').props.disabled);});
 await run('ordinary iPhone Safari separates upload and SDK launch',{installed:false},async({click,metrics})=>{await click('카카오톡 공유 준비');assert.equal(metrics.prepared,1);assert.equal(metrics.opened,0);await click('카카오톡 열기');assert.equal(metrics.opened,1);assert.equal(metrics.prepared,1);assert.ok(metrics.synchronous);});
 await run('Android uses a fresh click after preparation',{ios:false},async({click,metrics})=>{await click('카카오톡 공유 준비');assert.equal(metrics.opened,0);await click('카카오톡 열기');assert.equal(metrics.opened,1);});
 await run('format changes invalidate a previously prepared launch',{installed:false},async({click,metrics,mock})=>{await click('카카오톡 공유 준비');await click('카카오톡 열기');mock.files=[mock.files[0],new File(['back'],'back.png',{type:'image/png'})];await click('앞뒤 2장 선택');await click('카카오톡 공유 준비');assert.equal(metrics.opened,1);assert.equal(metrics.prepared,2);await click('카카오톡 열기');assert.equal(metrics.opened,2);});
 await run('installed iPad desktop UA uses native files',{ipad:true},async({click,metrics})=>{await click('카카오톡으로 이미지 보내기');assert.equal(metrics.native,1);assert.equal(metrics.prepared,0);});
 await run('no native file support falls back to two-step SDK',{canShare:false},async({click,metrics})=>{await click('카카오톡 공유 준비');assert.equal(metrics.opened,0);await click('카카오톡 열기');assert.equal(metrics.opened,1);});
 await run('SDK preparation error never launches and permits saving',{installed:false,prepareError:true},async({click,metrics,alert,button})=>{await click('카카오톡 공유 준비');assert.equal(metrics.opened,0);assert.match(alert(),/mock upload failed/);assert.ok(button('이미지 저장'));});
}finally{for(const[k,d]of Object.entries(originals))if(d)Object.defineProperty(globalThis,k,d);else delete globalThis[k];}
console.log(JSON.stringify({status:'passed',checks,noActualUploadOrMessage:true}));
