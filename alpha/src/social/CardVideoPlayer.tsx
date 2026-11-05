'use client';
import {useEffect,useRef,useState,type CSSProperties} from 'react';
import {getDialogSurface} from '@/lib/dialogIsolation';
import {cardPlaybackPool,cardVideoSource} from './cardVideoResources';
import {useVideoAutoplay} from './useVideoAutoplay';
export default function CardVideoPlayer({path,poster,style,active=true}:{path:string;poster:string;style:CSSProperties;active?:boolean}){
 const host=useRef<HTMLSpanElement>(null),video=useRef<HTMLVideoElement>(null),[eligible,setEligible]=useState(false),[slot,setSlot]=useState(false),[source,setSource]=useState(''),[playing,setPlaying]=useState(false),[failed,setFailed]=useState(false),autoplay=useVideoAutoplay();
 useEffect(()=>{
  let visible=false;const update=()=>{const top=getDialogSurface();setEligible(active&&autoplay&&!failed&&visible&&document.visibilityState==='visible'&&(!top||!!host.current&&top.contains(host.current)));};
  if(!host.current||typeof IntersectionObserver==='undefined')return;
  const observer=new IntersectionObserver(entries=>{const entry=entries[0];visible=entry.isIntersecting&&entry.intersectionRatio>=.6;update();},{threshold:[0,.6,1]});observer.observe(host.current);
  document.addEventListener('visibilitychange',update);window.addEventListener('l2:dialog-stack-change',update);update();
  return()=>{observer.disconnect();document.removeEventListener('visibilitychange',update);window.removeEventListener('l2:dialog-stack-change',update);};
 },[active,autoplay,failed]);
 useEffect(()=>{setSlot(false);if(!eligible)return;return cardPlaybackPool.request(setSlot);},[eligible]);
 const allowed=eligible&&slot;
 useEffect(()=>{
  let live=true;setSource('');setPlaying(false);
  if(allowed)void(async()=>{const{configureCloud}=await import('@/unified/cloudRepository');const client=await configureCloud();if(!client)throw Error();const session=await client.auth.getSession();const actor=session.data.session?.user.id;if(!actor)throw Error();const url=await cardVideoSource(client,actor,path);if(live)setSource(url);})().catch(()=>{if(live)setFailed(true);});
  return()=>{live=false;};
 },[allowed,path]);
 useEffect(()=>{const player=video.current;if(!player||!source||!allowed)return;player.muted=true;void player.play().catch(()=>{setPlaying(false);setFailed(true);});return()=>player.pause();},[source,allowed]);
 return <span ref={host} className="ec-bento-motion-host" data-ec-ui="video">{allowed&&source&&<video ref={video} className="ec-bento-image ec-bento-motion" style={{...style,opacity:playing?1:0}} src={source} poster={poster} muted loop playsInline autoPlay preload="none" controls={false} tabIndex={-1} aria-hidden="true" disablePictureInPicture onPlaying={()=>setPlaying(true)} onError={()=>setFailed(true)}/>}</span>;
}
