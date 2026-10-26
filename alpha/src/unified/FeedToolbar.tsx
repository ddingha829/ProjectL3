'use client';
import {useCallback,useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {CalendarDays,Check,ChevronDown,Ellipsis,Grid2X2,List,SlidersHorizontal,X} from 'lucide-react';
import CompactPopover from '@/components/logbook/CompactPopover';
import {AnimatedSearch,type AnimatedSearchHandle} from '@/components/logbook/AnimatedSearch';
import type {LogViewMode} from '@/components/logbook/FloatingLogControls';
import '@/components/logbook/FloatingLogControls.css';
import './FeedToolbar.css';
const categories=[['all','전체'],['daily','일상'],['dining','미식'],['movie','영화·드라마'],['book','책']] as const;
type Props={query:string;onQueryChange:(value:string)=>void;category:string;onCategoryChange:(value:string)=>void;sort:'recent'|'old';onSortChange:(value:'recent'|'old')=>void;photosOnly:boolean;onPhotosOnlyChange:(value:boolean)=>void;mode:LogViewMode;onModeChange:(value:LogViewMode)=>void;allowCalendar:boolean;libraryActive?:boolean;library:(close:()=>void)=>ReactNode};
export default function FeedToolbar({query,onQueryChange,category,onCategoryChange,sort,onSortChange,photosOnly,onPhotosOnlyChange,mode,onModeChange,allowCalendar,libraryActive,library}:Props){
 const [open,setOpen]=useState<'filter'|'more'|null>(null),[searchOpen,setSearchOpen]=useState(false),[pinned,setPinned]=useState(false);
 const sentinel=useRef<HTMLDivElement>(null),shell=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null),searchButton=useRef<HTMLButtonElement>(null),searchSlot=useRef<HTMLDivElement>(null),search=useRef<AnimatedSearchHandle>(null),id=useId();
 const filterOpen=useCallback((value:boolean)=>setOpen(value?'filter':null),[]),moreOpen=useCallback((value:boolean)=>setOpen(value?'more':null),[]);
 useEffect(()=>{
  let frame=0;
  // Measure the flow marker instead of relying on WebKit's sticky/intersection
  // notifications. Re-read the inset when Safari's viewport or safe area changes.
  const update=()=>{frame=0;const marker=sentinel.current,bar=shell.current;if(!marker||!bar)return;const top=parseFloat(getComputedStyle(bar).top)||0;setPinned(marker.getBoundingClientRect().top<top-.5);};
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  update();window.addEventListener('scroll',schedule,{capture:true,passive:true});window.addEventListener('resize',schedule);
  const viewport=window.visualViewport;viewport?.addEventListener('resize',schedule);viewport?.addEventListener('scroll',schedule);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule,true);window.removeEventListener('resize',schedule);viewport?.removeEventListener('resize',schedule);viewport?.removeEventListener('scroll',schedule);};
 },[]);
 useEffect(()=>{if(!searchOpen)return;input.current?.focus({preventScroll:true});const outside=(event:MouseEvent)=>{if(searchSlot.current&&!event.composedPath().includes(searchSlot.current))setSearchOpen(false);};const keyboard=(event:KeyboardEvent)=>{if(event.key==='Escape'){setSearchOpen(false);searchButton.current?.focus({preventScroll:true});}};document.addEventListener('click',outside);document.addEventListener('keydown',keyboard);return()=>{document.removeEventListener('click',outside);document.removeEventListener('keydown',keyboard);};},[searchOpen]);
 const filtered=category!=='all'||sort!=='recent'||photosOnly;
 const modes=([['cards','카드',Grid2X2],['list','리스트',List],...(allowCalendar?[['calendar','캘린더',CalendarDays] as const]:[])] as const);
 return <><div ref={sentinel} className="flc-sentinel" aria-hidden="true"/><div ref={shell} className={`flc-shell un-log-controls un-feed-toolbar ${pinned?'is-pinned':''} ${searchOpen?'is-search-open':''}`} data-pinned={pinned} data-no-swipe>
  <CompactPopover label="카테고리·정렬" open={open==='filter'} onOpenChange={filterOpen} className="un-feed-filter" active={filtered} trigger={<><SlidersHorizontal size={16} className="un-feed-filter-icon"/><span className="un-feed-category-label">{categories.find(([value])=>value===category)?.[1]||'전체'}</span><ChevronDown size={11} className="un-feed-filter-chevron"/>{filtered&&<i className="un-feed-active-dot" aria-hidden="true"/>}</>}>
   {()=> <div className="un-feed-filter-content"><fieldset><legend>카테고리</legend><div className="un-feed-category-options">{categories.map(([value,label])=><button key={value} aria-pressed={category===value} onClick={()=>onCategoryChange(value)}>{label}{category===value&&<Check size={12}/>}</button>)}</div></fieldset><fieldset><legend>정렬</legend><div className="un-feed-sort-options">{([['recent','최신순'],['old','오래된순']] as const).map(([value,label])=><button key={value} aria-pressed={sort===value} onClick={()=>onSortChange(value)}>{label}{sort===value&&<Check size={12}/>}</button>)}</div></fieldset><label className="un-feed-photo-filter"><span>사진이 있는 기록만</span><button type="button" role="switch" aria-label="사진이 있는 기록만" aria-checked={photosOnly} className="un-feed-photo-switch" onClick={()=>onPhotosOnlyChange(!photosOnly)}><i/></button></label>{filtered&&<button className="un-feed-filter-reset" onClick={()=>{onCategoryChange('all');onSortChange('recent');onPhotosOnlyChange(false);}}>필터 초기화</button>}</div>}
  </CompactPopover>
  <div className="un-feed-toolbar-space"/>
  <div ref={searchSlot} className="flc-search-slot un-feed-search-slot"><button ref={searchButton} className="flc-search-toggle" aria-label={searchOpen?'검색창 접기':'로그 검색 열기'} aria-expanded={searchOpen} aria-controls={id} data-active={!!query} onClick={()=>{setOpen(null);setSearchOpen(value=>!value);search.current?.startAnimation();}} onMouseEnter={()=>search.current?.startAnimation()} onMouseLeave={()=>search.current?.stopAnimation()}><AnimatedSearch ref={search} size={19}/>{query&&!searchOpen&&<i aria-hidden="true"/>}</button><div id={id} className="flc-search-field" aria-hidden={!searchOpen} inert={!searchOpen}><input ref={input} aria-label="로그 검색" type="search" placeholder="로그 검색" maxLength={200} value={query} onChange={event=>onQueryChange(event.target.value)}/>{query&&<button aria-label="검색 지우기" className="flc-clear" onClick={()=>{onQueryChange('');input.current?.focus();}}><X size={15}/></button>}</div></div>
  <CompactPopover label="보기·보관함" open={open==='more'} onOpenChange={moreOpen} className="un-feed-more" active={libraryActive||mode!=='cards'} trigger={<Ellipsis size={21}/>}>
   {close=><><span className="flc-menu-heading">보기 방식</span>{modes.map(([value,label,Icon])=><button key={value} aria-pressed={mode===value} onClick={()=>{onModeChange(value);close();}}><Icon size={16}/><span>{label}</span>{mode===value&&<Check size={14}/>}</button>)}<hr className="un-feed-menu-divider"/>{library(close)}</>}
  </CompactPopover>
 </div></>;
}
