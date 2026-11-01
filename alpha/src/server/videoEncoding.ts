import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ffmpeg from 'ffmpeg-static';
const execute=promisify(execFile);
export async function encodeVideo(source:Uint8Array,start:number){
 if(!ffmpeg||!Number.isFinite(start)||start<0||start>118||source.length>50*1024*1024)throw Error('INVALID_VIDEO');
 const folder=await mkdtemp(join(tmpdir(),'ticgle-video-'));
 const input=join(folder,'source'),output=join(folder,'clip.mp4'),poster=join(folder,'poster.webp');
 const began=Date.now();
 const run=(args:string[])=>execute(ffmpeg!,['-nostdin','-hide_banner','-y','-protocol_whitelist','file,pipe',...args],{timeout:Math.max(1000,45000-(Date.now()-began)),maxBuffer:1024*1024,windowsHide:true});
 try{
  await writeFile(input,source);
  let info='';try{await run(['-format_whitelist','mov,mp4,m4a,3gp,3g2,mj2,matroska,webm','-i',input]);}catch(e){info=String((e as {stderr?:string}).stderr||'');}
  const tone=/smpte2084|arib-std-b67/.test(info)?'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,':'';
  let video:Buffer|undefined;
  for(const bitrate of ['1000k','700k','450k']){
   const {stdout}=await run(['-ss',String(start),'-format_whitelist','mov,mp4,m4a,3gp,3g2,mj2,matroska,webm','-i',input,'-map','0:v:0','-t','2','-vf',tone+'fps=24,scale=480:768:force_original_aspect_ratio=increase,crop=480:768,setsar=1','-frames:v','48','-an','-sn','-dn','-map_metadata','-1','-c:v','libx264','-preset','fast','-pix_fmt','yuv420p','-b:v',bitrate,'-maxrate',bitrate,'-bufsize','1200k','-movflags','+faststart','-progress','pipe:1',output]);
   const frames=[...stdout.matchAll(/^frame=(\d+)/gm)].at(-1)?.[1];
   if(Number(frames)!==48)throw Error('VIDEO_TOO_SHORT');
   video=await readFile(output);if(video.length<=450000)break;
  }
  if(!video||video.length>450000)throw Error('VIDEO_TOO_LARGE');
  let image:Buffer|undefined;
  for(const quality of ['78','60','40']){
   await run(['-ss',String(start),'-i',input,'-map','0:v:0','-frames:v','1','-an','-vf',tone+'scale=1080:1728:force_original_aspect_ratio=increase,crop=1080:1728,setsar=1','-map_metadata','-1','-c:v','libwebp','-quality',quality,poster]);
   image=await readFile(poster);if(image.length<=307200)break;
  }
  if(!image||image.length>307200)throw Error('POSTER_TOO_LARGE');
  return {video,image};
 }finally{await rm(folder,{recursive:true,force:true});}
}
