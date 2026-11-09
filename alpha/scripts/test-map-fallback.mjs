import assert from 'node:assert/strict';import {build} from 'esbuild';
const b=await build({entryPoints:['src/social/simpleMapLayer.ts'],bundle:true,platform:'node',format:'esm',write:false});const {simpleMapLayer}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const saved={fetch:globalThis.fetch,document:globalThis.document,Image:globalThis.Image,setTimeout:globalThis.setTimeout};let timeout,aborted=false,images=0;
class Grid{static extend(methods){class C extends Grid{constructor(options){super();this.options=options;}}Object.assign(C.prototype,methods);return C;}on(){return this;}}
try{
 globalThis.setTimeout=(fn,ms,...args)=>{if(ms===2500){timeout=ms;return saved.setTimeout(fn,1,...args);}return saved.setTimeout(fn,ms,...args);};
 globalThis.document={createElement:()=>({width:0,height:0,dataset:{},getContext:()=>({drawImage(){}})})};
 globalThis.fetch=(_url,{signal})=>new Promise((_,reject)=>signal.addEventListener('abort',()=>{aborted=true;reject(new DOMException('Aborted','AbortError'));},{once:true}));
 globalThis.Image=class{set src(v){images++;queueMicrotask(()=>this.onload?.());}removeAttribute(){}};
 const layer=simpleMapLayer({GridLayer:Grid},{});const tile=await new Promise((resolve,reject)=>{let c;c=layer.createTile({z:9,x:5,y:4},error=>error?reject(error):resolve(c));});
 assert.equal(timeout,2500);assert.equal(aborted,true);assert.equal(images,1);assert.equal(tile.dataset.source,'raster-fallback');console.log('PASS stalled vector request aborts after 2.5s budget and completes via raster fallback');
}finally{Object.assign(globalThis,saved);}
