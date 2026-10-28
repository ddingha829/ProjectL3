import assert from 'node:assert/strict';import {build} from 'esbuild';
const b=await build({entryPoints:['src/social/mapRevealMask.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'});
const {createMapRevealMask,containsMaskViewport,paddedMaskFrame}=await import('data:text/javascript;base64,'+Buffer.from(b.outputFiles[0].text).toString('base64'));
const images=[];
class Element{children=[];dataset={};style={setProperty(key,value){this[key]=value;}};parent=null;isConnected=true;append(child){child.remove();child.parent=this;this.children.push(child);}remove(){if(this.parent)this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null;}}
class Image{onload=null;onerror=null;src='';constructor(){images.push(this);}removeAttribute(){this.src='';}ready(){this.onload?.();}}
const oldDocument=globalThis.document,oldImage=globalThis.Image;globalThis.document={createElement:()=>new Element()};globalThis.Image=Image;
try{
 const pane=new Element(),tiles=new Element();pane.style.clipPath='path("M 0 0")';pane.append(tiles);const renderer=createMapRevealMask(pane),window=pane.children[1],view={x:0,y:0,width:393,height:584};let paths=0;const path=()=>{paths++;return 'M 0 0 L 50 0 L 50 50 Z';};
 renderer.update('z11',view,path);assert.equal(window.style.visibility,'hidden');assert.equal(images.length,1);images[0].ready();const original=window.style.maskImage;assert.match(original,/data:image\/svg\+xml/);assert.equal(window.dataset.maskCommits,'1');assert.equal(Number.parseFloat(window.style.left)+Number.parseFloat(tiles.style.left),0);
 for(let i=0;i<100;i++)renderer.update('z11',{...view,x:i-50,y:i/2},path);
 assert.equal(images.length,1);assert.equal(paths,1);assert.equal(window.style.maskImage,original);
 renderer.update('z11',{...view,x:400},path);assert.equal(images.length,2);assert.equal(window.style.maskImage,original);assert.equal(window.style.left,'-256px');renderer.update('z11',{...view,x:410},path);assert.equal(images.length,2);images[1].ready();assert.equal(window.dataset.maskCommits,'2');assert.equal(window.style.left,'144px');assert.equal(Number.parseFloat(window.style.left)+Number.parseFloat(tiles.style.left),0);
 const stable=window.style.maskImage;renderer.update('z12',{...view,x:400},path);const stale=images[2].onload;renderer.update('z13',{...view,x:400},path);stale();assert.equal(window.style.maskImage,stable);images[3].ready();assert.equal(window.dataset.maskCommits,'3');
 const newTiles=new Element();pane.append(newTiles);renderer.update('z13',{...view,x:400},path);assert.equal(newTiles.parent,window);assert.equal(newTiles.style.left,'-144px');
 renderer.update('z14',view,path);const late=images[4].onload;renderer.dispose();late();assert.equal(pane.children.length,0);
 assert.ok(containsMaskViewport(paddedMaskFrame(view),{...view,x:-200,y:200}));assert.equal(containsMaskViewport(paddedMaskFrame(view),{...view,x:400}),false);
 console.log(JSON.stringify({status:'passed',checks:23,panFrames:100,maskDecodesDuringPan:0,verified:['predecode swap','pan alignment','pending reuse','stale decode ignored','late tiles aligned','unmount cleanup']}));
}finally{if(oldDocument===undefined)delete globalThis.document;else globalThis.document=oldDocument;if(oldImage===undefined)delete globalThis.Image;else globalThis.Image=oldImage;}
