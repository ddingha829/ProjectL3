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
 after(async()=>{try{await deliverPushJobs(author);}catch{/* Persistent outbox is retried by pg_cron. No content or endpoints in logs. */}});
 return json({accepted:true},202);
}
