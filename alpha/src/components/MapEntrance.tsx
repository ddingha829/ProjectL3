'use client';
import {useCallback,useEffect,useState} from 'react';
import {MapPin} from 'lucide-react';
import './MapEntrance.css';

/** Reveal on the first painted tile, with an escape hatch for slow/offline tiles. */
export function useMapEntrance(ready:boolean,failed:boolean,identity:string|number){
 const [painted,setPainted]=useState(false);
 const markPainted=useCallback(()=>setPainted(true),[]);
 useEffect(()=>{setPainted(false);},[identity]);
 useEffect(()=>{
  if(painted)return;
  if(failed){setPainted(true);return;}
  if(!ready)return;
  const timer=setTimeout(markPainted,5000);
  return()=>clearTimeout(timer);
 },[ready,failed,painted,markPainted]);
 return {revealed:painted,markPainted};
}

export default function MapEntrance({revealed}:{revealed:boolean}){
 return <div className="map-entrance" aria-hidden={revealed}>
  <div className="map-entrance-mark" aria-hidden="true"><MapPin size={23} strokeWidth={1.3}/><i/></div>
  {!revealed&&<span role="status" className="map-entrance-label">지도를 펼치고 있어요</span>}
 </div>;
}
