/** A reference to the original video, never an audio/video download. */
export type YouTubeMusicResult={videoId:string;title:string;channelTitle:string;thumbnailUrl:string;thumbnailWidth:number;thumbnailHeight:number;url:string};
const videoIdPattern=/^[A-Za-z0-9_-]{11}$/;
export const isYouTubeVideoId=(value:unknown):value is string=>typeof value==='string'&&videoIdPattern.test(value);
export const youtubeVideoUrl=(videoId:string)=>`https://www.youtube.com/watch?v=${videoId}`;

/** Accept video links only. Rebuild URLs before any server-side fetch. */
export function youtubeVideoId(input:string):string|null{
 if(input.length>2048)return null;
 try{
  const url=new URL(input.trim());
  if(url.protocol!=='https:'||url.username||url.password||url.port)return null;
  const host=url.hostname.toLowerCase();let id:string|null=null;
  if(host==='youtu.be')id=url.pathname.match(/^\/([^/]+)\/?$/)?.[1]||null;
  else if(['youtube.com','www.youtube.com','m.youtube.com','music.youtube.com'].includes(host)){
   if(url.pathname==='/watch')id=url.searchParams.get('v');
   else id=url.pathname.match(/^\/(?:shorts|live|embed)\/([^/]+)\/?$/)?.[1]||null;
  }
  return isYouTubeVideoId(id)?id:null;
 }catch{return null;}
}

export function youtubeThumbnail(value:unknown,videoId:string):string{
 if(typeof value==='string')try{
  const url=new URL(value);
  if(url.protocol==='https:'&&url.hostname==='i.ytimg.com'&&!url.username&&!url.password&&!url.port&&url.pathname.startsWith(`/vi/${videoId}/`))return url.href;
 }catch{}
 return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
}
