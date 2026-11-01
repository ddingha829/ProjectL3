import {timingSafeEqual} from 'node:crypto';
import {notificationAdmin,json} from '@/server/notificationRuntime';
import {settings} from '@/server/integrationSettings';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
 const expected=settings().WEB_PUSH_DISPATCH_SECRET,provided=request.headers.get('x-l2-push-secret')||'';
 if(!expected||Buffer.byteLength(expected)!==Buffer.byteLength(provided)||!timingSafeEqual(Buffer.from(expected),Buffer.from(provided)))return json({error:'권한이 없어요.'},401);
 const admin=notificationAdmin(),candidates=await admin.rpc('l2u_video_garbage');if(candidates.error)return json({error:'정리를 다시 시도해주세요.'},503);
 let count=0;
 for(const item of candidates.data||[]){
  const removed=await admin.storage.from(item.bucket).remove([item.path]);if(removed.error)continue;
  if(item.poster){const cover=await admin.storage.from('l2u-photos').remove([item.poster]);if(cover.error)continue;}
  if(item.asset)await admin.from('l2u_video_assets').delete().eq('path',item.asset);
  count++;
 }
 await admin.rpc('l2u_video_prune_jobs');
 return json({removed:count});
}
