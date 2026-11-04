import assert from 'node:assert/strict';import vm from 'node:vm';import {build} from 'esbuild';
const result=await build({entryPoints:['src/social/cameraVideo.ts'],bundle:true,platform:'browser',format:'cjs',write:false});
function fixture(poster='data:image/webp;base64,'+'A'.repeat(100)){const timers=new Map(),listeners=new Map();let stopped=0,created=0,recorder;const track={stop:()=>stopped++},canvas={width:0,height:0,toDataURL:()=>poster,getContext:()=>({save(){},restore(){},translate(){},scale(){},drawImage(){}}),captureStream:()=>({getTracks:()=>[track]})};class Recorder{static isTypeSupported(type){return type==='video/mp4';}constructor(stream,opts){created++;recorder=this;this.state='inactive';this.mimeType=opts.mimeType+';codecs=avc1';}start(){this.state='recording';this.onstart();}stop(){this.state='inactive';this.ondataavailable({data:new Blob(['clip'],{type:this.mimeType})});this.onstop();}}
const document={hidden:false,createElement:()=>canvas,addEventListener:(type,fn)=>listeners.set(type,fn),removeEventListener:type=>listeners.delete(type)};const module={exports:{}};vm.runInNewContext(result.outputFiles[0].text,{module,exports:module.exports,MediaRecorder:Recorder,HTMLCanvasElement:{prototype:{captureStream(){}}},document,Blob,File,DOMException,setTimeout:(fn,ms)=>{timers.set(ms,fn);return ms;},clearTimeout:id=>timers.delete(id),requestAnimationFrame:()=>1,cancelAnimationFrame:()=>{}});return {record:module.exports.recordCameraVideo,poster:module.exports.cameraVideoPoster,uploadPoster:module.exports.cameraVideoUploadPoster,timers,listeners,document,get stopped(){return stopped},get created(){return created},get recorder(){return recorder}};}
const source={videoWidth:1280,videoHeight:720};
{const f=fixture(),c=new AbortController();let began=0;const promise=f.record(source,{zoom:1,mirrored:false,signal:c.signal,onStart:()=>began++});assert.equal(began,1);assert.equal(f.recorder.state,'recording');assert.deepEqual([...f.timers.keys()],[2000]);f.timers.get(2000)();const file=await promise;assert.equal(file.type,'video/mp4');assert.ok(file.size>0);assert.equal(f.recorder.state,'inactive');assert.equal(f.stopped,1);assert.equal(f.listeners.size,0);}
{const f=fixture(),c=new AbortController();const promise=f.record(source,{zoom:2,mirrored:true,signal:c.signal,onStart(){}});c.abort();await assert.rejects(promise,{name:'AbortError'});assert.equal(f.stopped,1);assert.equal(f.timers.size,0);}
{const f=fixture(),c=new AbortController();const promise=f.record(source,{zoom:1,mirrored:false,signal:c.signal,onStart(){}});f.document.hidden=true;f.listeners.get('visibilitychange')();await assert.rejects(promise,/画面|화면/);assert.equal(f.stopped,1);}
{const f=fixture(),c=new AbortController();c.abort();await assert.rejects(f.record(source,{zoom:1,mirrored:false,signal:c.signal,onStart(){}}),{name:'AbortError'});assert.equal(f.created,0);}
for(const [poster,send] of [
 ['data:image/png;base64,'+'A'.repeat(600000),false],
 ['data:image/png;base64,AAAA',false],
 ['data:image/webp;base64,'+'A'.repeat(409604),false],
 ['data:image/webp;base64,'+'A'.repeat(409600),true],
 ['data:image/webp;base64,AAAA',true],
 ['data:image/webp;base64,***',false],
]){
 const f=fixture(poster),c=new AbortController(),promise=f.record(source,{zoom:1,mirrored:false,signal:c.signal,onStart(){}});f.timers.get(2000)();const file=await promise;
 assert.equal(f.poster(file),poster,'Local preview must stay available even for PNG fallback.');
 const request=JSON.stringify({action:'encode',id:'test-job',start:0,recorded:true,poster:f.uploadPoster(file)});
 assert.ok(Buffer.byteLength(request)<=420000,'Optional cover must not break video request body limit.');
 assert.equal(JSON.parse(request).poster,send?poster:undefined);
}
console.log(JSON.stringify({status:'passed',checks:['automatic stop is scheduled at exactly 2000ms from recording start','silent canvas stream and output file','capture resources and event listeners released','closing discards partial recording','backgrounding discards partial recording','pre-cancelled capture never starts','Safari PNG fallback is retained locally and omitted from upload','oversize or malformed covers fall back to server extraction','bounded WebP covers remain reusable']}));
