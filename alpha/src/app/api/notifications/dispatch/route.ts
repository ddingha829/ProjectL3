import {timingSafeEqual} from 'node:crypto';
import {after} from 'next/server';
import {notificationUser,json} from '@/server/notificationRuntime';
import {deliverPushJobs} from '@/server/pushDelivery';
import {settings} from '@/server/integrationSettings';
export const runtime='nodejs';
export const maxDuration=60;
export async function POST(request:Request){
 const expected=settings().WEB_PUSH_DISPATCH_SECRET,provided=request.headers.get('x-l2-push-secret')||'';
 const internal=!!expected&&Buffer.byteLength(provided)===Buffer.byteLength(expected)&&timingSafeEqual(Buffer.from(provided),Buffer.from(expected));
 let author:string|null=null;
 if(!internal){const user=await notificationUser(request);if(!user)return json({error:'권한이 없어요.'},401);author=user.id;}
 after(async()=>{try{
  const result=await deliverPushJobs(author);
  // Counts and provider status categories only; no card, account or endpoint data.
  console.info('ticgle_push_delivery',{trigger:internal?'server':'author',...result});
 }catch(error){
  const message=error instanceof Error?error.message:'';
  const stage=['NOTIFICATION_QUEUE_UNAVAILABLE','NOTIFICATION_RECEIPT_UNAVAILABLE','NOTIFICATION_UNAVAILABLE'].includes(message)?message:'UNEXPECTED';
  console.error('ticgle_push_delivery_failed',{trigger:internal?'server':'author',stage});
  // Persistent outbox remains available for the existing pg_cron retry.
 }});
 return json({accepted:true},202);
}
