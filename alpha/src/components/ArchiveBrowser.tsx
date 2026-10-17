'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Search, SlidersHorizontal, List, LayoutGrid, MapPin, FolderPlus, X, Utensils, Clapperboard, Shapes, Layers, Check, PencilLine, Trash2, Sparkles, LoaderCircle } from 'lucide-react';
import type { ArchiveCategory, ArchiveItem, CardAppearance, GeoPoint, MapApiPlace } from '@/types/l2';
import { ARCHIVE_CATEGORIES, getArchiveCategory } from '@/lib/archiveCategories';
import { createCardAppearance } from '@/lib/cardAppearance';
import { INITIAL_SKINS, PRESET_SLOTS } from '@/data/initialData';
import { getGroupMembers, isLogGroup, MAX_GROUP_MEMBERS } from '@/lib/logGroups';
import { hasLinkedPlace } from '@/lib/mapLocations';
import { haptic } from '@/lib/haptics';
import { useElasticBoundary } from '@/hooks/useElasticBoundary';
import CardStage from './CardStage';
import AccessibleDialog from './AccessibleDialog';
import SwipeLogRow from './SwipeLogRow';
import './ArchiveBrowser.css';

interface Props {
  archives: ArchiveItem[];
  newId: string | null;
  onOpen: (item: ArchiveItem) => void;
  onEdit?: (item: ArchiveItem) => void;
  onWrite: () => void;
  onBrowseDesign: () => void;
  onCreateGroup: (ids: string[], title: string) => Promise<void>;
  onDelete: (item: ArchiveItem) => Promise<void>;
  onCoordinates: (id: string, coordinates: GeoPoint) => Promise<void>;
  onAutoLinkPlace?: (id: string, place: MapApiPlace) => Promise<void>;
  fallbackAppearance?: CardAppearance;
  listDetailsOn?: boolean;
  onToggleListDetails?: (value: boolean) => void;
  autoPlaceLinkOn?: boolean;
  onToggleAutoPlaceLink?: (value: boolean) => void;
}

const LogbookMap = dynamic(() => import('./LogbookMap'), { ssr: false, loading: () => <div className="logbook-map" role="status" aria-label="지도 불러오는 중"/> });
const categories = [{id:'ALL',label:'전체',Icon:Layers},...ARCHIVE_CATEGORIES.map(entry=>({id:entry.id,label:entry.label,Icon:entry.id==='DINING'?Utensils:entry.id==='CINEMA'?Clapperboard:entry.id==='ART'?MapPin:Shapes})),{id:'GROUP',label:'그룹',Icon:FolderPlus}];
const views=[{id:'list',label:'목록 보기',Icon:List},{id:'grid',label:'카드 보기',Icon:LayoutGrid},{id:'map',label:'지도 보기',Icon:MapPin}] as const;

export default function ArchiveBrowser(p:Props){
  const elasticRef = useElasticBoundary();
  const [category,setCategory]=useState<'ALL'|ArchiveCategory>('ALL');
  const [query,setQuery]=useState('');const [view,setView]=useState<'list'|'grid'|'map'>('list');const [oldest,setOldest]=useState(false);
  const [filterOpen,setFilterOpen]=useState(false);const [selecting,setSelecting]=useState(false);const [selected,setSelected]=useState<string[]>([]);
  const [naming,setNaming]=useState(false);const [name,setName]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
  const [spotlightId,setSpotlightId]=useState<string|null>(null);
  const [linkingId,setLinkingId]=useState<string|null>(null);
  const pressTimer=useRef<ReturnType<typeof setTimeout>|null>(null);
  const pressStart=useRef<{x:number;y:number}|null>(null);
  const longPressFired=useRef(false);

  const listDetailsOn = p.listDetailsOn !== false;
  const autoPlaceLinkOn = p.autoPlaceLinkOn !== false;

  const chronologicalNumbers = useMemo(() => {
    const nonGroups = p.archives
      .filter(item => !isLogGroup(item))
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp || a.id.localeCompare(b.id));
    return new Map(
      nonGroups.map((item, idx) => [item.id, String(idx + 1).padStart(2, '0')])
    );
  }, [p.archives]);

  const filtered=useMemo(()=>p.archives.filter(item=>(category==='ALL'||item.cat===category)&&(!selecting||!isLogGroup(item))&&`${item.title} ${item.quote} ${item.loc} ${item.addressShort}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())&&(view!=='map'||hasLinkedPlace(item))).sort((a,b)=>oldest?a.timestamp-b.timestamp:b.timestamp-a.timestamp),[p.archives,category,query,oldest,view,selecting]);
  const unlinkedMapItems=useMemo(()=>p.archives.filter(item=>!isLogGroup(item)&&!hasLinkedPlace(item)&&(category==='ALL'||item.cat===category)&&item.title.trim().length>=2),[p.archives,category]);
  const spotlightItem=useMemo(()=>p.archives.find(item=>item.id===spotlightId)||null,[p.archives,spotlightId]);

  useEffect(()=>{if(p.newId){setCategory('ALL');setQuery('');setOldest(false);}},[p.newId]);
  useEffect(()=>setSelected(ids=>ids.filter(id=>p.archives.some(item=>item.id===id))),[p.archives]);
  useEffect(()=>()=>{if(pressTimer.current)clearTimeout(pressTimer.current);},[]);

  const clearPress=()=>{if(pressTimer.current){clearTimeout(pressTimer.current);pressTimer.current=null;}pressStart.current=null;};
  const startPress=(item:ArchiveItem,clientX:number,clientY:number)=>{
    if(selecting)return;
    clearPress();
    longPressFired.current=false;
    pressStart.current={x:clientX,y:clientY};
    pressTimer.current=setTimeout(()=>{
      longPressFired.current=true;
      haptic.snap();
      setSpotlightId(item.id);
    },420);
  };
  const movePress=(clientX:number,clientY:number)=>{
    if(!pressStart.current)return;
    if(Math.hypot(clientX-pressStart.current.x,clientY-pressStart.current.y)>12)clearPress();
  };

  const quickLinkByTitle = async (item: ArchiveItem) => {
    if (linkingId) return;
    setLinkingId(item.id);
    setError('');
    try {
      const response = await fetch(`/api/places/search?q=${encodeURIComponent(item.title.trim())}&category=${item.cat}`);
      if (!response.ok) throw new Error('search failed');
      const data = await response.json();
      const results: MapApiPlace[] = Array.isArray(data.results) ? data.results : [];
      const best = results.find(r => r.coordinates && Number.isFinite(r.coordinates.lat) && Number.isFinite(r.coordinates.lng)) || results[0];
      if (best && p.onAutoLinkPlace) {
        await p.onAutoLinkPlace(item.id, best);
        haptic.success();
      } else {
        (p.onEdit || p.onOpen)(item);
      }
    } catch {
      (p.onEdit || p.onOpen)(item);
    } finally {
      setLinkingId(null);
    }
  };

  const open=(item:ArchiveItem)=>{if(!selecting){p.onOpen(item);return;}setError('');setSelected(ids=>ids.includes(item.id)?ids.filter(id=>id!==item.id):ids.length<MAX_GROUP_MEMBERS?[...ids,item.id]:ids);if(!selected.includes(item.id)&&selected.length>=MAX_GROUP_MEMBERS)setError('한 그룹에는 20개까지 담을 수 있어요.');};
  const create=async()=>{if(!name.trim()||busy)return;setBusy(true);setError('');try{await p.onCreateGroup(selected,name.trim());setNaming(false);setSelecting(false);setSelected([]);setName('');}catch(e){setError(e instanceof Error?e.message:'그룹을 저장하지 못했어요.');}finally{setBusy(false);}};

  const renderCardAppearance=(item:ArchiveItem)=>item.cardAppearance||createCardAppearance(item,p.fallbackAppearance?.slot||PRESET_SLOTS[0],p.fallbackAppearance?{[p.fallbackAppearance.skin.id]:p.fallbackAppearance.skin}:INITIAL_SKINS,item.author||p.fallbackAppearance?.authorName||'L2. ARCHIVE');

  return <section className="logbook" aria-label="로그북">
    <div className="logbook-toolbar">
      <div className="logbook-search-row"><button type="button" className={`logbook-filter ${category!=='ALL'?'active':''}`} aria-label="분류 필터" aria-haspopup="dialog" onClick={()=>setFilterOpen(true)}><SlidersHorizontal size={19}/>{category!=='ALL'&&<i/>}</button><label className="logbook-search"><Search size={18} aria-hidden="true"/><span className="sr-only">로그 검색</span><input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="로그 검색"/></label></div>
      <div className="logbook-tools-row"><div className="logbook-views" role="group" aria-label="보기 방식">{views.map(({id,label,Icon})=><button type="button" key={id} aria-label={label} title={label} aria-pressed={view===id} className={view===id?'active':''} onClick={()=>setView(id)}><Icon size={17}/></button>)}</div><button type="button" className="logbook-sort" onClick={()=>setOldest(v=>!v)}>{oldest?'오래된순 ↑':'최신순 ↓'}</button>{selecting&&<button type="button" className="logbook-cancel" aria-label="모음 선택 취소" onClick={()=>{setSelecting(false);setSelected([]);setError('');}}><X size={16}/></button>}<button type="button" className={`logbook-group ${selecting?'active':''}`} disabled={selecting&&!selected.length} onClick={()=>{if(selecting){setNaming(true);return;}setCategory('ALL');setSelecting(true);setView('list');setError('');}}>{!selecting&&<FolderPlus size={15}/>}<span>{selecting?`다음 · ${selected.length}`:'모음 만들기'}</span></button></div>
    </div>
    {error&&!naming&&<p className="logbook-error" role="status">{error}</p>}
    {autoPlaceLinkOn&&unlinkedMapItems.length>0&&(view==='map'||view==='list')&&<div className="logbook-map-unlinked" role="region" aria-label="지도 미연결 기록 원탭 연결">
      <div className="logbook-map-unlinked-head">
        <span><MapPin size={13}/>지도 미연결 {unlinkedMapItems.length}개 · 제목으로 원탭 연결</span>
        {p.onToggleAutoPlaceLink&&<button type="button" className="logbook-unlinked-hide" onClick={()=>p.onToggleAutoPlaceLink?.(false)} title="설정에서 다시 켤 수 있어요">끄기</button>}
      </div>
      <div className="logbook-map-unlinked-chips">
        {unlinkedMapItems.slice(0,8).map(item=><button type="button" key={item.id} disabled={Boolean(linkingId)} onClick={()=>void quickLinkByTitle(item)}>
          {linkingId===item.id?<LoaderCircle size={12} className="preset-spinner"/>:<MapPin size={12}/>}
          <span>{item.title}</span>
        </button>)}
      </div>
    </div>}
    {view==='map'&&<LogbookMap items={filtered} onOpen={p.onOpen} onCoordinates={p.onCoordinates}/>}
    <div ref={elasticRef} className="logbook-collection">{!p.archives.length?<div className="logbook-empty"><h1>나의 첫 로그</h1><button className="test-button primary" onClick={p.onWrite}>로그 남기기</button><button className="test-text-button" onClick={p.onBrowseDesign}>프리셋 둘러보기</button></div>:!filtered.length?<div className="logbook-empty"><p>표시할 로그가 없어요.</p><button className="test-text-button" onClick={()=>{setCategory('ALL');setQuery('');setView('list');}}>전체 로그 보기</button></div>:view==='grid'?<div className="logbook-posters">{filtered.map(item=>{
      const appearance=renderCardAppearance(item);
      const isSpotlit=spotlightId===item.id;
      const itemWithNum=isLogGroup(item)?item:{...item,num:chronologicalNumbers.get(item.id)||item.num};
      return <button
        type="button"
        id={`record-${item.id}`}
        key={item.id}
        className={`logbook-poster ${p.newId===item.id?'just-added':''} ${isSpotlit?'is-spotlit':''}`}
        aria-label={`${item.title}, ${item.date}`}
        onPointerDown={e=>startPress(item,e.clientX,e.clientY)}
        onPointerMove={e=>movePress(e.clientX,e.clientY)}
        onPointerUp={clearPress}
        onPointerCancel={clearPress}
        onContextMenu={e=>{e.preventDefault();clearPress();longPressFired.current=true;haptic.snap();setSpotlightId(item.id);}}
        onClick={()=>{if(longPressFired.current){longPressFired.current=false;return;}open(item);}}
      >
        <div aria-hidden="true"><CardStage item={itemWithNum} slot={appearance.slot} skin={appearance.skin} authorName={appearance.authorName} selectedItems={isLogGroup(item)?getGroupMembers(item,p.archives):[itemWithNum]} curationTitle={item.title}/></div>
        {isLogGroup(item)&&<span className="logbook-poster-group">그룹 · {getGroupMembers(item,p.archives).length}</span>}
      </button>;
    })}</div>:<div className="logbook-rows">{filtered.map((item,index)=>{
      const picked=selected.includes(item.id),group=isLogGroup(item),place=view==='map'?item.fullAddress||item.addressShort||item.loc:item.addressShort||item.loc;
      const catLabel=group?'그룹':getArchiveCategory(item.cat).label;
      const logNumber=group?'그룹':(chronologicalNumbers.get(item.id)||item.num||String(filtered.length-index).padStart(2,'0'));
      return <SwipeLogRow key={item.id} title={item.title} disabled={selecting} onDelete={()=>p.onDelete(item)}><button type="button" id={`record-${item.id}`} className={`logbook-row ${picked?'picked':''} ${p.newId===item.id?'just-added':''}`} aria-pressed={selecting?picked:undefined} onClick={()=>open(item)}><span className={`logbook-number ${group?'is-group':''}`}>{logNumber}</span><span className="logbook-row-body"><span className="logbook-title">{item.title}</span><time>{item.date}</time>{place&&<span className="logbook-location">{place}</span>}{group&&<span className="logbook-location">로그 {getGroupMembers(item,p.archives).length}개</span>}{listDetailsOn&&<span className="logbook-meta-badges"><span className="logbook-cat-badge">{catLabel}</span>{item.score&&<span className="logbook-score-badge">★ {item.score}</span>}</span>}{listDetailsOn&&item.quote&&<span className="logbook-quote-preview">{item.quote}</span>}</span>{selecting&&<span className={`logbook-check ${picked?'checked':''}`}>{picked&&<Check size={15}/>}</span>}</button></SwipeLogRow>;
    })}</div>}
    </div>
    {spotlightItem&&(()=>{
      const appearance=renderCardAppearance(spotlightItem);
      const group=isLogGroup(spotlightItem);
      return <div className="logbook-spotlight-backdrop" role="dialog" aria-modal="true" aria-label={`${spotlightItem.title} 강조 보기`} onClick={()=>setSpotlightId(null)}>
        <div className="logbook-spotlight-stage" onClick={e=>e.stopPropagation()}>
          <div className="logbook-spotlight-header">
            <span className="logbook-spotlight-badge"><Sparkles size={12}/>선택된 카드</span>
            <h2>{spotlightItem.title}</h2>
            <p>{group?`그룹 · ${getGroupMembers(spotlightItem,p.archives).length}개`:getArchiveCategory(spotlightItem.cat).label} · {spotlightItem.date}{spotlightItem.score?` · ★ ${spotlightItem.score}`:''}{spotlightItem.addressShort||spotlightItem.loc?` · ${spotlightItem.addressShort||spotlightItem.loc}`:''}</p>
          </div>
          <div className="logbook-spotlight-card" onClick={()=>{const target=spotlightItem;setSpotlightId(null);p.onOpen(target);}}>
            <CardStage item={spotlightItem} slot={appearance.slot} skin={appearance.skin} authorName={appearance.authorName} selectedItems={group?getGroupMembers(spotlightItem,p.archives):[spotlightItem]} curationTitle={spotlightItem.title}/>
          </div>
          <div className="logbook-spotlight-actions" role="group" aria-label="카드 빠른 작업">
            <button type="button" className="spotlight-btn edit" onClick={()=>{const target=spotlightItem;setSpotlightId(null);if(p.onEdit)p.onEdit(target);else p.onOpen(target);}}>
              <PencilLine size={16}/><span>수정</span>
            </button>
            <button type="button" className="spotlight-btn delete" onClick={()=>{const target=spotlightItem;setSpotlightId(null);void p.onDelete(target);}}>
              <Trash2 size={16}/><span>삭제</span>
            </button>
            <button type="button" className="spotlight-btn close" onClick={()=>setSpotlightId(null)}>
              <X size={16}/><span>닫기</span>
            </button>
          </div>
        </div>
      </div>;
    })()}
    <AccessibleDialog open={filterOpen} onClose={()=>setFilterOpen(false)} title="분류">
      <div className="logbook-filter-options">{categories.map(({id,label,Icon})=><button type="button" key={id} aria-pressed={category===id} className={category===id?'active':''} onClick={()=>{setCategory(id as typeof category);setFilterOpen(false);}}><Icon size={21}/><span>{label}</span><small>{id==='ALL'?p.archives.length:p.archives.filter(item=>item.cat===id).length}</small></button>)}</div>
      {(p.onToggleListDetails||p.onToggleAutoPlaceLink)&&<div className="logbook-filter-toggles">
        {p.onToggleListDetails&&<label className="test-settings-switch"><span>목록 뷰 상세 정보 표시<small>별점·카테고리·한 줄 평 프리뷰</small></span><input type="checkbox" checked={listDetailsOn} onChange={e=>p.onToggleListDetails?.(e.target.checked)}/></label>}
        {p.onToggleAutoPlaceLink&&<label className="test-settings-switch"><span>지도 미연결 원탭 연결 배너<small>제목 기반 좌표 자동 연결</small></span><input type="checkbox" checked={autoPlaceLinkOn} onChange={e=>p.onToggleAutoPlaceLink?.(e.target.checked)}/></label>}
      </div>}
    </AccessibleDialog>
    <AccessibleDialog open={naming} onClose={()=>{if(!busy)setNaming(false);}} title="모음 이름" initialFocusId="group-name"><form onSubmit={e=>{e.preventDefault();void create();}} className="group-name-form"><label htmlFor="group-name">로그 {selected.length}개를 모았어요</label><input id="group-name" value={name} onChange={e=>setName(e.target.value)} maxLength={80} disabled={busy} placeholder="예: 연남동 맛집 리스트 3" required/>{error&&<p role="alert">{error}</p>}<button type="submit" className="test-button primary" disabled={busy||!name.trim()}>{busy?'저장 중…':'그룹 저장'}</button></form></AccessibleDialog>
  </section>;
}
