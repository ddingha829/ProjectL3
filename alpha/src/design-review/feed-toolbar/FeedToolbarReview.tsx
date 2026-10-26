'use client';
import {useState} from 'react';
import {Check,ChevronDown,FolderOpen,Grid2X2,MoreHorizontal,Search,Settings,SlidersHorizontal,X} from 'lucide-react';
import styles from './FeedToolbarReview.module.css';

type Panel='search'|'filter'|'more'|'category'|'library'|null;
function Proposal({variant}:{variant:'a'|'b'}){
 const [panel,setPanel]=useState<Panel>(null),[category,setCategory]=useState('전체'),[mode,setMode]=useState('카드 보기');
 const toggle=(value:Panel)=>setPanel(current=>current===value?null:value);
 return <section className={styles.option} aria-label={variant==='a'?'A안 · 도구 3개':'B안 · 카테고리 우선'}>
  <div className={styles.optionHeading}><span>{variant==='a'?'A':'B'}</span><h2>{variant==='a'?'도구 3개로 간결하게':'분류를 자주 바꾼다면'}</h2>{variant==='a'&&<small>추천</small>}</div>
  <div className={styles.phone}>
   <header className={styles.header}><strong>L2<span>.</span></strong><span className={styles.scope}>마이로그<ChevronDown size={11}/></span><span className={styles.settings} aria-hidden="true"><Settings size={18}/></span></header>
   <div className={styles.tools}>
    {variant==='b'&&<button className={styles.category} aria-expanded={panel==='category'} onClick={()=>toggle('category')}>{category}<ChevronDown size={12}/></button>}
    <div className={variant==='a'||panel==='search'?styles.searchField:styles.searchIcon}>
     <button aria-label="검색 펼치기" aria-expanded={panel==='search'} onClick={()=>toggle('search')}><Search size={17}/>{variant==='a'&&panel!=='search'&&<span>로그 검색</span>}</button>
     {panel==='search'&&<input autoFocus type="search" aria-label="검색어 예시" placeholder="로그 검색"/>}
    </div>
    <button className={styles.icon} aria-label="필터 펼치기" aria-expanded={panel==='filter'} onClick={()=>toggle('filter')}><SlidersHorizontal size={18}/>{category!=='전체'&&<i/>}</button>
    <button className={styles.icon} aria-label="더보기 펼치기" aria-expanded={panel==='more'} onClick={()=>toggle('more')}><MoreHorizontal size={20}/></button>
   </div>
   {category!=='전체'&&<button className={styles.activeChip} onClick={()=>setCategory('전체')}>{category}<X size={11}/></button>}
   <div className={`${styles.grid} ${mode==='리스트 보기'?styles.list:''}`} aria-label="카드 배치 예시">
    <article className={styles.photo} style={{backgroundImage:'url(/images/studio-cafe.png)'}}><div><strong>창가에 머문 오후</strong><small>성수동 · 2026.10.26</small></div><span>수연</span></article>
    <article className={styles.note}><small>DAILY</small><strong>기억하고 싶은 오늘</strong><p>서두르지 않고<br/>천천히 돌아본 하루.</p><span>민준</span></article>
   </div>
   <div className={styles.secondaryCards} aria-hidden="true"><div/><div/></div>
   {(panel==='filter'||panel==='category')&&<div className={styles.popover}>
    <div className={styles.panelHeader}><strong>{panel==='filter'?'필터':'카테고리'}</strong><button aria-label="선택창 닫기" onClick={()=>setPanel(null)}><X size={16}/></button></div>
    <div className={styles.choices}>{['전체','일상','미식','영화','책'].map(item=><button key={item} aria-pressed={category===item} onClick={()=>{setCategory(item);setPanel(null);}}>{item}{category===item&&<Check size={12}/>}</button>)}</div>
    {panel==='filter'&&<p>카테고리 · 정렬 · 사진 유무를 한곳에서</p>}
   </div>}
   {panel==='more'&&<div className={`${styles.popover} ${styles.more}`}><button onClick={()=>{setMode(current=>current==='카드 보기'?'리스트 보기':'카드 보기');setPanel(null);}}><Grid2X2 size={16}/>{mode}<ChevronDown size={12}/></button><button onClick={()=>{setPanel('library');}}><FolderOpen size={16}/>보관함</button></div>}
   {panel==='library'&&<div className={`${styles.popover} ${styles.more}`}><div className={styles.panelHeader}><strong>보관함</strong><button aria-label="보관함 시안 닫기" onClick={()=>setPanel(null)}><X size={16}/></button></div><p>담아둔 기록 · 개인 컬렉션 · 취향 선반</p></div>}
  </div>
  <p className={styles.description}>{variant==='a'?'검색은 가볍게, 카테고리·정렬은 필터 안으로. 보기모드·보관함은 더보기에 모아요.':'왼쪽에는 현재 분류만, 오른쪽에는 검색·필터·더보기. 자주 고르는 분류를 바로 바꿔요.'}</p>
 </section>;
}
export default function FeedToolbarReview(){return <main className={styles.page}><header className={styles.intro}><p>피드 상단 메뉴 · 비교 시안</p><h1>카드에 더 집중하는 상단</h1><span>실제 피드 메뉴는 유지했습니다. 아래 버튼을 눌러 구성과 메뉴 묶음을 비교해 보세요.</span></header><div className={styles.comparison}><Proposal variant="a"/><Proposal variant="b"/></div></main>;}
