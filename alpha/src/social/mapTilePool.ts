type Job<T>={key:string;zoom:number;users:number;started:boolean;controller:AbortController;load:(signal:AbortSignal)=>Promise<T>;promise:Promise<T>;resolve:(v:T)=>void;reject:(e:unknown)=>void};
/** Shared bounded source cache: colour layers acquire the same tile job. */
export function createMapTilePool<T>(weight:(value:T)=>number,{maxEntries=32,maxBytes=32*1024*1024,concurrency=4,delay=80}={}){
 const ready=new Map<string,{value:T;zoom:number;bytes:number}>(),jobs=new Map<string,Job<T>>();
 let latest=0,bytes=0,active=0,timer:ReturnType<typeof setTimeout>|null=null;
 const abort=()=>new DOMException('Tile no longer needed','AbortError');
 const trim=()=>{while(ready.size>maxEntries||bytes>maxBytes){let victim:string|undefined,distance=-1;for(const [key,item]of ready){const d=Math.abs(item.zoom-latest);if(d>distance){victim=key;distance=d;}}if(victim===undefined)break;bytes-=ready.get(victim)!.bytes;ready.delete(victim);}};
 const pump=()=>{
  timer=null;
  while(active<concurrency){
   const job=[...jobs.values()].filter(j=>!j.started&&j.users>0).sort((a,b)=>Math.abs(a.zoom-latest)-Math.abs(b.zoom-latest))[0];
   if(!job)break;job.started=true;active++;
   void Promise.resolve().then(()=>job.load(job.controller.signal)).then(value=>{
    if(job.controller.signal.aborted)throw abort();
    const cost=weight(value);if(cost<=maxBytes){ready.set(job.key,{value,zoom:job.zoom,bytes:cost});bytes+=cost;trim();}job.resolve(value);
   }).catch(job.reject).finally(()=>{active--;if(jobs.get(job.key)===job)jobs.delete(job.key);schedule(0);});
  }
 };
 const schedule=(wait=delay)=>{if(timer===null&&[...jobs.values()].some(j=>!j.started&&j.users>0))timer=setTimeout(pump,wait);};
 return {
  acquire(key:string,zoom:number,load:(signal:AbortSignal)=>Promise<T>){
   latest=zoom;
   const cached=ready.get(key);if(cached){ready.delete(key);ready.set(key,cached);return {promise:Promise.resolve(cached.value),release(){}};}
   let job=jobs.get(key);
   if(!job){let resolve!:(v:T)=>void,reject!:(e:unknown)=>void;const promise=new Promise<T>((a,b)=>{resolve=a;reject=b;});job={key,zoom,load,users:0,started:false,controller:new AbortController(),promise,resolve,reject};jobs.set(key,job);}
   job.users++;schedule();let released=false;const held=job;
   return {promise:held.promise,release(){if(released)return;released=true;if(--held.users===0&&jobs.get(key)===held){jobs.delete(key);held.controller.abort();held.reject(abort());if(!jobs.size&&timer!==null){clearTimeout(timer);timer=null;}}}};
  },
  stats:()=>({cached:ready.size,bytes,active,queued:[...jobs.values()].filter(j=>!j.started).length}),
 };
}
