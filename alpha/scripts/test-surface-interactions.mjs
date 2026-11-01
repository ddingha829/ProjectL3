import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
await fs.mkdir('.test-data',{recursive:true});
const outfile=path.resolve('.test-data/surface-interactions.mjs'),checks=[];
await build({stdin:{contents:"export {default as Popover} from './src/components/logbook/CompactPopover';export {default as Navigation} from './src/unified/UnifiedNavigation';",resolveDir:process.cwd(),loader:'tsx'},outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent',external:['lucide-react'],plugins:[{name:'interaction-harness',setup(b){
 b.onResolve({filter:/^(react|react\/jsx-runtime|motion\/react)$/},args=>({path:args.path,namespace:'qa'}));
 b.onResolve({filter:/useMotionPreference$/},()=>({path:'preference',namespace:'qa'}));
 b.onLoad({filter:/.*/,namespace:'qa'},({path:p})=>({contents:p==='react'?'export const useRef=(v)=>globalThis.__surface.ref(v);export const useEffect=(...a)=>globalThis.__surface.effect(...a);export const useId=()=>"qa";':p==='motion/react'?'export const motion=new Proxy({},{get:(_,key)=>"motion."+key});export const AnimatePresence="presence",LayoutGroup="layout-group";export const useIsPresent=()=>globalThis.__surface.present;':p==='preference'?'export const useMotionPreference=()=>globalThis.__surface.reduced;':'export const Fragment="fragment";export const jsx=(type,props)=>({type,props});export const jsxs=jsx;'}));
}}]});
const {Popover,Navigation}=await import(pathToFileURL(outfile));
const saved=Object.fromEntries(['document','requestAnimationFrame','cancelAnimationFrame','__surface'].map(k=>[k,Object.getOwnPropertyDescriptor(globalThis,k)]));
let active=null,frames=[],effects=[],refs=[],index=0,open=false,reduced=false;
const element=(name,attrs={},extra={})=>({name,attrs,getClientRects:()=>[{}],closest:()=>null,getAttribute:key=>attrs[key]??null,focus:()=>{active=nodes[name];},...extra});
const nodes={};for(const [name,attrs]of [['trigger',{}],['first',{}],['selected',{'aria-pressed':'true'}],['last',{}],['next',{}]])nodes[name]=element(name,attrs);
const items=[nodes.first,nodes.selected,nodes.last],panel={querySelectorAll:()=>items,contains:node=>items.includes(node)},anchor={contains:node=>node===nodes.trigger||panel.contains(node)};
const doc=Object.assign(new EventTarget(),{querySelectorAll:()=>[nodes.trigger,...items,nodes.next]});Object.defineProperty(doc,'activeElement',{get:()=>active});
const state={present:true,get reduced(){return reduced;},ref(initial){const i=index++;return refs[i]??(refs[i]={current:initial});},effect(fn){effects.push(fn);}};
const all=(node,test,out=[])=>{if(!node||typeof node!=='object')return out;if(test(node))out.push(node);for(const child of [node.props?.children].flat(Infinity))all(child,test,out);return out;};
const key=(value,shift=false)=>({key:value,shiftKey:shift,preventDefault(){this.prevented=true;},stopPropagation(){this.stopped=true;}});
const render=(isOpen=true)=>{index=0;effects=[];const tree=Popover({label:'Options',open:isOpen,onOpenChange:v=>{open=v;},trigger:'Options',children:()=>null});refs[0].current=anchor;refs[1].current=nodes.trigger;refs[2].current=panel;return tree;};
const surface=tree=>all(tree,n=>typeof n.type==='function')[0];
const trigger=tree=>all(tree,n=>n.type==='motion.button')[0];
try{
 globalThis.document=doc;globalThis.requestAnimationFrame=fn=>{frames.push(fn);return frames.length;};globalThis.cancelAnimationFrame=()=>{};globalThis.__surface=state;
 let tree=render(),cleanup=effects.map(fn=>fn());frames.splice(0).forEach(fn=>fn());assert.equal(active,nodes.selected);checks.push('opening focuses the selected option instead of the first matching button');
 const menu=surface(tree);let e=key('ArrowDown');menu.props.onKeyDown(e);assert.equal(active,nodes.last);menu.props.onKeyDown(key('ArrowDown'));assert.equal(active,nodes.first);menu.props.onKeyDown(key('End'));assert.equal(active,nodes.last);menu.props.onKeyDown(key('Home'));assert.equal(active,nodes.first);assert.equal(e.prevented,true);checks.push('arrows wrap and Home/End reach the first and last available controls');
 active=nodes.last;open=true;e=key('Tab');menu.props.onKeyDown(e);assert.equal(active,nodes.next);assert.equal(open,false);assert.equal(e.prevented,true);checks.push('Tab leaves the panel for the next document control even while its exit is retained');
 active=nodes.first;open=true;menu.props.onKeyDown(key('Tab',true));assert.equal(active,nodes.trigger);assert.equal(open,false);checks.push('Shift+Tab returns to the trigger without losing focus');
 active=nodes.last;open=true;e=key('Escape');menu.props.onKeyDown(e);assert.equal(active,nodes.trigger);assert.equal(open,false);assert.equal(e.stopped,true);checks.push('Escape restores the trigger and cannot also close a containing dialog');
 active=nodes.next;open=true;doc.dispatchEvent(Object.assign(new Event('focusin'),{}));assert.equal(open,false);assert.equal(active,nodes.next);checks.push('outside focus closes without stealing focus back');cleanup.forEach(fn=>fn?.());
 tree=render(false);open=false;trigger(tree).props.onKeyDown(key('ArrowUp'));assert.equal(open,true);tree=render(true);cleanup=effects.map(fn=>fn());frames.splice(0).forEach(fn=>fn());assert.equal(active,nodes.last);cleanup.forEach(fn=>fn?.());checks.push('ArrowUp on the closed trigger opens at the last option');
 state.present=false;let rendered=surface(tree).type(surface(tree).props);assert.equal(rendered.props.inert,true);assert.equal(rendered.props['aria-hidden'],true);checks.push('an exiting popup immediately becomes inert and hidden from accessibility');
 reduced=true;state.present=true;rendered=surface(tree).type(surface(tree).props);assert.deepEqual(rendered.props.transition,{duration:0});assert.equal(rendered.props.initial,false);tree=render(false);assert.equal(trigger(tree).props.whileTap,undefined);assert.equal(trigger(tree).props.whileHover,undefined);checks.push('live reduced-motion preference disables press, hover and overlay movement');
 const nav=Navigation({active:'logs',onChange:()=>{},onCompose:()=>{}}),pill=all(nav,n=>n.props?.className==='un-surface-nav-active-pill')[0];assert.equal(pill.props.layout,false);assert.equal(pill.props.layoutId,undefined);assert.deepEqual(pill.props.transition,{duration:0});checks.push('reduced-motion also disables shared navigation layout projection');
 console.log(JSON.stringify({status:'passed',checks:checks.length,names:checks}));
}finally{for(const [key,value]of Object.entries(saved))if(value)Object.defineProperty(globalThis,key,value);else delete globalThis[key];}
