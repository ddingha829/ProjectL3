import type {SupabaseClient} from '@supabase/supabase-js';

// Keep the existing one-minute authorization window. Reuse only within that
// window, in memory, and within the same account and Supabase client.
const SIGNED_SECONDS=60,REUSE_MS=20000,BATCH_SIZE=100,MAX_ENTRIES=600;
type State={urls:Map<string,{url:string;until:number}>;pending:Map<string,Promise<string>>};
const clients=new WeakMap<SupabaseClient,State>();
export async function photoUrls(client:SupabaseClient,actorId:string,paths:string[]):Promise<Map<string,string>>{
 let state=clients.get(client);
 if(!state){state={urls:new Map(),pending:new Map()};clients.set(client,state);}
 const now=Date.now(),store=state,key=(path:string)=>actorId+'\0'+path;
 for(const [id,entry]of store.urls)if(entry.until<=now)store.urls.delete(id);
 const unique=[...new Set(paths.filter(Boolean))],missing:string[]=[],resolvers=new Map<string,(url:string)=>void>();
 const results=unique.map(path=>{
  const id=key(path),cached=store.urls.get(id);
  if(cached)return Promise.resolve([path,cached.url] as const);
  let request=store.pending.get(id);
  if(!request){request=new Promise<string>(resolve=>resolvers.set(path,resolve));store.pending.set(id,request);missing.push(path);}
  return request.then(url=>[path,url] as const);
 });
 for(let i=0;i<missing.length;i+=BATCH_SIZE){
  const batch=missing.slice(i,i+BATCH_SIZE),started=Date.now();
  void(async()=>{
   const signed=new Map<string,string>();
   try{
    const response=await client.storage.from('l2u-photos').createSignedUrls(batch,SIGNED_SECONDS);
    if(!response.error)for(const item of response.data||[])if(item.path&&item.signedUrl&&!item.error)signed.set(item.path,item.signedUrl);
   }catch{/* A failed/denied image stays empty and can be retried next refresh. */}
   finally{for(const path of batch){
    const url=signed.get(path)||'',id=key(path);
    if(url){store.urls.set(id,{url,until:started+REUSE_MS});while(store.urls.size>MAX_ENTRIES)store.urls.delete(store.urls.keys().next().value!);}
    store.pending.delete(id);resolvers.get(path)!(url);
   }}
  })();
 }
 return new Map(await Promise.all(results));
}
