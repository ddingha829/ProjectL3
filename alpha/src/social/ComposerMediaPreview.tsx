'use client';
import {useEffect,useRef,useState} from 'react';
import {mediaFilter} from './mediaFilter';
import type {PhotoSettings} from '@/unified/store';
import type {VideoClip} from '@/lib/video';

export default function ComposerMediaPreview({image,file,video,active,photo}:{image:string;file?:File;video?:VideoClip;active:boolean;photo?:PhotoSettings}){
 const [source,setSource]=useState<{key:File|string;url:string}>();
 const player=useRef<HTMLVideoElement>(null);
 const key=file||video?.path;
 useEffect(()=>{
  if(!key)return;
  let alive=true;
  if(file){const url=URL.createObjectURL(file);setSource({key:file,url});return()=>{URL.revokeObjectURL(url);};}
  void import('@/unified/cloudRepository').then(async({configureCloud})=>{const client=await configureCloud();if(!client||!video)return;const result=await client.storage.from('l2u-videos').createSignedUrl(video.path,300);if(alive&&result.data?.signedUrl)setSource({key:video.path,url:result.data.signedUrl});}).catch(()=>{/* The still cover remains visible if playback is unavailable. */});
  return()=>{alive=false;};
 },[file,video?.path]);
 const url=source?.key===key?source?.url:undefined;
 useEffect(()=>{const target=player.current;if(!target)return;if(active)void target.play().catch(()=>{});else target.pause();},[active,url]);
 return url?<video style={{filter:mediaFilter(photo)}} ref={player} className="lab-story-photo un-story-video" src={url} poster={image} autoPlay={active} muted loop playsInline controls preload="metadata" aria-label="첨부 영상 전체 미리보기"/>:<img style={{filter:mediaFilter(photo)}} className="lab-story-photo" src={image} alt="첨부 사진 전체 미리보기"/>;
}
