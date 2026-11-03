import assert from 'node:assert/strict';
import {build} from 'esbuild';
const bundled=await build({entryPoints:['src/server/pushDelivery.ts'],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent',plugins:[{name:'delivery-harness',setup(b){
 b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'mock'}));
 b.onResolve({filter:/notificationRuntime$/},()=>({path:'db',namespace:'mock'}));
 b.onResolve({filter:/integrationSettings$/},()=>({path:'settings',namespace:'mock'}));
 b.onResolve({filter:/^web-push$/},()=>({path:'transport',namespace:'mock'}));
 b.onLoad({filter:/.*/,namespace:'mock'},({path})=>({contents:{empty:'',db:'export const notificationAdmin=()=>globalThis.__delivery.db;',settings:'export const settings=()=>globalThis.__delivery.env;',transport:'export default {sendNotification:(...args)=>globalThis.__delivery.send(...args)};'}[path]}));
}}]});
const {deliverPushJobs}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const job=(id,patch={})=>({id,token:'lease-'+id,subscription:{endpoint:'https://push.apple.com/'+id.padEnd(40,'x'),keys:{auth:'A'.repeat(22),p256dh:'A'.repeat(87)}},payload:{kind:'new-log',title:'PRIVATE CARD TITLE'},...patch});
let batches=[],calls=[],sends=[],errors=new Map();
globalThis.__delivery={env:{WEB_PUSH_PUBLIC_KEY:'public',WEB_PUSH_PRIVATE_KEY:'private'},db:{rpc:async(name,args)=>{calls.push({name,args});if(name==='l2u_push_claim')return {data:batches.shift()||[]};return {error:null};}},send:async(subscription,...rest)=>{sends.push({subscription,rest});if(errors.has(subscription.endpoint))throw errors.get(subscription.endpoint);}};
const reset=()=>{batches=[];calls=[];sends=[];errors=new Map();};
try{
 batches=[[job('ok'),job('retry'),job('gone')]];
 errors.set(job('retry').subscription.endpoint,{statusCode:503,body:'PRIVATE ENDPOINT DETAIL'});errors.set(job('gone').subscription.endpoint,{statusCode:410});
 let result=await deliverPushJobs('author');
 assert.deepEqual(result,{sent:1,claimed:3,failed:1,gone:1,expired:0,failures:{http_503:1,http_410:1}});
 assert.equal(calls[0].args.p_author,'author');
 const finish=id=>calls.find(c=>c.name==='l2u_push_finish'&&c.args.p_job===id).args;
 assert.equal(finish('ok').p_sent,true);assert.equal(finish('retry').p_sent,false);assert.equal(finish('retry').p_gone,false);assert.equal(finish('gone').p_gone,true);
 assert.equal(JSON.stringify(result).includes('PRIVATE'),false);
 reset();batches=[[job('offline')]];errors.set(job('offline').subscription.endpoint,Error('PRIVATE NETWORK URL'));
 result=await deliverPushJobs();assert.equal(result.failures.network,1);assert.equal(result.failed,1);
 reset();batches=[[job('expired',{payload:{kind:'reminder',expiresAt:Date.now()-1000}})]];
 result=await deliverPushJobs();assert.equal(sends.length,0);assert.equal(result.expired,1);assert.equal(finish('expired').p_sent,true);
 reset();batches=[Array.from({length:20},(_,i)=>job('a'+i)),Array.from({length:20},(_,i)=>job('b'+i)),[job('left')]];
 result=await deliverPushJobs();assert.equal(result.claimed,40);assert.equal(sends.length,40);assert.equal(calls.at(-1).name,'l2u_push_wake');
 reset();globalThis.__delivery.db.rpc=async()=>({error:Error('private raw database error')});
 await assert.rejects(()=>deliverPushJobs(),/NOTIFICATION_QUEUE_UNAVAILABLE/);
 console.log(JSON.stringify({status:'passed',checks:17,liveRequests:0}));
}finally{delete globalThis.__delivery;}
