'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {Check,ChevronDown,KeyRound,Lock,Search,Settings,Users,X} from 'lucide-react';
import CompactPopover from '@/components/logbook/CompactPopover';
import type {Circle} from '@/social/model';
export default function UnifiedHeader({scope,circles,onScope,onHome,onSettings,onGroups,query,onQuery}:{scope:string;circles:Circle[];onScope:(id:string)=>void;onHome:()=>void;onSettings:()=>void;onGroups:()=>void;query:string;onQuery:(value:string)=>void}){
 const [scopeOpen,setScopeOpen]=useState(false),[searchOpen,setSearchOpen]=useState(false),input=useRef<HTMLInputElement>(null),searchButton=useRef<HTMLButtonElement>(null);
 const scopeChanged=useCallback((value:boolean)=>setScopeOpen(value),[]);
 useEffect(()=>{if(searchOpen)input.current?.focus({preventScroll:true});},[searchOpen]);
 return <header className={`un-header un-header-v2 ${searchOpen?'is-searching':''}`}>
  <button className="un-brand" aria-label="피드 화면" onClick={onHome}>L2<span>.</span></button>
  <CompactPopover label="로그 범위 선택" open={scopeOpen} onOpenChange={scopeChanged} className="un-scope-picker" trigger={<><span>{scope==='mine'?'마이로그':circles.find(c=>c.id===scope)?.name||'마이로그'}</span><ChevronDown size={12}/></>}>{close=><><button aria-pressed={scope==='mine'} onClick={()=>{onScope('mine');close();}}><Lock size={15}/><span>마이로그</span>{scope==='mine'&&<Check size={14}/>}</button>{circles.map(c=><button key={c.id} aria-pressed={scope===c.id} onClick={()=>{onScope(c.id);close();}}><Users size={15}/><span>{c.name}</span>{scope===c.id&&<Check size={14}/>}</button>)}<button className="un-scope-manage" onClick={()=>{close();onGroups();}}><KeyRound size={15}/><span>코드로 참여 · 모임 만들기</span></button></>}</CompactPopover>
  <div className={`un-header-search ${searchOpen?'is-open':''}`}>
   {searchOpen?<><Search size={17}/><input ref={input} type="search" maxLength={200} aria-label="로그 검색" placeholder="로그 검색" value={query} onChange={e=>onQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Escape'){setSearchOpen(false);requestAnimationFrame(()=>searchButton.current?.focus());}}}/><button aria-label={query?'검색 지우기':'검색창 접기'} onClick={()=>{if(query){onQuery('');input.current?.focus();}else{setSearchOpen(false);requestAnimationFrame(()=>searchButton.current?.focus());}}}><X size={16}/></button></>:<button ref={searchButton} className="un-header-action" aria-label="로그 검색 열기" aria-expanded={false} data-active={!!query} onClick={()=>{setScopeOpen(false);setSearchOpen(true);}}><Search size={21} strokeWidth={1.65}/>{query&&<i aria-hidden="true"/>}</button>}
  </div>
  <button className="un-header-action" aria-label="설정 열기" onClick={onSettings}><Settings size={21} strokeWidth={1.65}/></button>
 </header>;
}
