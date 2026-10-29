'use client';
import {useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {ArrowUpRight,MapPin} from 'lucide-react';
import {timeAgo,type LabLog,type Person} from '@/social/model';
import type {DongCount} from '@/social/adminDong';
import {logsInViewport,type MapViewport} from '@/social/mapRegions';
import './MapExplorer.css';
import MapEntrance from '@/components/MapEntrance';
const ScratchMap=dynamic(()=>import('@/social/ScratchMap'),{ssr:false,loading:()=> <div className="lab-map-placeholder un-map-entrance-placeholder" data-map-revealed={false} aria-busy="true"><MapEntrance revealed={false}/></div>});
type Props={logs:LabLog[];people:Person[];dark:boolean;scopeKey:string;focusedLog?:string;onSelect:(log:LabLog)=>void;onDistrictSelect:(region:DongCount)=>void};
export default function MapExplorer({logs,people,dark,scopeKey,focusedLog,onSelect,onDistrictSelect}:Props){
 const [viewport,setViewport]=useState<MapViewport|null>(null);
 const nearby=useMemo(()=>viewport?logsInViewport(logs,viewport).slice(0,2):[],[logs,viewport]);
 return <section data-page-swipe-surface className="un-map-explorer">
  <header className="un-map-invitation">
   <span className="un-map-invitation-art" aria-hidden="true"><i/><i/><i/><MapPin size={15} strokeWidth={1.8}/></span>
   <div><h1>티끌로 지도를 채워보세요!</h1><p>{logs.length?'장소를 기록할수록 동네에 색이 쌓여요.':'아래 + 버튼으로 첫 장소를 남겨보세요.'}</p></div>
  </header>
  <div className="un-map-panel lab-map-panel"><ScratchMap pageSwipeEdges logs={logs} people={people} dark={dark} scopeKey={scopeKey} focusedLog={focusedLog} onSelect={onSelect} onDistrictSelect={onDistrictSelect} onViewportChange={setViewport}/></div>
  <section className="un-map-nearby" aria-label="현재 지도에 보이는 가까운 로그" aria-busy={!viewport}><header><span>가까운 로그</span><span>지도 중심 기준 · 최대 2개</span></header><div className="un-map-nearby-list">
   {nearby.map(log=>{const person=people.find(p=>p.id===log.authorId);return <button type="button" key={log.id} className="un-map-nearby-log" onClick={()=>onSelect(log)} aria-label={`${log.title||log.place?.name} 티끌 열기`}>
    {log.image?<img src={log.image} alt="" loading="lazy" decoding="async"/>:<span className="un-map-nearby-placeholder"><MapPin size={15}/></span>}
    <span className="un-map-nearby-copy"><strong>{log.title||log.place?.name}</strong><small>{log.body.trim().replace(/\s+/g,' ')||log.locationLabel||log.place?.name}</small></span><span className="un-map-nearby-meta"><span>{person?.name||'나'}</span><small>{timeAgo(log.createdAt)}</small></span><ArrowUpRight size={13}/>
   </button>;})}
   {!nearby.length&&<p className="un-map-nearby-empty" role="status">{viewport?'현재 지도 안에 로그가 없어요.':'지도 안의 로그를 찾고 있어요.'}</p>}
  </div></section>
 </section>;
}
