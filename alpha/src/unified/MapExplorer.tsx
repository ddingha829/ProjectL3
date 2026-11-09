'use client';
import {useMemo,useState} from 'react';
import dynamic from 'next/dynamic';
import {ArrowUpRight,MapPin,Map} from 'lucide-react';
import {timeAgo,type LabLog,type Person} from '@/social/model';
import type {DongCount} from '@/social/adminDong';
import {logsInViewport,type MapViewport} from '@/social/mapRegions';
import './MapExplorer.css';
import {BrandEmpty,TicgleDots} from './BrandDetails';
import MapEntrance from '@/components/MapEntrance';
const ScratchMap=dynamic(()=>import('@/social/ScratchMap'),{ssr:false,loading:()=> <div className="lab-map-placeholder un-map-entrance-placeholder" data-map-revealed={false} aria-busy="true"><MapEntrance revealed={false}/></div>});
type Props={recordsLoading?:boolean;recordsBusy?:boolean;onRetryRecords?:()=>void;active?:boolean;onCompose?:()=>void;logs:LabLog[];people:Person[];dark:boolean;scopeKey:string;focusedLog?:string;discoveryLog?:string;onDiscoveryConsumed?:()=>void;onSelect:(log:LabLog)=>void;onDistrictSelect:(region:DongCount)=>void};
export default function MapExplorer({recordsLoading=false,recordsBusy=false,onRetryRecords,active=true,onCompose,logs,people,dark,scopeKey,focusedLog,discoveryLog,onDiscoveryConsumed,onSelect,onDistrictSelect}:Props){
 const [viewport,setViewport]=useState<MapViewport|null>(null);
 const nearby=useMemo(()=>viewport?logsInViewport(logs,viewport).slice(0,2):[],[logs,viewport]);
 return <section data-page-swipe-surface className={`un-map-explorer ${recordsLoading?'is-loading-records':''}`}>
  <header className="un-map-invitation">
   <span className="un-map-invitation-art" aria-hidden="true"><TicgleDots/></span>
   <div><h1>{logs.length||recordsLoading?'기록이 머문 동네':'티끌로 지도를 채워보세요'}</h1><p>{logs.length?'장소를 기록할수록 동네에 색이 쌓여요.':'아래 + 버튼으로 첫 장소를 남겨보세요.'}</p></div>
  </header>
  <div className="un-map-panel lab-map-panel">{recordsLoading&&<div className="un-map-record-status" role="status">{recordsBusy?'지도에 기록을 채우고 있어요…':<>기록을 불러오지 못했어요. <button onClick={onRetryRecords}>다시 시도</button></>}</div>}<ScratchMap active={active} pageSwipeEdges logs={logs} people={people} dark={dark} scopeKey={scopeKey} focusedLog={focusedLog} discoveryLog={discoveryLog} onDiscoveryConsumed={onDiscoveryConsumed} onSelect={onSelect} onDistrictSelect={onDistrictSelect} onViewportChange={setViewport}/>{!recordsLoading&&!logs.some(log=>log.place)&&<div className="un-map-empty-invitation"><BrandEmpty compact title="첫 장소에 색을 남겨보세요" description="티끌에 장소를 담으면 동네가 채워져요." action="장소 티끌 남기기" onAction={onCompose}/></div>}</div>
  <section className="un-map-nearby" aria-label="현재 지도에 보이는 가까운 티끌" aria-busy={!viewport}><header><span>가까운 티끌</span><span>지도 중심 기준 · 최대 2개</span></header><div className="un-map-nearby-list">
   {nearby.map(log=>{const person=people.find(p=>p.id===log.authorId);return <button type="button" key={log.id} className="un-map-nearby-log" onClick={()=>onSelect(log)} aria-label={`${log.title||log.place?.name} 티끌 열기`}>
    {log.image?<img src={log.image} alt="" loading="lazy" decoding="async"/>:<span className="un-map-nearby-placeholder"><MapPin size={15}/></span>}
    <span className="un-map-nearby-copy"><strong>{log.title||log.place?.name}</strong><small>{log.body.trim().replace(/\s+/g,' ')||log.locationLabel||log.place?.name}</small></span><span className="un-map-nearby-meta"><span>{person?.name||'나'}</span><small>{timeAgo(log.createdAt)}</small></span><ArrowUpRight size={13}/>
   </button>;})}
   {!nearby.length&&<p className="un-map-nearby-empty" role="status">{recordsLoading?'지도에 표시할 기록을 불러오고 있어요.':viewport?'현재 지도 안에 티끌이 없어요.':'지도 안의 티끌을 찾고 있어요.'}</p>}
  </div></section>
 </section>;
}
