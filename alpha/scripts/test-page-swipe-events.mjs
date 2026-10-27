import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {build} from 'esbuild';
import {pathToFileURL} from 'node:url';
import path from 'node:path';
const outfile=path.resolve('.test-data/page-swipe-events.mjs');
await fs.mkdir('.test-data',{recursive:true});
await build({entryPoints:['src/unified/usePageSwipe.ts'],outfile,bundle:true,platform:'node',format:'esm',logLevel:'silent'});
const {bindPageSwipe}=await import(pathToFileURL(outfile));
// Exercise the production event subscriptions, including iOS pointer cancellation.
class Node extends EventTarget {
 constructor(flags={}){super();Object.assign(this,{flags,isConnected:true,clientWidth:390,scrollWidth:390,parentElement:null,style:{transform:'',removeProperty(key){delete this[key];}},attributes:new Map()});}
 closest(selector){if(selector==='.un-app')return app;if(selector==='button')return this.flags.button?this:null;if(selector==='.un-main,.lab-nav-rail')return root;if(selector==='.leaflet-container')return this.flags.map?this:null;if(selector==='[data-page-swipe-map]')return this.flags.mapEdges?this:null;if(selector.includes('[data-no-swipe]'))return this.flags.blocked?this:null;return null;}
 matches(selector){return selector==='.un-app'&&this===app;}
 querySelectorAll(){return [surface];} getBoundingClientRect(){return {left:18,right:372,width:354};} getClientRects(){return [{}];} getAnimations(){return [];} animate(){return {cancel(){}};}
 setAttribute(k,v){this.attributes.set(k,v);} removeAttribute(k){this.attributes.delete(k);}
}
const app=new Node(),root=new Node(),surface=new Node(),target=new Node({button:true});target.parentElement=app;
class BrowserEvents extends EventTarget {
 addEventListener(type,fn,options){super.addEventListener(type,fn,typeof options==='boolean'?{capture:options}:options);}
 removeEventListener(type,fn,options){super.removeEventListener(type,fn,typeof options==='boolean'?{capture:options}:options);}
}
const windowTarget=new BrowserEvents(),documentTarget=new BrowserEvents();let modal=false;
documentTarget.querySelector=()=>modal?{}:null;
Object.assign(globalThis,{window:windowTarget,document:documentTarget,Element:Node,innerWidth:390,getComputedStyle:node=>({overflowX:node.flags.scroll?'auto':'visible'}),matchMedia:()=>({matches:false})});
const point=(x,y=300,id=7)=>({identifier:id,clientX:x,clientY:y});
function send(type,fields={}){const event=new Event(type,{cancelable:true});Object.defineProperty(event,'target',{value:fields.target||target});for(const [key,value]of Object.entries(fields))if(key!=='target')Object.defineProperty(event,key,{value});windowTarget.dispatchEvent(event);return event;}
function touch(type,touches,changedTouches=touches,other={}){return send(type,{touches,changedTouches,...other});}
function pointer(type,x,y=300,other={}){return send(type,{pointerId:7,pointerType:'mouse',clientX:x,clientY:y,button:0,buttons:type==='pointerup'?0:1,...other});}
let current='logs',calls=[];const suppress={current:0};
const destination=(direction)=>{const views=['logs','map','mosaic','studio'],index=views.indexOf(current)+direction;return index<0?'compose':views[index]||null;};
let release;
function reset(){release?.();calls=[];modal=false;current='logs';target.flags={button:true};target.isConnected=true;target.scrollWidth=390;target.parentElement=app;release=bindPageSwipe(()=>({root:{current:root},canSwipe:direction=>destination(direction)!==null,onSwipe:direction=>calls.push(destination(direction))}),suppress);}
const tests=[];const test=(name,run)=>{reset();run();tests.push(name);};
test('touch right from feed opens log creation',()=>{touch('touchstart',[point(100)]);assert.equal(touch('touchmove',[point(200)]).defaultPrevented,true);touch('touchend',[],[point(260)]);assert.deepEqual(calls,['compose']);});
test('touch left advances to map',()=>{touch('touchstart',[point(300)]);touch('touchmove',[point(200)]);touch('touchend',[],[point(90)]);assert.deepEqual(calls,['map']);});
test('native touch pointercancel cannot discard the touch swipe',()=>{touch('touchstart',[point(300)]);pointer('pointerdown',300,300,{pointerType:'touch'});touch('touchmove',[point(200)]);pointer('pointercancel',200,300,{pointerType:'touch'});touch('touchend',[],[point(90)]);pointer('pointerup',90,300,{pointerType:'touch'});assert.deepEqual(calls,['map']);});
test('touch cancel returns without navigation',()=>{touch('touchstart',[point(300)]);touch('touchmove',[point(200)]);touch('touchcancel',[]);touch('touchend',[],[point(80)]);assert.deepEqual(calls,[]);});
test('two fingers keep pinch zoom ownership',()=>{touch('touchstart',[point(300)]);touch('touchstart',[point(300),point(100,200,8)]);assert.equal(touch('touchmove',[point(200),point(80,200,8)]).defaultPrevented,false);touch('touchend',[],[point(80)]);assert.deepEqual(calls,[]);});
test('vertical scroll is not prevented or navigated',()=>{touch('touchstart',[point(200)]);assert.equal(touch('touchmove',[point(205,360)]).defaultPrevented,false);touch('touchend',[],[point(100,440)]);assert.deepEqual(calls,[]);});
test('tap does not navigate',()=>{touch('touchstart',[point(200)]);touch('touchend',[],[point(201)]);assert.deepEqual(calls,[]);});
test('map drag stays with the map',()=>{target.flags.map=true;touch('touchstart',[point(300)]);assert.equal(touch('touchmove',[point(160)]).defaultPrevented,false);touch('touchend',[],[point(80)]);assert.deepEqual(calls,[]);});
test('tile tray and local controls retain their gestures',()=>{target.flags.blocked=true;touch('touchstart',[point(300)]);touch('touchmove',[point(160)]);touch('touchend',[],[point(80)]);assert.deepEqual(calls,[]);});
test('native horizontal lists keep scrolling',()=>{target.flags.scroll=true;target.scrollWidth=700;touch('touchstart',[point(300)]);assert.equal(touch('touchmove',[point(160)]).defaultPrevented,false);touch('touchend',[],[point(80)]);assert.deepEqual(calls,[]);});
test('system back edge is excluded',()=>{touch('touchstart',[point(10)]);touch('touchmove',[point(100)]);touch('touchend',[],[point(200)]);assert.deepEqual(calls,[]);});
test('open dialog blocks navigation',()=>{modal=true;touch('touchstart',[point(300)]);touch('touchmove',[point(160)]);touch('touchend',[],[point(80)]);assert.deepEqual(calls,[]);});
test('mouse drag still navigates',()=>{pointer('pointerdown',300);pointer('pointermove',170);pointer('pointerup',80);assert.deepEqual(calls,['map']);});
test('mouse pointer cancellation resets the gesture',()=>{pointer('pointerdown',300);pointer('pointermove',170);pointer('pointercancel',170);pointer('pointerup',80);assert.deepEqual(calls,[]);});
test('detached target cannot navigate',()=>{touch('touchstart',[point(300)]);target.isConnected=false;touch('touchmove',[point(160)]);touch('touchend',[],[point(80)]);assert.deepEqual(calls,[]);});
test('tiles and studio swipe in both directions',()=>{for(const [from,expected]of [['mosaic','studio'],['studio',null]]){current=from;touch('touchstart',[point(300)]);touch('touchmove',[point(160)]);touch('touchend',[],[point(80)]);if(expected)assert.equal(calls.at(-1),expected);}assert.deepEqual(calls,['studio']);current='studio';touch('touchstart',[point(100)]);touch('touchmove',[point(200)]);touch('touchend',[],[point(300)]);assert.equal(calls.at(-1),'mosaic');});
test('right map edge swipes inward to tiles',()=>{current='map';target.flags={map:true,mapEdges:true};touch('touchstart',[point(350)]);const moved=touch('touchmove',[point(240)]);assert.equal(moved.defaultPrevented,true);assert.equal(moved.cancelBubble,true);touch('touchend',[],[point(120)]);assert.deepEqual(calls,['mosaic']);});
test('left map edge swipes inward to feed',()=>{current='map';target.flags={map:true,mapEdges:true};touch('touchstart',[point(40)]);touch('touchmove',[point(140)]);touch('touchend',[],[point(240)]);assert.deepEqual(calls,['logs']);});
test('center of a paging-enabled map still pans',()=>{current='map';target.flags={map:true,mapEdges:true};touch('touchstart',[point(220)]);assert.equal(touch('touchmove',[point(120)]).defaultPrevented,false);touch('touchend',[],[point(80)]);assert.deepEqual(calls,[]);});
test('map zoom buttons remain native at the edge',()=>{current='map';target.flags={map:true,mapEdges:true,blocked:true};touch('touchstart',[point(350)]);assert.equal(touch('touchmove',[point(240)]).defaultPrevented,false);touch('touchend',[],[point(120)]);assert.deepEqual(calls,[]);});
test('outward map edge swipe does not navigate',()=>{current='map';target.flags={map:true,mapEdges:true};touch('touchstart',[point(40)]);touch('touchmove',[point(25)]);touch('touchend',[],[point(10)]);assert.deepEqual(calls,[]);});
test('pointer-only touch devices can page',()=>{pointer('pointerdown',300,300,{pointerType:'touch'});pointer('pointermove',170,300,{pointerType:'touch'});pointer('pointerup',80,300,{pointerType:'touch'});assert.deepEqual(calls,['map']);});
test('pointer-first touch events do not navigate twice',()=>{pointer('pointerdown',300,300,{pointerType:'touch'});touch('touchstart',[point(300)]);pointer('pointermove',170,300,{pointerType:'touch'});touch('touchmove',[point(170)]);pointer('pointerup',80,300,{pointerType:'touch'});touch('touchend',[],[point(80)]);assert.deepEqual(calls,['map']);});
test('cleanup removes touch and pointer subscriptions',()=>{release();touch('touchstart',[point(300)]);touch('touchmove',[point(160)]);touch('touchend',[],[point(80)]);pointer('pointerdown',300);pointer('pointermove',170);pointer('pointerup',80);assert.deepEqual(calls,[]);});
release();console.log(JSON.stringify({status:'passed',checks:tests}));
