'use client';
import {useMemo,useState,type CSSProperties} from 'react';
import dynamic from 'next/dynamic';
import {ArrowUpRight,MapPin} from 'lucide-react';
import {timeAgo,type LabLog,type Person} from '@/social/model';
import type {DongCount} from '@/social/adminDong';
import {logsInViewport,type MapViewport} from '@/social/mapRegions';
import './MapExplorer.css';
const ScratchMap=dynamic(()=>import('@/social/ScratchMap'),{ssr:false,loading:()=> <div className="lab-map-placeholder">지도를 펼치고 있어요</div>});
type Props={logs:LabLog[];people:Person[];dark:boolean;scopeKey:string;onSelect:(log:LabLog)=>void;onDistrictSelect:(region:DongCount)=>void};
export default function MapExplorer({logs,people,dark,scopeKey,onSelect,onDistrictSelect}:Props){
 const [viewport,setViewport]=useState<MapViewport|null>(null);
 const nearby=!!viewport&&viewport.zoom>=13.5;
 const visible=useMemo(()=>viewport?logsInViewport(logs,viewport):[],[logs,viewport]);
 return <section data-page-swipe-surface className="un-map-explorer" data-nearby={nearby} style={{'--map-list-rows':Math.min(4,Math.max(1,logs.length))} as CSSProperties}>
  <div className="un-map-panel lab-map-panel"><ScratchMap pageSwipe logs={logs} people={people} dark={dark} scopeKey={scopeKey} onSelect={onSelect} onDistrictSelect={onDistrictSelect} onViewportChange={setViewport}/>{!logs.length&&<div className="un-map-empty"><MapPin size={16}/><span>장소가 있는 기록을 남기면 지도가 채워져요.</span></div>}</div>
  {nearby&&<section className="un-map-nearby" aria-label="현재 지도에 보이는 로그"><header><span>화면 안의 로그</span><span>{visible.length}</span></header><div className="un-map-nearby-list">
   {visible.map(log=>{const person=people.find(p=>p.id===log.authorId);return <button key={log.id} className="un-map-nearby-log" onClick={()=>onSelect(log)} aria-label={`${log.title||log.place?.name} 로그 열기`}>
    {log.image?<img src={log.image} alt="" loading="lazy" decoding="async"/>:<span className="un-map-nearby-placeholder"><MapPin size={15}/></span>}
    <span className="un-map-nearby-copy"><strong>{log.title||log.place?.name}</strong><small>{log.body.trim().replace(/\s+/g,' ')||log.locationLabel||log.place?.name}</small></span><span className="un-map-nearby-meta"><span>{person?.name||'나'}</span><small>{timeAgo(log.createdAt)}</small></span><ArrowUpRight size={13}/>
   </button>;})}
   {!visible.length&&<p className="un-map-nearby-empty">이 화면에는 아직 기록이 없어요.</p>}
  </div></section>}
 </section>;
}
