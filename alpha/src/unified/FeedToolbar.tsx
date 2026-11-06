'use client';
import {useCallback,useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {Search,CalendarDays,Check,ChevronDown,Archive,Grid2X2,List,SlidersHorizontal,X} from 'lucide-react';
import {LayoutGroup,motion} from 'motion/react';
import {useMotionPreference} from '@/lib/useMotionPreference';
import type {LogViewMode} from '@/components/logbook/FloatingLogControls';
import {watchFeedToolbarPinned} from './feedToolbarPinned';
import CompactPopover from '@/components/logbook/CompactPopover';
import {INTERACTION_SPRING,instantMotion} from '@/lib/surfaceMotion';
import '@/components/logbook/FloatingLogControls.css';
import './FeedToolbar.css';

const categories=[['all','모든 카테고리'],['daily','일상'],['dining','미식'],['movie','영화·드라마'],['book','책'],['music','음악']] as const;

type Props={
  query:string;
  onQueryChange:(value:string)=>void;
  category:string;
  onCategoryChange:(value:string)=>void;
  sort:'recent'|'old';
  onSortChange:(value:'recent'|'old')=>void;
  photosOnly:boolean;
  onPhotosOnlyChange:(value:boolean)=>void;
  mode:LogViewMode;
  onModeChange:(value:LogViewMode)=>void;
  allowCalendar:boolean;
  libraryActive?:boolean;
  library:(close:()=>void)=>ReactNode;
};

export default function FeedToolbar({
  query,
  onQueryChange,
  category,
  onCategoryChange,
  sort,
  onSortChange,
  photosOnly,
  onPhotosOnlyChange,
  mode,
  onModeChange,
  allowCalendar,
  libraryActive,
  library,
}:Props){
  const [open,setOpen]=useState<'filter'|'more'|null>(null),[searchOpen,setSearchOpen]=useState(false),[pinned,setPinned]=useState(false);
  const sentinel=useRef<HTMLDivElement>(null),shell=useRef<HTMLDivElement>(null),input=useRef<HTMLInputElement>(null),searchButton=useRef<HTMLButtonElement>(null),searchSlot=useRef<HTMLDivElement>(null),id=useId();
  const reduced=useMotionPreference();
  const filterOpen=useCallback((value:boolean)=>{setOpen(value?'filter':null);if(value){setSearchOpen(false);}},[]),moreOpen=useCallback((value:boolean)=>{setOpen(value?'more':null);if(value){setSearchOpen(false);}},[]);

  useEffect(()=>{
    const marker=sentinel.current,bar=shell.current;
    if(marker&&bar)return watchFeedToolbarPinned(marker,bar,setPinned);
  },[]);

  useEffect(()=>{
    if(!searchOpen)return;
    if(searchOpen)input.current?.focus({preventScroll:true});
    const outside=(event:MouseEvent)=>{
      const path=event.composedPath();
      if(searchSlot.current&&!path.includes(searchSlot.current))setSearchOpen(false);
    };
    const keyboard=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        if(searchOpen){setSearchOpen(false);searchButton.current?.focus({preventScroll:true});}
      }
    };
    document.addEventListener('click',outside);
    document.addEventListener('keydown',keyboard);
    return()=>{
      document.removeEventListener('click',outside);
      document.removeEventListener('keydown',keyboard);
    };
  },[searchOpen]);

  const filtered=category!=='all'||sort!=='recent'||photosOnly;
  const modes=([['cards','카드',Grid2X2],['list','리스트',List],...(allowCalendar?[['calendar','캘린더',CalendarDays] as const]:[])] as const);

  return (
    <>
      <div ref={sentinel} className="flc-sentinel un-feed-toolbar-sentinel" aria-hidden="true"/>
      <div
        ref={shell}
        className={`flc-shell un-log-controls un-feed-toolbar ${pinned?'is-pinned':''} ${searchOpen?'is-search-open':''}`}
        data-pinned={pinned}
        data-no-swipe
      >
        <div ref={searchSlot} className="flc-search-slot un-feed-search-slot">
          <motion.button
            ref={searchButton}
            type="button"
            className="flc-search-toggle"
            aria-label={searchOpen?'검색창 접기':'티끌 검색 열기'}
            aria-expanded={searchOpen}
            aria-controls={id}
            data-active={!!query}
            whileTap={reduced?undefined:{scale:0.98}}
            whileHover={reduced?undefined:{scale:1.01}}
            transition={reduced?instantMotion:INTERACTION_SPRING}
            onClick={()=>{setOpen(null);setSearchOpen(value=>!value);}}
          >
            <Search aria-hidden="true" size={19}/>
            <span className="un-feed-search-label" aria-hidden="true">검색</span>
            {query&&!searchOpen&&<i aria-hidden="true"/>}
          </motion.button>
          <div id={id} className="flc-search-field" aria-hidden={!searchOpen} inert={!searchOpen}>
            <input
              ref={input}
              aria-label="티끌 검색"
              type="search"
              placeholder="티끌 검색"
              maxLength={200}
              value={query}
              onChange={event=>onQueryChange(event.target.value)}
            />
            {query&&(
              <motion.button
                type="button"
                aria-label="검색 지우기"
                className="flc-clear"
                whileTap={reduced?undefined:{scale:0.98}}
                transition={reduced?instantMotion:INTERACTION_SPRING}
                onClick={()=>{onQueryChange('');input.current?.focus();}}
              >
                <X aria-hidden="true" size={15}/>
              </motion.button>
            )}
          </div>
        </div>
        <div className="un-feed-toolbar-space"/>
        <CompactPopover
          label="카테고리·정렬"
          open={open==='filter'}
          onOpenChange={filterOpen}
          className="un-feed-filter"
          active={filtered}
          trigger={
            <>
              <SlidersHorizontal aria-hidden="true" size={16} className="un-feed-filter-icon"/>
              <span className="un-feed-category-label">{category==='all'?'카테고리':categories.find(([value])=>value===category)?.[1]||'카테고리'}</span>
              <ChevronDown aria-hidden="true" size={11} className="un-feed-filter-chevron"/>
              {filtered&&<i className="un-feed-active-dot" aria-hidden="true"/>}
            </>
          }
        >
          {()=>(
            <div className="un-feed-filter-content">
              <fieldset>
                <legend>카테고리</legend>
                <LayoutGroup id={`${id}-categories`}>
                  <div className="un-feed-category-options">
                    {categories.map(([value,label])=>(
                      <motion.button
                        type="button"
                        key={value}
                        aria-pressed={category===value}
                        whileTap={reduced?undefined:{scale:0.98}}
                        whileHover={reduced?undefined:{scale:1.01}}
                        transition={reduced?instantMotion:INTERACTION_SPRING}
                        onClick={()=>onCategoryChange(value)}
                      >
                        {category===value&&<motion.span layoutId={reduced?undefined:"un-surface-cat-pill"} className="un-surface-filter-active-bg" style={{position:'absolute',inset:0,pointerEvents:'none'}} transition={reduced?instantMotion:INTERACTION_SPRING} aria-hidden="true"/>}
                        <span>{label}</span>
                        {category===value&&<Check aria-hidden="true" size={12}/>}
                      </motion.button>
                    ))}
                  </div>
                </LayoutGroup>
              </fieldset>
              <fieldset>
                <legend>정렬</legend>
                <LayoutGroup id={`${id}-sorts`}>
                  <div className="un-feed-sort-options">
                    {([['recent','최신순'],['old','오래된순']] as const).map(([value,label])=>(
                      <motion.button
                        type="button"
                        key={value}
                        aria-pressed={sort===value}
                        whileTap={reduced?undefined:{scale:0.98}}
                        whileHover={reduced?undefined:{scale:1.01}}
                        transition={reduced?instantMotion:INTERACTION_SPRING}
                        onClick={()=>onSortChange(value)}
                      >
                        {sort===value&&<motion.span layoutId={reduced?undefined:"un-surface-sort-pill"} className="un-surface-filter-active-bg" style={{position:'absolute',inset:0,pointerEvents:'none'}} transition={reduced?instantMotion:INTERACTION_SPRING} aria-hidden="true"/>}
                        <span>{label}</span>
                        {sort===value&&<Check aria-hidden="true" size={12}/>}
                      </motion.button>
                    ))}
                  </div>
                </LayoutGroup>
              </fieldset>
              <label className="un-feed-photo-filter">
                <span>사진이 있는 기록만</span>
                <motion.button
                  type="button"
                  role="switch"
                  aria-label="사진이 있는 기록만"
                  aria-checked={photosOnly}
                  className="un-feed-photo-switch"
                  whileTap={reduced?undefined:{scale:0.95}}
                  transition={reduced?instantMotion:INTERACTION_SPRING}
                  onClick={()=>onPhotosOnlyChange(!photosOnly)}
                >
                  <motion.i initial={false} animate={{x:photosOnly?19:0}} transition={reduced?instantMotion:INTERACTION_SPRING}/>
                </motion.button>
              </label>
              {filtered&&(
                <motion.button
                  type="button"
                  className="un-feed-filter-reset"
                  whileTap={reduced?undefined:{scale:0.98}}
                  transition={reduced?instantMotion:INTERACTION_SPRING}
                  onClick={()=>{onCategoryChange('all');onSortChange('recent');onPhotosOnlyChange(false);}}
                >
                  필터 초기화
                </motion.button>
              )}
            </div>
          )}
        </CompactPopover>
        <CompactPopover
          label="보관함"
          open={open==='more'}
          onOpenChange={moreOpen}
          className="un-feed-library"
          active={libraryActive}
          trigger={<Archive aria-hidden="true" size={20}/>}
        >
          {close=><>{library(close)}<fieldset className="un-feed-library-views"><legend>보기 설정</legend>{modes.map(([value,label,Icon])=><button key={value} type="button" aria-pressed={mode===value} onClick={()=>{onModeChange(value);close();}}><Icon size={17} aria-hidden="true"/>{label}{mode===value&&<Check size={14} aria-hidden="true"/>}</button>)}</fieldset></>}
        </CompactPopover>
      </div>
      {(query||filtered)&&<div className="un-feed-filter-chips" aria-label="적용한 검색 조건">
        {query&&<button type="button" onClick={()=>onQueryChange('')} aria-label="검색어 조건 해제">검색: {query}<X size={12} aria-hidden="true"/></button>}
        {category!=='all'&&<button type="button" onClick={()=>onCategoryChange('all')} aria-label="카테고리 조건 해제">{categories.find(([value])=>value===category)?.[1]||category}<X size={12} aria-hidden="true"/></button>}
        {sort!=='recent'&&<button type="button" onClick={()=>onSortChange('recent')}>오래된순<X size={12} aria-hidden="true"/></button>}
        {photosOnly&&<button type="button" onClick={()=>onPhotosOnlyChange(false)}>사진 있는 티끌<X size={12} aria-hidden="true"/></button>}
      </div>}
    </>
  );
}
