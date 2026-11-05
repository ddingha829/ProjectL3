import {pathToFileURL} from 'node:url';
import fs from 'node:fs/promises';import path from 'node:path';import {execFileSync} from 'node:child_process';import ffmpeg from 'ffmpeg-static';import {build} from 'esbuild';
await build({entryPoints:['src/server/videoEncoding.ts'],outfile:'.test-data/videoEncoding.mjs',bundle:true,platform:'node',format:'esm',external:['ffmpeg-static'],logLevel:'silent'});
const {encodeVideo}=await import(pathToFileURL(path.resolve('.test-data/videoEncoding.mjs')));
const fixture='.test-data/clip-source.mp4';execFileSync(ffmpeg,['-y','-f','lavfi','-i','testsrc2=size=640x1024:rate=30','-f','lavfi','-i','sine=frequency=500','-t','3.2','-c:v','libx264','-pix_fmt','yuv420p',fixture],{stdio:'ignore',windowsHide:true});
const encoded=await encodeVideo(await fs.readFile(fixture),.5);await fs.writeFile('.test-data/clip-output.mp4',encoded.video);await fs.writeFile('.test-data/clip-poster.webp',encoded.image);
let probe;try{probe=execFileSync(ffmpeg,['-hide_banner','-i','.test-data/clip-output.mp4'],{encoding:'utf8',stdio:['ignore','pipe','pipe'],windowsHide:true});}catch(e){probe=e.stderr;}
if(!/Duration: 00:00:02.00/.test(probe)||!/480x768/.test(probe)||!/15 fps/.test(probe)||/Audio:/.test(probe))throw Error(probe);
console.log(JSON.stringify({status:'passed',duration:2,width:480,height:768,videoBytes:encoded.video.length,posterBytes:encoded.image.length,audio:false}));
let rejected=false;try{await encodeVideo(await fs.readFile(fixture),3);}catch{rejected=true;}if(!rejected)throw Error('Short segment accepted');console.log('Short segment rejected');

const shortFixture='.test-data/camera-clip-source.mp4';execFileSync(ffmpeg,['-y','-f','lavfi','-i','testsrc2=size=480x768:rate=24','-t','1.92','-c:v','libx264','-pix_fmt','yuv420p',shortFixture],{stdio:'ignore',windowsHide:true});
const captured=await encodeVideo(await fs.readFile(shortFixture),0,true);await fs.writeFile('.test-data/camera-clip-output.mp4',captured.video);let capturedProbe='';try{execFileSync(ffmpeg,['-hide_banner','-i','.test-data/camera-clip-output.mp4'],{stdio:['ignore','pipe','pipe'],windowsHide:true});}catch(e){capturedProbe=String(e.stderr);}
if(!/Duration: 00:00:01.92/.test(capturedProbe)||/Audio:/.test(capturedProbe)||!captured.copied||!captured.video.equals(await fs.readFile(shortFixture)))throw Error(capturedProbe);
const clientCover=await encodeVideo(await fs.readFile(shortFixture),0,true,captured.image);if(!clientCover.copied||!clientCover.image.equals(captured.image))throw Error('Client camera cover was re-encoded');
let shortCaptureRejected=false;try{await encodeVideo(await fs.readFile(fixture),3,true);}catch{shortCaptureRejected=true;}if(!shortCaptureRejected)throw Error('Partial camera capture accepted');console.log('Camera duration is preserved without re-encoding, client cover reused, partial captures rejected');

const webmFixture='.test-data/camera-fallback.webm';execFileSync(ffmpeg,['-y','-f','lavfi','-i','testsrc2=size=480x768:rate=24','-t','2.1','-c:v','libvpx','-deadline','realtime','-cpu-used','8','-b:v','500k',webmFixture],{stdio:'ignore',windowsHide:true});
const fallback=await encodeVideo(await fs.readFile(webmFixture),0,true);if(fallback.copied||fallback.video.length>450000)throw Error('Camera compatibility fallback failed');console.log('WebM camera fallback produces bounded MP4');
