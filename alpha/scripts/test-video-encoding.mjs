import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';import path from 'node:path';import {execFileSync} from 'node:child_process';import ffmpeg from 'ffmpeg-static';import {build} from 'esbuild';
await build({entryPoints:['src/server/videoEncoding.ts'],outfile:'.test-data/videoEncoding.mjs',bundle:true,platform:'node',format:'esm',external:['ffmpeg-static'],logLevel:'silent'});
const {encodeVideo}=await import(pathToFileURL(path.resolve('.test-data/videoEncoding.mjs')));
const fixture='.test-data/clip-source.mp4';execFileSync(ffmpeg,['-y','-f','lavfi','-i','testsrc2=size=640x1024:rate=30','-f','lavfi','-i','sine=frequency=500','-t','3.2','-c:v','libx264','-pix_fmt','yuv420p',fixture],{stdio:'ignore',windowsHide:true});
const encoded=await encodeVideo(await fs.readFile(fixture),.5);await fs.writeFile('.test-data/clip-output.mp4',encoded.video);await fs.writeFile('.test-data/clip-poster.webp',encoded.image);
let probe;try{probe=execFileSync(ffmpeg,['-hide_banner','-i','.test-data/clip-output.mp4'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true});}catch(e){probe=e.stderr;}
if(!/Duration: 00:00:02.00/.test(probe)||!/480x768/.test(probe)||/Audio:/.test(probe))throw Error(probe);
console.log(JSON.stringify({status:'passed',duration:2,width:480,height:768,videoBytes:encoded.video.length,posterBytes:encoded.image.length,audio:false}));
let rejected=false;try{await encodeVideo(await fs.readFile(fixture),3);}catch{rejected=true;}if(!rejected)throw Error('Short segment accepted');console.log('Short segment rejected');
