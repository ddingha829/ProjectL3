'use client';
import {useCallback,useState} from 'react';
import {Check,ChevronDown,KeyRound,Lock,Settings,Users} from 'lucide-react';
import CompactPopover from '@/components/logbook/CompactPopover';
import type {Circle} from '@/social/model';
import type {PwaState} from '@/components/PwaInstallControl';
import HeaderInstallControl from './HeaderInstallControl';
export default function UnifiedHeader({scope,circles,onScope,onHome,onSettings,onGroups,pwa}:{scope:string;circles:Circle[];onScope:(id:string)=>void;onHome:()=>void;onSettings:()=>void;onGroups:()=>void;pwa:PwaState}){
 const [scopeOpen,setScopeOpen]=useState(false);
 const scopeChanged=useCallback((value:boolean)=>setScopeOpen(value),[]);
 return <><div className="un-header-space" aria-hidden="true"/><header className="un-header un-header-v2">
  <button className="un-brand" aria-label="피드 화면" onClick={onHome}>L2<span>.</span></button>
  <CompactPopover label="로그 범위 선택" open={scopeOpen} onOpenChange={scopeChanged} className="un-scope-picker" trigger={<><span>{scope==='mine'?'마이로그':circles.find(c=>c.id===scope)?.name||'마이로그'}</span><ChevronDown size={12}/></>}>{close=><><button aria-pressed={scope==='mine'} onClick={()=>{onScope('mine');close();}}><Lock size={15}/><span>마이로그</span>{scope==='mine'&&<Check size={14}/>}</button>{circles.map(c=><button key={c.id} aria-pressed={scope===c.id} onClick={()=>{onScope(c.id);close();}}><Users size={15}/><span>{c.name}</span>{scope===c.id&&<Check size={14}/>}</button>)}<button className="un-scope-manage" onClick={()=>{close();onGroups();}}><KeyRound size={15}/><span>코드로 참여 · 모임 만들기</span></button></>}</CompactPopover>
  <HeaderInstallControl pwa={pwa}/>
  <button className="un-header-action" aria-label="설정 열기" onClick={onSettings}><Settings size={21} strokeWidth={1.65}/></button>
 </header></>;
}
