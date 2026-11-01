'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {MapPin} from 'lucide-react';
import './MapEntrance.css';

/** Reveal on the first painted tile, with a brief minimum beat so the progress bar completes smoothly. */
export function useMapEntrance(ready:boolean,failed:boolean,identity:string|number){
 const [painted,setPainted]=useState(false);
 const startedAt=useRef(0);
 const revealTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
 useEffect(()=>{
  startedAt.current=typeof performance!=='undefined'?performance.now():Date.now();
  setPainted(false);
  return()=>{if(revealTimer.current)clearTimeout(revealTimer.current);};
 },[identity]);
 const markPainted=useCallback(()=>{
  if(typeof window!=='undefined'&&window.matchMedia?.('(prefers-reduced-motion: reduce)').matches){
   setPainted(true);
   return;
  }
  const now=typeof performance!=='undefined'?performance.now():Date.now();
  const remaining=Math.max(0,420-(now-startedAt.current));
  if(remaining<=16){
   setPainted(true);
   return;
  }
  if(revealTimer.current)clearTimeout(revealTimer.current);
  revealTimer.current=setTimeout(()=>setPainted(true),remaining);
 },[]);
 useEffect(()=>{
  if(painted)return;
  if(failed){setPainted(true);return;}
  if(!ready)return;
  const timer=setTimeout(()=>setPainted(true),5000);
  return()=>clearTimeout(timer);
 },[ready,failed,painted]);
 return {revealed:painted,markPainted};
}

export default function MapEntrance({revealed}:{revealed:boolean}){
 return <div className="map-entrance" aria-hidden={revealed} data-revealed={revealed}>
  <div className="map-entrance-mark" aria-hidden="true"><MapPin size={23} strokeWidth={1.3}/><i/></div>
  {!revealed&&<span role="status" className="map-entrance-label">지도를 펼치고 있어요</span>}
  <div className="map-entrance-progress" aria-hidden="true">
   <span className="map-entrance-progress-fill"/>
  </div>
 </div>;
}
