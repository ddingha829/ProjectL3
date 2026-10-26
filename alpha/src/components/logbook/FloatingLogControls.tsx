'use client';
import {useCallback,useEffect,useRef,useState,type ReactNode} from 'react';
import {CalendarDays,Check,ChevronDown,FolderOpen,Grid2X2,List,Tag,X} from 'lucide-react';
import {AnimatedSearch,type AnimatedSearchHandle} from './AnimatedSearch';
import {AnimatedSliders} from './AnimatedSliders';
import SlidingChoice from './SlidingChoice';
import CompactPopover from './CompactPopover';
import './FloatingLogControls.css';
export type LogViewMode='cards'|'list'|'calendar';
const categories=[{id:'all',label:'전체'},{id:'daily',label:'일상'},{id:'dining',label:'미식'},{id:'movie',label:'영화'},{id:'book',label:'책'}];
type Props={hideSearch?:boolean;query:string;onQueryChange:(value:string)=>void;category:string;onCategoryChange:(value:string)=>void;filterCount:number;onOpenFilter:()=>void;mode:LogViewMode;onModeChange:(mode:LogViewMode)=>void;allowCalendar:boolean;meta?:ReactNode;library?:(close:()=>void)=>ReactNode;libraryActive?:boolean};
export default function FloatingLogControls({query,onQueryChange,category,onCategoryChange,filterCount,onOpenFilter,mode,onModeChange,allowCalendar,meta,library,libraryActive,hideSearch=false}:Props){
 const sentinel=useRef<HTMLDivElement>(null),shell=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null),search=useRef<AnimatedSearchHandle>(null),sliders=useRef<AnimatedSearchHandle>(null);
 const [pinned,setPinned]=useState(false),[open,setOpen]=useState<'category'|'view'|'library'|null>(null);
 const categoryOpen=useCallback((value:boolean)=>setOpen(value?'category':null),[]),viewOpen=useCallback((value:boolean)=>setOpen(value?'view':null),[]),libraryOpen=useCallback((value:boolean)=>setOpen(value?'library':null),[]);
 useEffect(()=>{if(!sentinel.current||!shell.current)return;const top=parseFloat(getComputedStyle(shell.current).top)||10;const observer=new IntersectionObserver(([entry])=>setPinned(!entry.isIntersecting),{rootMargin:`-${top}px 0px 0px 0px`,threshold:0});observer.observe(sentinel.current);return()=>observer.disconnect();},[]);
 const modes=([['cards','카드',Grid2X2],['list','리스트',List],...(allowCalendar?[['calendar','캘린더',CalendarDays] as const]:[])] as const),ModeIcon=mode==='cards'?Grid2X2:mode==='list'?List:CalendarDays;
 return <><div ref={sentinel} className="flc-sentinel" aria-hidden="true"/><div ref={shell} className={`flc-shell un-log-controls${pinned?' is-pinned':''}${hideSearch?' is-tools-only':''}`} data-pinned={pinned} data-no-swipe>
  {!hideSearch&&<div className="flc-input-group" role="group" aria-label="로그 검색창"><span className="flc-search-symbol"><AnimatedSearch ref={search} size={18}/></span><input ref={input} aria-label="로그 검색" type="search" placeholder="로그 검색" value={query} maxLength={200} onChange={e=>onQueryChange(e.target.value)} onFocus={()=>{setOpen(null);search.current?.startAnimation();}} onBlur={()=>search.current?.stopAnimation()}/>{query&&<button className="flc-clear" aria-label="검색 지우기" onClick={()=>{onQueryChange('');input.current?.focus();}}><X size={15}/></button>}</div>}
  {!hideSearch&&meta&&<div className="flc-meta">{meta}</div>}
  <div className="flc-toolbar">
   <CompactPopover label="카테고리 선택" open={open==='category'} onOpenChange={categoryOpen} className="flc-category-anchor" active={category!=='all'} trigger={<><Tag size={16}/><span className="flc-category-label">{hideSearch&&category==='all'?'카테고리':categories.find(c=>c.id===category)?.label||'분류'}</span><ChevronDown size={10}/></>}>{close=><div className="flc-category-options"><span className="flc-menu-heading">카테고리</span><SlidingChoice label="카테고리" items={categories} value={category} onChange={value=>{onCategoryChange(value);close();}}/></div>}</CompactPopover>
   <button className="flc-filter-trigger" aria-label={filterCount?`필터 ${filterCount}개 적용됨`:'필터 열기'} title="필터" data-active={filterCount>0} onMouseEnter={()=>sliders.current?.startAnimation()} onMouseLeave={()=>sliders.current?.stopAnimation()} onFocus={()=>sliders.current?.startAnimation()} onBlur={()=>sliders.current?.stopAnimation()} onClick={()=>{sliders.current?.startAnimation();setOpen(null);onOpenFilter();}}><AnimatedSliders ref={sliders}/>{hideSearch&&<span className="flc-tool-label">필터</span>}{filterCount>0&&<span className="flc-filter-count">{filterCount}</span>}</button>
   <CompactPopover label="보기 방식 선택" open={open==='view'} onOpenChange={viewOpen} className="flc-view-anchor" trigger={<><ModeIcon size={17}/>{hideSearch&&<span className="flc-tool-label">보기모드</span>}<ChevronDown size={10}/></>}>{close=><>{modes.map(([id,label,Icon])=><button key={id} aria-pressed={mode===id} onClick={()=>{onModeChange(id);close();}}><Icon size={16}/><span>{label}</span>{mode===id&&<Check size={14}/>}</button>)}</>}</CompactPopover>
   {library&&<CompactPopover label="보관 도구" open={open==='library'} onOpenChange={libraryOpen} className="flc-library-anchor" active={libraryActive} trigger={<><FolderOpen size={18}/>{hideSearch&&<span className="flc-tool-label">보관함</span>}</>}>{library}</CompactPopover>}
  </div>
 </div></>;
}
