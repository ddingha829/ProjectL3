import type {LabLog} from '@/social/model';
import {validYouTubeAttachment,type YouTubeAttachment} from '@/social/youtubeAttachment';
import {isYouTubeVideoId,youtubeVideoUrl} from '@/lib/youtubeMusic';

/** Only our former YouTube thumbnail attachments qualify; photos/works stay intact. */
export function legacyYouTubeId(log:LabLog):string|null{
 if(log.youtube||log.work||log.video)return null;
 try{const url=new URL(log.image),id=url.pathname.match(/^\/vi\/([\w-]{11})\/(?:hqdefault|mqdefault|sddefault|maxresdefault|default)\.jpg$/)?.[1];
  return url.protocol==='https:'&&url.hostname==='i.ytimg.com'&&!url.username&&!url.password&&!url.port&&isYouTubeVideoId(id)?id:null;
 }catch{return null;}
}
const lookups=new Map<string,{expires:number;promise:Promise<YouTubeAttachment|null>}>();
async function lookup(id:string):Promise<YouTubeAttachment|null>{
 const cached=lookups.get(id);if(cached&&cached.expires>Date.now())return cached.promise;
 if(lookups.size>=96)lookups.delete(lookups.keys().next().value!);
 const entry={expires:Date.now()+86400000,promise:Promise.resolve<YouTubeAttachment|null>(null)};
 entry.promise=(async()=>{try{
  const response=await fetch(`/api/music/youtube?url=${encodeURIComponent(youtubeVideoUrl(id))}`,{signal:AbortSignal.timeout(4000)});
  const data=await response.json(),video=data.results?.[0];
  if(!response.ok||!validYouTubeAttachment(video)||video.videoId!==id)throw Error();
  return {videoId:id,title:video.title,channelTitle:video.channelTitle};
 }catch{entry.expires=Date.now()+60000;return null;}})();
 lookups.set(id,entry);return entry.promise;
}
/** Repair rendering of already published cards without editing the user's body/DB.
 * Normal posts make no metadata requests. Repeated IDs share a bounded lookup cache. */
export async function recoverYouTubeLogs<T extends LabLog>(logs:T[],resolve=lookup):Promise<T[]>{
 const ids=[...new Set(logs.map(legacyYouTubeId).filter((id):id is string=>!!id))];
 if(!ids.length)return logs;
 const found=new Map<string,YouTubeAttachment|null>();
 // Keep metadata recovery from creating a burst when a full archive is loaded.
 for(let i=0;i<ids.length;i+=2)await Promise.all(ids.slice(i,i+2).map(async id=>{found.set(id,await resolve(id));}));
 return logs.map(log=>{const id=legacyYouTubeId(log);if(!id)return log;
  const youtube=found.get(id)||{videoId:id,title:log.title||'유튜브 영상',channelTitle:''};
  return {...log,youtube,title:youtube.title.slice(0,150),category:'daily'};
 });
}
