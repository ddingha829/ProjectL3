import {notificationUser,notificationAdmin,json} from '@/server/notificationRuntime';
import {limitedBody} from '@/server/integrationRuntime';
import {reserve} from '@/server/integrationStore';
import {encodeVideo} from '@/server/videoEncoding';
import {access} from 'node:fs/promises';
import ffmpeg from 'ffmpeg-static';
export const runtime='nodejs';
export const maxDuration=120;
export const dynamic='force-dynamic';
export async function GET(){try{if(!ffmpeg)throw Error();await access(ffmpeg);return json({available:true,duration:2,width:480,height:768});}catch{return json({available:false},503);}}
export async function POST(request:Request){
 const user=await notificationUser(request);if(!user)return json({error:'로그인한 뒤 영상을 추가해주세요.'},401);
 const admin=notificationAdmin();let sourcePath='';let jobId='';const uploaded:{bucket:string;path:string}[]=[];
 try{
  const body=JSON.parse(await limitedBody(request,2048));
  if(body.action==='prepare'){
   if(!Number.isInteger(body.size)||body.size<1||body.size>50*1024*1024)return json({error:'50MB 이하의 영상을 선택해주세요.'},400);
   if(await reserve(`video:${user.id}`,10,86400000)===null)return json({error:'영상은 하루에 10번까지 준비할 수 있어요. 내일 다시 이용해주세요.'},429);
   const id=crypto.randomUUID(),path=`${user.id}/${id}/source`;
   const job=await admin.from('l2u_video_jobs').insert({id,owner_id:user.id,path});if(job.error)throw job.error;
   const signed=await admin.storage.from('l2u-video-uploads').createSignedUploadUrl(path);if(signed.error)throw signed.error;
   return json({id,path,token:signed.data.token});
  }
  if(body.action!=='encode'||typeof body.id!=='string'||!Number.isFinite(body.start)||body.start<0||body.start>118)return json({error:'영상 구간을 다시 선택해주세요.'},400);
  const claim=await admin.from('l2u_video_jobs').update({status:'processing'}).eq('id',body.id).eq('owner_id',user.id).eq('status','pending').select('id,path').maybeSingle();
  if(claim.error||!claim.data)return json({error:'이미 처리 중이거나 만료된 영상이에요. 다시 선택해주세요.'},409);
  sourcePath=claim.data.path;jobId=claim.data.id;
  const raw=await admin.storage.from('l2u-video-uploads').download(sourcePath);if(raw.error||!raw.data)throw Error('SOURCE_MISSING');
  if(raw.data.size>50*1024*1024)throw Error('SOURCE_TOO_LARGE');
  const encoded=await encodeVideo(new Uint8Array(await raw.data.arrayBuffer()),body.start);
  const path=`${user.id}/${jobId}.mp4`,imagePath=`${user.id}/${jobId}/video-cover.webp`;
  for(const [bucket,name,content,type]of [['l2u-videos',path,encoded.video,'video/mp4'],['l2u-photos',imagePath,encoded.image,'image/webp']] as const){
   const result=await admin.storage.from(bucket).upload(name,content,{contentType:type,upsert:false,cacheControl:'0'});if(result.error)throw result.error;uploaded.push({bucket,path:name});
  }
  const asset=await admin.from('l2u_video_assets').insert({path,owner_id:user.id,poster_path:imagePath,bytes:encoded.video.length});if(asset.error)throw asset.error;
  await admin.from('l2u_video_jobs').update({status:'done'}).eq('id',jobId);
  const signed=await admin.storage.from('l2u-photos').createSignedUrl(imagePath,3600);if(signed.error)throw signed.error;
  return json({video:{path,bytes:encoded.video.length,duration:2,width:480,height:768},imagePath,image:signed.data.signedUrl});
 }catch(e){
  for(const item of uploaded)await admin.storage.from(item.bucket).remove([item.path]);
  if(jobId){await admin.from('l2u_video_assets').delete().eq('path',`${user.id}/${jobId}.mp4`);await admin.from('l2u_video_jobs').update({status:'failed'}).eq('id',jobId);}
  return json({error:e instanceof Error&&e.message==='VIDEO_TOO_SHORT'?'선택한 구간에 2초 분량이 없어요. 시작 지점을 앞쪽으로 옮겨주세요.':'영상을 준비하지 못했어요. 다른 영상이나 구간으로 다시 시도해주세요.'},422);
 }finally{if(sourcePath)await admin.storage.from('l2u-video-uploads').remove([sourcePath]);}
}
