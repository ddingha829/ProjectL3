import {isMbid,MUSIC_USER_AGENT} from './musicbrainz';
const FALLBACK='<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500" viewBox="0 0 500 500"><rect width="500" height="500" fill="#343e42"/><circle cx="250" cy="225" r="155" fill="#21292d"/><circle cx="250" cy="225" r="115" fill="none" stroke="#ffffff0d" stroke-width="2"/><circle cx="250" cy="225" r="75" fill="none" stroke="#ffffff0d" stroke-width="2"/><circle cx="250" cy="225" r="44" fill="#b1a493"/><circle cx="250" cy="225" r="9" fill="#21292d"/></svg>';
function trustedArchive(url:URL){return url.protocol==='https:'&&!url.username&&!url.password&&!url.port&&(url.hostname==='coverartarchive.org'||url.hostname==='archive.org'||url.hostname.endsWith('.archive.org'));}
async function coverImage(url:URL,signal:AbortSignal,fetcher:typeof fetch):Promise<Response|null>{
 for(let step=0;step<4;step++){
  if(!trustedArchive(url))return null;
  const response=await fetcher(url,{redirect:'manual',cache:'force-cache',headers:{'User-Agent':MUSIC_USER_AGENT},signal});
  if([301,302,303,307,308].includes(response.status)){
   const location=response.headers.get('location');await response.body?.cancel();if(!location)return null;url=new URL(location,url);continue;
  }
  const type=response.headers.get('content-type')?.split(';')[0]||'',max=1024*1024;
  if(!response.ok||!/^image\/(jpeg|png|webp)$/.test(type)||Number(response.headers.get('content-length'))>max){await response.body?.cancel();return null;}
  const reader=response.body?.getReader();if(!reader)return null;const chunks:Uint8Array<ArrayBuffer>[]= [];let size=0;
  while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>max){await reader.cancel();return null;}chunks.push(new Uint8Array(part.value));}
  if(!size)return null;
  return new Response(new Blob(chunks,{type}),{headers:{'Content-Type':type,'Cache-Control':'public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400','X-Content-Type-Options':'nosniff'}});
 }
 return null;
}
export async function handleMusicCover(request:Request,fetcher:typeof fetch=fetch){
 const params=new URL(request.url).searchParams,group=params.get('group'),release=params.get('release');
 if((group!==null&&!isMbid(group))||(release!==null&&!isMbid(release))||(!group&&!release))return new Response(null,{status:400});
 const signal=AbortSignal.timeout(8000);
 for(const [kind,id]of [['release-group',group],['release',release]]){
  if(!id)continue;
  try{const result=await coverImage(new URL(`https://coverartarchive.org/${kind}/${id}/front-500`),signal,fetcher);if(result)return result;}catch{if(signal.aborted)break;}
 }
 // No broken-image frame, extra MusicBrainz lookup or audio download for missing art.
 return new Response(FALLBACK,{headers:{'Content-Type':'image/svg+xml','Cache-Control':'public, max-age=3600, s-maxage=3600','X-Content-Type-Options':'nosniff'}});
}
