import {plainMediaText} from '@/lib/media';
import {isYouTubeVideoId,youtubeThumbnail,youtubeVideoId,youtubeVideoUrl,type YouTubeMusicResult} from '@/lib/youtubeMusic';
import {sameOrigin} from './requestOrigin';

type JsonObject=Record<string,unknown>;
const object=(value:unknown):JsonObject=>value&&typeof value==='object'&&!Array.isArray(value)?value as JsonObject:{};
export class YouTubeMusicError extends Error{
 constructor(public status:number,message:string){super(message);}
}
function result(videoId:string,title:unknown,channel:unknown,thumbnail:unknown,width:unknown,height:unknown):YouTubeMusicResult|null{
 const cleanTitle=plainMediaText(title).slice(0,240),channelTitle=plainMediaText(channel).slice(0,150);
 const w=Number(width),h=Number(height),valid=Number.isInteger(w)&&Number.isInteger(h)&&w>=100&&w<=4096&&h>=100&&h<=4096&&w/h>=.5&&w/h<=2;
 return cleanTitle&&channelTitle?{videoId,title:cleanTitle,channelTitle,thumbnailUrl:youtubeThumbnail(thumbnail,videoId),thumbnailWidth:valid?w:480,thumbnailHeight:valid?h:360,url:youtubeVideoUrl(videoId)}:null;
}
export function youtubeSearchResults(data:unknown):YouTubeMusicResult[]{
 const items=object(data).items,seen=new Set<string>();
 return(Array.isArray(items)?items:[]).flatMap(item=>{
  const raw=object(item),id=object(raw.id).videoId,snippet=object(raw.snippet),thumbs=object(snippet.thumbnails);
  if(!isYouTubeVideoId(id)||seen.has(id))return[];
  const thumb=object(thumbs.high||thumbs.medium||thumbs.default);
  const value=result(id,snippet.title,snippet.channelTitle,thumb.url,thumb.width,thumb.height);
  if(!value)return[];seen.add(id);return[value];
 }).slice(0,6);
}

async function providerJson(url:URL,fetcher:typeof fetch):Promise<unknown>{
 const response=await fetcher(url,{cache:'no-store',redirect:'error',signal:AbortSignal.timeout(8000),headers:{Accept:'application/json'}});
 if(!response.ok&&url.hostname==='www.googleapis.com'){
  const error=object(object(await response.json().catch(()=>null)).error),errors=error.errors;
  const quota=Array.isArray(errors)&&errors.some(item=>/quota|dailyLimit|rateLimit/i.test(String(object(item).reason)));
  if(quota||response.status===429)throw new YouTubeMusicError(503,'YouTube 검색 한도에 도달했어요. 지금은 링크로 가져와주세요.');
  if([400,401,403].includes(response.status))throw new YouTubeMusicError(503,'제목 검색 연결을 확인하고 있어요. 지금은 링크로 가져와주세요.');
 }
 if([401,403,404].includes(response.status))throw new YouTubeMusicError(404,'공개된 영상을 찾지 못했어요. 링크를 확인하거나 다른 영상을 골라주세요.');
 if(response.status===429)throw new YouTubeMusicError(503,'YouTube 요청 한도에 도달했어요. 잠시 후 다시 시도해주세요.');
 if(!response.ok)throw new YouTubeMusicError(502,'YouTube에 연결하지 못했어요. 잠시 후 다시 시도해주세요.');
 return response.json();
}
export async function lookupYouTubeMusic(videoId:string,fetcher:typeof fetch=fetch):Promise<YouTubeMusicResult[]>{
 if(!isYouTubeVideoId(videoId))throw new YouTubeMusicError(400,'YouTube 영상 링크를 확인해주세요.');
 const url=new URL('https://www.youtube.com/oembed');url.searchParams.set('format','json');url.searchParams.set('url',youtubeVideoUrl(videoId));
 const data=object(await providerJson(url,fetcher));
 const value=result(videoId,data.title,data.author_name,data.thumbnail_url,data.thumbnail_width,data.thumbnail_height);
 if(!value)throw new YouTubeMusicError(404,'영상 정보를 가져오지 못했어요. 공개된 영상인지 확인해주세요.');
 return[value];
}
export async function searchYouTubeMusic(query:string,key:string,fetcher:typeof fetch=fetch):Promise<YouTubeMusicResult[]>{
 const url=new URL('https://www.googleapis.com/youtube/v3/search');
 url.search=new URLSearchParams({part:'snippet',type:'video',videoCategoryId:'10',q:query,maxResults:'6',relevanceLanguage:'ko',regionCode:'KR',safeSearch:'moderate',key}).toString();
 return youtubeSearchResults(await providerJson(url,fetcher));
}

/** Shared DB counters keep quotas effective across separate serverless instances. */
export type YouTubeMusicRuntime={
 key?:string;now?:()=>number;fetcher?:typeof fetch;
 browserContext:(request:Request)=>Promise<{id:string;cookie?:string}>;
 digest:(value:string)=>Promise<string>;
 cached:(key:string)=>Promise<YouTubeMusicResult[]|null>;
 cache:(key:string,value:YouTubeMusicResult[],ttl:number)=>Promise<void>;
 reserve:(bucket:string,limit:number,ttl:number)=>Promise<number|null>;
};
const DAY=86400000;
/** Bounded, ephemeral metadata cache: nothing written to permanent DB storage.
 * Separate serverless instances may miss this cache; their quota is still shared. */
export function createYouTubeMusicCache(maxEntries=96,now=()=>Date.now()){
 const entries=new Map<string,{value:YouTubeMusicResult[];expiresAt:number;timer:ReturnType<typeof setTimeout>}>();
 const remove=(key:string)=>{const entry=entries.get(key);if(entry){clearTimeout(entry.timer);entries.delete(key);}};
 const prune=()=>{for(const [key,entry] of entries)if(entry.expiresAt<=now())remove(key);};
 return {
  async cached(key:string){prune();return entries.get(key)?.value??null;},
  async cache(key:string,value:YouTubeMusicResult[],ttl:number){
   prune();remove(key);
   while(entries.size>=Math.max(1,maxEntries))remove(entries.keys().next().value!);
   const expiresAt=now()+Math.min(ttl,DAY);
   const timer=setTimeout(()=>remove(key),Math.min(ttl,DAY));timer.unref?.();
   entries.set(key,{value,expiresAt,timer});
  },
 };
}
export function youtubeQuotaDay(now:number){return new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(now);}
export async function handleYouTubeMusic(request:Request,runtime:YouTubeMusicRuntime):Promise<Response>{
 let cookie:string|undefined;
 const respond=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{})}});
 if(!sameOrigin(request))return respond({error:'티끌에서 다시 열어주세요.'},403);
 const params=new URL(request.url).searchParams;
 if(params.get('status')==='1')return respond({searchAvailable:!!runtime.key,linkAvailable:true});
 const query=(params.get('q')||'').trim().replace(/\s+/g,' '),link=params.get('url')||'';
 if((!query&&!link)||(query&&link)||query.length>100||(!link&&query.length<2))return respond({error:'검색어를 2~100자로 입력하거나 영상 링크를 붙여넣어주세요.'},400);
 const videoId=link?youtubeVideoId(link):null;
 if(link&&!videoId)return respond({error:'YouTube 또는 YouTube Music의 영상 링크를 붙여넣어주세요. 재생목록은 지원하지 않아요.'},400);
 if(!link&&!runtime.key)return respond({error:'제목 검색을 준비 중이에요. 지금은 YouTube 링크로 가져올 수 있어요.'},503);
 try{
  const context=await runtime.browserContext(request);cookie=context.cookie;
  const now=runtime.now?.()??Date.now(),cacheKey=`youtube:v2:${videoId?'video:'+videoId:'search:'+await runtime.digest(query.toLocaleLowerCase('ko-KR'))}`;
  const hit=await runtime.cached(cacheKey);if(hit)return respond({results:hit});
  if(!await runtime.reserve(`youtube:browser:${context.id}:${Math.floor(now/60000)}`,12,120000))return respond({error:'잠깐 쉬었다가 다시 찾아주세요. 1분 뒤에 다시 시도할 수 있어요.'},429);
  const namespace=videoId?'link':`search:${(await runtime.digest(runtime.key!)).slice(0,16)}`;
  if(!await runtime.reserve(`youtube:${namespace}:${youtubeQuotaDay(now)}`,videoId?300:95,2*DAY))return respond({error:videoId?'오늘의 링크 조회가 많아요. 내일 다시 시도해주세요.':'오늘의 제목 검색 한도를 다 썼어요. YouTube 링크로 가져와주세요.'},429);
  const results=videoId?await lookupYouTubeMusic(videoId,runtime.fetcher):await searchYouTubeMusic(query,runtime.key!,runtime.fetcher);
  // Route supplies a bounded in-memory cache; metadata never enters post storage.
  await runtime.cache(cacheKey,results,DAY);
  return respond({results});
 }catch(error){return respond({error:error instanceof YouTubeMusicError?error.message:'정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.'},error instanceof YouTubeMusicError?error.status:502);}
}
