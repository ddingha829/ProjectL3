'use client';
import {useEffect,useRef,useState} from 'react';
import AccessibleDialog from '@/components/AccessibleDialog';
import type {Place} from '@/social/model';
import {simpleMapLayer} from '@/social/simpleMapLayer';
import 'leaflet/dist/leaflet.css';
import './LocationPreview.css';
export default function LocationPreview({place,label,onClose}:{place?:Place;label:string;onClose:()=>void}){
 const host=useRef<HTMLDivElement>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
 const valid=!!place&&Number.isFinite(place.lat)&&Number.isFinite(place.lng)&&Math.abs(place.lat)<=90&&Math.abs(place.lng)<=180;
 useEffect(()=>{
  if(!valid||!place)return;
  let disposed=false,map:import('leaflet').Map|undefined,resize:ResizeObserver|undefined;
  void import('leaflet').then(L=>{
   if(disposed||!host.current)return;
   map=L.map(host.current,{scrollWheelZoom:false,minZoom:3,maxZoom:17}).setView([place.lat,place.lng],14);
   simpleMapLayer(L,{attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',keepBuffer:1,updateWhenIdle:true}).on('tileload',()=>{if(!disposed){setLoading(false);setError('');}}).on('tileerror',()=>{if(!disposed){setLoading(false);setError('지도를 불러오지 못했어요. 잠시 후 다시 열어주세요.');}}).addTo(map);
   L.circle([place.lat,place.lng],{radius:180,color:'#fa653c',weight:2,fillColor:'#fa653c',fillOpacity:.16,interactive:false}).addTo(map);
   resize=new ResizeObserver(()=>map?.invalidateSize({pan:false}));resize.observe(host.current);
  }).catch(()=>{if(!disposed){setLoading(false);setError('지도를 불러오지 못했어요. 잠시 후 다시 열어주세요.');}});
  return()=>{disposed=true;resize?.disconnect();map?.remove();};
 },[valid,place?.lat,place?.lng]);
 return <AccessibleDialog open title="기록한 장소" closeLabel="장소 지도 닫기" onClose={onClose} panelClassName="lab-dialog un-location-preview"><div className="un-location-preview-name"><strong>{label}</strong>{place?.area&&place.area!==label&&<p>{place.area}</p>}</div>{valid?<><div ref={host} className="un-location-preview-map" aria-label={`${label} 주변 지도`}/>{loading&&<p role="status" className="un-subtle">지도를 불러오고 있어요.</p>}{error&&<p role="alert" className="un-subtle">{error}</p>}<p className="un-subtle">원을 중심으로 기록한 장소 주변을 보여드려요.</p></>:<p className="un-subtle">이 티끌에는 지도에서 볼 수 있는 좌표가 저장되지 않았어요.</p>}</AccessibleDialog>;
}
