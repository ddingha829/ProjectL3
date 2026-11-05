import {plainMediaText} from '@/lib/media';
import type {Work} from '@/social/taste';
import {sameOrigin} from './requestOrigin';

export const MUSIC_USER_AGENT='Ticgle/0.1.0 (https://www.ticgle.kr)';
export const isMbid=(value:unknown):value is string=>typeof value==='string'&&/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(value);
const object=(v:unknown):Record<string,unknown>=>v&&typeof v==='object'&&!Array.isArray(v)?v as Record<string,unknown>:{};
const list=(v:unknown):unknown[]=>Array.isArray(v)?v:[];
const clean=(v:unknown,max=150)=>plainMediaText(v).slice(0,max);
export function musicbrainzResults(raw:unknown):Work[]{
 const seen=new Set<string>();
 return list(object(raw).recordings).flatMap(row=>{
  const r=object(row),title=clean(r.title),id=r.id;
  if(!isMbid(id)||!title||seen.has(id)||r.video===true)return[];
  const creator=list(r['artist-credit']).map(v=>{const c=object(v),a=object(c.artist),ko=list(a.aliases).map(object).find(alias=>alias.locale==='ko'&&alias.primary===true),join=typeof c.joinphrase==='string'?c.joinphrase.replace(/<[^>]*>/g,'').slice(0,20):'';return clean(ko?.name||c.name||a.name,100)+join;}).join('').replace(/\s+/g,' ').trim().slice(0,150);
  if(!creator)return[];
  // Prefer an official Korean/album release to compilations and pseudo-releases.
  const releases=list(r.releases).map(object).filter(v=>isMbid(v.id));
  const rank=(v:Record<string,unknown>)=>(v.status==='Official'?10:0)+(v.country==='KR'?3:0)+(object(v['release-group'])['primary-type']==='Album'?2:0)-(list(object(v['release-group'])['secondary-types']).includes('Compilation')?12:0);
  releases.sort((a,b)=>rank(b)-rank(a));const release=releases[0],group=object(release?.['release-group']).id;
  const cover=new URLSearchParams();if(isMbid(group))cover.set('group',group);if(isMbid(release?.id))cover.set('release',release.id);
  seen.add(id);
  return[{id:`musicbrainz:recording:${id}`,kind:'music' as const,mediaType:'music' as const,title,creator,year:clean(r['first-release-date']||release?.date,4),album:clean(release?.title),image:cover.size?`/api/music/cover?${cover}`:'',url:`https://musicbrainz.org/recording/${id}`}];
 }).slice(0,6);
}
export type MusicRuntime={browserContext:(r:Request)=>Promise<{id:string;cookie?:string}>;digest:(s:string)=>Promise<string>;cached:(key:string)=>Promise<Work[]|null>;cache:(key:string,items:Work[],ttl:number)=>Promise<void>;reserve:(bucket:string,limit:number,ttl:number)=>Promise<number|null>;slot:()=>Promise<boolean>;fetcher?:typeof fetch;now?:()=>number};
/** Bounded warm-instance cache over the existing shared provider cache. */
export function createMusicMetadataCache(backing:Pick<MusicRuntime,'cached'|'cache'>,now=()=>Date.now(),max=96){
 const entries=new Map<string,{items:Work[];expires:number}>();
 const remember=(key:string,items:Work[],ttl:number)=>{for(const [id,value]of entries)if(value.expires<=now())entries.delete(id);entries.delete(key);while(entries.size>=Math.max(1,max))entries.delete(entries.keys().next().value!);entries.set(key,{items,expires:now()+Math.min(ttl,86400000)});};
 return{
  async cached(key:string){const hit=entries.get(key);if(hit&&hit.expires>now())return hit.items;entries.delete(key);const shared=await backing.cached(key);if(shared!==null)remember(key,shared,600000);return shared;},
  async cache(key:string,items:Work[],ttl:number){await backing.cache(key,items,ttl);remember(key,items,ttl);},
 };
}
export async function handleMusicSearch(request:Request,runtime:MusicRuntime){
 let cookie:string|undefined;
 const reply=(body:unknown,status=200,retry?:number)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff',...(cookie?{'Set-Cookie':cookie}:{}),...(retry?{'Retry-After':String(retry)}:{})}});
 if(!sameOrigin(request))return reply({error:'티끌에서 다시 열어주세요.'},403);
 const query=(new URL(request.url).searchParams.get('q')||'').normalize('NFKC').trim().replace(/\s+/g,' ');
 if(query.length<2||query.length>100)return reply({error:'곡명이나 아티스트를 2~100자로 입력해주세요.'},400);
 try{
  const key=`musicbrainz:recording:v1:${await runtime.digest(query.toLocaleLowerCase('ko-KR'))}`,hit=await runtime.cached(key);
  if(hit!==null)return reply({results:hit,provider:'MusicBrainz'});
  const context=await runtime.browserContext(request);cookie=context.cookie;
  if(!await runtime.reserve(`musicbrainz:browser:${context.id}:${Math.floor((runtime.now?.()??Date.now())/60000)}`,12,120000))return reply({error:'검색 요청이 많아요. 잠시 후 다시 찾아주세요.'},429,60);
  // An atomic shared lease, rather than one independent timer per Vercel instance.
  if(!await runtime.slot())return reply({error:'음악 검색이 잠시 붐비고 있어요. 잠시 후 다시 찾아주세요.'},429,2);
  const url=new URL('https://musicbrainz.org/ws/2/recording');url.search=new URLSearchParams({query,fmt:'json',limit:'8',dismax:'true'}).toString();
  const response=await(runtime.fetcher||fetch)(url,{cache:'no-store',redirect:'error',headers:{Accept:'application/json','User-Agent':MUSIC_USER_AGENT},signal:AbortSignal.timeout(9000)});
  if(response.status===429||response.status===503)return reply({error:'음악 검색이 잠시 붐비고 있어요. 잠시 후 다시 찾아주세요.'},503,3);
  if(!response.ok)throw Error('MUSIC_UPSTREAM');
  const results=musicbrainzResults(await response.json());await runtime.cache(key,results,results.length?86400000:600000);
  return reply({results,provider:'MusicBrainz'});
 }catch{return reply({error:'음악 정보를 불러오지 못했어요. 잠시 후 다시 시도해주세요.'},502);}
}
