/** Collapse overlapping reads while retaining an invalidation received in flight. */
export function createRefreshQueue(){
 let active:{key:string;again:boolean;promise:Promise<void>}|null=null;
 return {run(key:string,task:()=>Promise<void>,invalidated=true):Promise<void>{
  if(active?.key===key){active.again||=invalidated;return active.promise;}
  const job={key,again:false,promise:Promise.resolve()};active=job;
  job.promise=(async()=>{try{do{job.again=false;await task();}while(active===job&&job.again);}finally{if(active===job)active=null;}})();
  return job.promise;
 }};
}
export const cloudPollDelay=(realtimeReady:boolean)=>realtimeReady?300000:30000;
