import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import ffmpeg from 'ffmpeg-static';
const execute=promisify(execFile);
export async function encodeVideo(source:Uint8Array,start:number,recorded=false,posterImage?:Uint8Array){
 if(!ffmpeg||!Number.isFinite(start)||start<0||start>118||source.length>50*1024*1024)throw Error('INVALID_VIDEO');
 const folder=await mkdtemp(join(tmpdir(),'ticgle-video-'));
 const input=join(folder,'source'),output=join(folder,'clip.mp4'),poster=join(folder,'poster.webp');
 const began=Date.now();
 const run=(args:string[])=>execute(ffmpeg!,['-nostdin','-hide_banner','-y','-protocol_whitelist','file,pipe',...args],{timeout:Math.max(1000,45000-(Date.now()-began)),maxBuffer:1024*1024,windowsHide:true});
 try{
  await writeFile(input,source);
  let info='';try{await run(['-format_whitelist','mov,mp4,m4a,3gp,3g2,mj2,matroska,webm','-i',input]);}catch(e){info=String((e as {stderr?:string}).stderr||'');}
  const tone=/smpte2084|arib-std-b67/.test(info)?'zscale=t=linear:npl=100,format=gbrpf32le,zscale=p=bt709,tonemap=tonemap=hable:desat=0,zscale=t=bt709:m=bt709:r=tv,format=yuv420p,':'';
  const durationMatch=info.match(/^  Duration: (\d+):(\d+):(\d+(?:\.\d+)?)/m),duration=durationMatch?Number(durationMatch[1])*3600+Number(durationMatch[2])*60+Number(durationMatch[3]):0;
  // Camera clips are already 480p and silent. Keep their natural ~2s length;
  // only non-conforming formats, large files or album segments need encoding.
  const cameraCopy=recorded&&start===0&&source.length<=450000&&duration>=1.7&&duration<=2.5&&/^Input #0, mov,mp4,/m.test(info)&&/^  Stream #0:\d+[^\r\n]*: Video: h264[^\r\n]*\b480x768\b/m.test(info)&&!/^  Stream #[^\r\n]*: Audio:/m.test(info);
  let video:Buffer|undefined=cameraCopy?Buffer.from(source):undefined;
  for(const bitrate of cameraCopy?[]:['600k','450k','300k']){
   const {stdout}=await run(['-ss',String(start),'-format_whitelist','mov,mp4,m4a,3gp,3g2,mj2,matroska,webm','-i',input,'-map','0:v:0','-t',recorded?'2.5':'2','-vf',tone+'fps=15,scale=480:768:force_original_aspect_ratio=increase,crop=480:768,setsar=1','-frames:v',recorded?'38':'30','-an','-sn','-dn','-map_metadata','-1','-c:v','libx264','-preset',recorded?'ultrafast':'fast','-pix_fmt','yuv420p','-b:v',bitrate,'-maxrate',bitrate,'-bufsize','1200k','-movflags','+faststart','-progress','pipe:1',output]);
   const frames=[...stdout.matchAll(/^frame=(\d+)/gm)].at(-1)?.[1];
   if(recorded?Number(frames)<25:Number(frames)!==30)throw Error('VIDEO_TOO_SHORT');
   video=await readFile(output);if(video.length<=450000)break;
  }
  if(!video||video.length>450000)throw Error('VIDEO_TOO_LARGE');
  const supplied=posterImage?Buffer.from(posterImage):undefined;
  const validPoster=cameraCopy&&supplied&&supplied.length>=20&&supplied.length<=307200&&supplied.toString('ascii',0,4)==='RIFF'&&supplied.toString('ascii',8,12)==='WEBP'&&['VP8 ','VP8L','VP8X'].includes(supplied.toString('ascii',12,16))&&supplied.readUInt32LE(4)+8===supplied.length;
  let image:Buffer|undefined=validPoster?supplied:undefined;
  for(const quality of validPoster?[]:['78','60','40']){
   await run(['-ss',String(start),'-i',input,'-map','0:v:0','-frames:v','1','-an','-vf',tone+(recorded?'scale=480:768:force_original_aspect_ratio=increase,crop=480:768,setsar=1':'scale=1080:1728:force_original_aspect_ratio=increase,crop=1080:1728,setsar=1'),'-map_metadata','-1','-c:v','libwebp','-quality',quality,poster]);
   image=await readFile(poster);if(image.length<=307200)break;
  }
  if(!image||image.length>307200)throw Error('POSTER_TOO_LARGE');
  return {video,image,copied:cameraCopy};
 }finally{await rm(folder,{recursive:true,force:true});}
}
