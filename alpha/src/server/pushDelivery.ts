import 'server-only';
import webpush from 'web-push';
import {notificationAdmin} from './notificationRuntime';
import {settings} from './integrationSettings';
import {validPushSubscription} from '@/unified/notificationRules';
import {pushTtl} from './pushExpiry';

type Job={id:string;token:string;subscription:webpush.PushSubscription;payload:Record<string,unknown>};
export async function deliverPushJobs(authorId:string|null=null){
 const env=settings();if(!env.WEB_PUSH_PUBLIC_KEY||!env.WEB_PUSH_PRIVATE_KEY)return {sent:0,skipped:'missing-push-keys'};
 const db=notificationAdmin();let sent=0,claimed=0,failed=0,goneCount=0,expired=0;const failures:Record<string,number>={};
 // Bounded work per invocation; the database retry job handles the remaining outbox.
 let lastBatch=0;
 for(let batch=0;batch<2;batch++){
  const result=await db.rpc('l2u_push_claim',{p_limit:20,p_author:authorId});if(result.error)throw Error('NOTIFICATION_QUEUE_UNAVAILABLE');
  const jobs=(result.data||[]) as Job[];lastBatch=jobs.length;claimed+=jobs.length;if(!jobs.length)break;
  for(let offset=0;offset<jobs.length;offset+=5)await Promise.all(jobs.slice(offset,offset+5).map(async job=>{
   const ttl=pushTtl(job.payload);let delivered=ttl===0,gone=!validPushSubscription(job.subscription);
   if(!gone&&ttl>0)try{await webpush.sendNotification(job.subscription,JSON.stringify(job.payload),{TTL:ttl,urgency:'normal',timeout:4500,vapidDetails:{subject:'https://project-l3-nine.vercel.app',publicKey:env.WEB_PUSH_PUBLIC_KEY!,privateKey:env.WEB_PUSH_PRIVATE_KEY!}});delivered=true;sent++;}
   catch(error){const code=(error as {statusCode?:number}).statusCode;gone=code===404||code===410;const category=typeof code==='number'&&Number.isInteger(code)&&code>=400&&code<=599?'http_'+code:'network';failures[category]=(failures[category]||0)+1;}
   if(gone)goneCount++;else if(ttl===0)expired++;else if(!delivered)failed++;
   const finished=await db.rpc('l2u_push_finish',{p_job:job.id,p_token:job.token,p_sent:delivered,p_gone:gone});
   if(finished.error)throw Error('NOTIFICATION_RECEIPT_UNAVAILABLE');
  }));
  if(jobs.length<20)break;
 }
 if(lastBatch===20)await db.rpc('l2u_push_wake');
 return {sent,claimed,failed,gone:goneCount,expired,failures};
}
