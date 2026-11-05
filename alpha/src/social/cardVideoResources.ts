import type {SupabaseClient} from '@supabase/supabase-js';
/** Limit simultaneous decoders; waiting cards remain still posters. */
export function createCardPlaybackPool(limit=2){
 const waiting=new Map<symbol,(allowed:boolean)=>void>();
 const update=()=>{let index=0;for(const callback of waiting.values())callback(index++<limit);};
 return {request(callback:(allowed:boolean)=>void){const id=Symbol();waiting.set(id,callback);update();return()=>{waiting.delete(id);update();};}};
}
export const cardPlaybackPool=createCardPlaybackPool();
/** Short-lived, account-scoped URL reuse. No media or tokens enter persistent storage. */
export function createCardVideoCache(now=()=>Date.now()){
 const clients=new WeakMap<SupabaseClient,Map<string,{until:number;request:Promise<string>}>>();
 return async(client:SupabaseClient,actor:string,path:string)=>{
  if(!actor||!/^([0-9a-f-]{36})\/([0-9a-f-]{36})\.mp4$/i.test(path))throw Error('INVALID_VIDEO');
  let entries=clients.get(client);if(!entries){entries=new Map();clients.set(client,entries);}const map=entries,key=actor+'\0'+path;
  for(const[id,value]of map)if(value.until<=now()||!id.startsWith(actor+'\0'))map.delete(id);
  const hit=map.get(key);if(hit)return hit.request;
  while(map.size>=48)map.delete(map.keys().next().value!);
  const request=(async()=>{const response=await client.storage.from('l2u-videos').createSignedUrl(path,60);if(response.error||!response.data?.signedUrl)throw Error('VIDEO_UNAVAILABLE');return response.data.signedUrl;})();
  const entry={until:now()+20000,request};map.set(key,entry);void request.catch(()=>{if(map.get(key)===entry)map.delete(key);});return request;
 };
}
export const cardVideoSource=createCardVideoCache();
