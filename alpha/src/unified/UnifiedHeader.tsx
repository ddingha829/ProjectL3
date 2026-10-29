'use client';
import {useCallback,useState} from 'react';
import {Check,ChevronDown,KeyRound,Lock,Settings,Users} from 'lucide-react';
import CompactPopover from '@/components/logbook/CompactPopover';
import type {Circle} from '@/social/model';
import type {PwaState} from '@/components/PwaInstallControl';
import HeaderInstallControl from './HeaderInstallControl';
import TicgleWordmark from '@/components/TicgleBrand';
import './UnifiedHeader.css';
export default function UnifiedHeader({scope,circles,onScope,onHome,onSettings,onGroups,pwa}:{scope:string;circles:Circle[];onScope:(id:string)=>void;onHome:()=>void;onSettings:()=>void;onGroups:()=>void;pwa:PwaState}){
 const [scopeOpen,setScopeOpen]=useState(false);
 const scopeChanged=useCallback((value:boolean)=>setScopeOpen(value),[]);
 const selectedCircle=circles.find(c=>c.id===scope),ScopeIcon=selectedCircle?Users:Lock;
 return <header className="un-header un-header-v2 un-header-centered" data-install-visible={pwa.ready&&!pwa.isStandalone}>
  <button className="un-brand" aria-label="티끌 피드 화면" onClick={onHome}><TicgleWordmark/></button>
  <CompactPopover label="티끌 범위 선택" open={scopeOpen} onOpenChange={scopeChanged} className={`un-scope-picker ${selectedCircle?'has-group':''}`} trigger={<><ScopeIcon size={14} className="un-scope-type" aria-hidden="true"/><span className="un-scope-name">{selectedCircle?.name||'내 티끌'}</span><ChevronDown size={12} className="un-scope-chevron" aria-hidden="true"/></>}>{close=><><button className="un-scope-option" aria-pressed={scope==='mine'} onClick={()=>{onScope('mine');close();}}><Lock size={15} aria-hidden="true"/><span className="un-scope-option-name">내 티끌</span><span className="un-scope-check" aria-hidden="true">{scope==='mine'&&<Check size={14}/>}</span></button>{circles.map(c=><button className="un-scope-option" key={c.id} aria-pressed={scope===c.id} onClick={()=>{onScope(c.id);close();}}><Users size={15} aria-hidden="true"/><span className="un-scope-option-name">{c.name}</span><small className="un-scope-member-count">{c.members.length}명</small><span className="un-scope-check" aria-hidden="true">{scope===c.id&&<Check size={14}/>}</span></button>)}<button className="un-scope-manage" onClick={()=>{close();onGroups();}}><KeyRound size={15}/><span>코드로 참여 · 모임 만들기</span></button></>}</CompactPopover>
  <div className="un-header-actions"><HeaderInstallControl pwa={pwa}/><button className="un-header-action" aria-label="설정 열기" onClick={onSettings}><Settings size={21} strokeWidth={1.65}/></button></div>
 </header>;
}
