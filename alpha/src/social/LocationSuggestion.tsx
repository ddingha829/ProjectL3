'use client';
import {useEffect,useRef,useState} from 'react';
import {MapPin,LocateFixed,LoaderCircle,X} from 'lucide-react';
import {containsDong,loadDongBoundaries} from './adminDong';
import type {LabLog,Place} from './model';
export type PhotoOrigin='camera'|'album'|'work'|undefined;
const meters=(a:Place,b:Place)=>{const r=Math.PI/180,dLat=(b.lat-a.lat)*r,dLng=(b.lng-a.lng)*r;const h=Math.sin(dLat/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dLng/2)**2;return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));};
export default function LocationSuggestion({actorId,origin,image,active,logs,place,onPlace,onSearch}:{actorId:string;origin:PhotoOrigin;image:string;active:boolean;logs:LabLog[];place?:Place;onPlace:(place:Place|undefined)=>void;onSearch:()=>void}){
 const [enabled,setEnabled]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[point,setPoint]=useState<Place>(),[dismissed,setDismissed]=useState(false),[accuracy,setAccuracy]=useState(0);
 const request=useRef(0),asked=useRef(''),manual=useRef(false),callback=useRef(onPlace);callback.current=onPlace;
 useEffect(()=>{try{setEnabled(localStorage.getItem('l2_photo_location:'+actorId)==='yes');}catch{}},[actorId]);
 useEffect(()=>{setDismissed(false);setPoint(undefined);manual.current=false;return()=>{request.current++;};},[image]);
 useEffect(()=>{if(place&&!place.id.startsWith('gps:')){manual.current=true;request.current++;setBusy(false);}},[place]);
 useEffect(()=>{
  if(!active||!enabled||origin!=='camera'||!image||dismissed||asked.current===image||place)return;
  asked.current=image;const token=++request.current;setBusy(true);setError('');
  const fail=(message:string)=>{if(token===request.current){setBusy(false);setError(message);}};
  if(!navigator.geolocation){fail('이 브라우저에서는 위치를 확인할 수 없어요.');return;}
  navigator.geolocation.getCurrentPosition(async position=>{
   if(token!==request.current||manual.current)return;
   const {latitude:lat,longitude:lng,accuracy}=position.coords;if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180){fail('위치를 확인하지 못했어요. 장소 없이도 올릴 수 있어요.');return;}
   const draft:Place={id:`gps:${lat.toFixed(5)}:${lng.toFixed(5)}`,name:'촬영한 위치',area:'현재 위치',lat,lng};
   try{const boundaries=await loadDongBoundaries([{place:draft} as LabLog]),dong=boundaries.features.find(f=>containsDong(f,lat,lng));if(dong){draft.name=dong.properties.label;draft.area=dong.properties.name;}}
   catch{/* A coordinate can still be confirmed manually when boundaries fail. */}
   if(token!==request.current||manual.current)return;setPoint(draft);setAccuracy(accuracy);setBusy(false);
   if(accuracy<=100&&draft.area!=='현재 위치')callback.current(draft);
  },error=>fail(error.code===1?'위치 권한이 꺼져 있어요. 장소 없이도 올릴 수 있어요.':'위치를 확인하지 못했어요. 장소 없이도 올릴 수 있어요.'),{enableHighAccuracy:true,timeout:8000,maximumAge:15000});
 },[active,enabled,origin,image,dismissed,place]);
 const suggestions=point?[...new Map(logs.filter(log=>log.place).map(log=>[log.place!.id,log.place!])).values()].map(p=>({place:p,distance:meters(point,p)})).filter(row=>row.distance<=500).sort((a,b)=>a.distance-b.distance).slice(0,3):[];
 if(!active)return null;
 if(place)return <div className="lab-location-suggestion"><div><MapPin size={15}/><span><strong>{place.name}</strong><small>공유에 포함될 위치</small></span><button onClick={onSearch}>변경</button><button aria-label="장소 지우기" onClick={()=>{manual.current=true;setDismissed(true);callback.current(undefined);}}><X size={15}/></button></div>{suggestions.length>0&&<div className="lab-nearby-choices"><small>모임이 남긴 근처 장소</small>{suggestions.map(row=><button key={row.place.id} onClick={()=>{manual.current=true;callback.current(row.place);}}>{row.place.name}<span>{Math.round(row.distance)}m</span></button>)}</div>}</div>;
 if(origin!=='camera'||!image||dismissed)return null;
 return <div className="lab-location-suggestion">
  {!enabled?<button className="lab-location-enable" onClick={()=>{try{localStorage.setItem('l2_photo_location:'+actorId,'yes');}catch{}setEnabled(true);}}><LocateFixed size={16}/>촬영 위치 제안 켜기</button>:busy?<p role="status"><LoaderCircle size={14} className="lab-spin"/>위치 확인 중 · 기다리지 않고 올려도 좋아요</p>:point?<div><MapPin size={15}/><span><strong>{point.name}</strong><small>{accuracy>100?'위치가 대략적이에요. 맞는 곳인지 확인해주세요.':'동네를 확인하지 못했어요. 위치를 확인해 주세요.'}</small></span><button onClick={()=>{manual.current=true;callback.current(point);}}>이 위치</button><button onClick={onSearch}>변경</button></div>:error?<p role="status">{error}</p>:null}
  <button className="lab-location-skip" onClick={()=>{manual.current=true;request.current++;setBusy(false);setDismissed(true);callback.current(undefined);}}>위치 없이 올리기</button>
 </div>;
}
