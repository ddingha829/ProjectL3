'use client';
import { useRef, useState } from 'react';
import { Check, ChevronDown, Plus, ArrowDownToLine, Layers, Camera, Type, Copy } from 'lucide-react';
import type { ArchiveItem, PresetSlot, SkinTheme } from '@/types/l2';
import { INITIAL_SKINS } from '@/data/initialData';
import { getCardLayout } from '@/lib/cardLayouts';
import { getArchiveCategory } from '@/lib/archiveCategories';
import { reorderPresets } from '@/lib/presetDefaults';
import AccessibleDialog from './AccessibleDialog';
import PresetThumbnail from './PresetThumbnail';
import './PresetLibrary.css';

export type NewPreset = {name:string;kind:'photo'|'text'|'group';copy:boolean};
interface Props {
  presets: PresetSlot[]; activeId: string; defaultId?: string;
  skins: Record<string,SkinTheme>; authorName: string; item?:ArchiveItem;
  currentName?:string; dirty?:boolean; disabled?:boolean;
  onSelect:(slot:PresetSlot,direction:number)=>void;
  onAdd?:(options:NewPreset)=>Promise<void>;
  onReorder?:(ids:string[])=>void;
}

/** Selection is a thumbnail collection. Sorting is an explicit tap-to-insert mode. */
export default function PresetLibrary(p:Props){
  const [mode,setMode]=useState<'browse'|'sort'|'create'|null>(null);
  const [order,setOrder]=useState<string[]>([]),[picked,setPicked]=useState<string|null>(null);
  const [name,setName]=useState(''),[kind,setKind]=useState<NewPreset['kind']>('photo'),[copy,setCopy]=useState(true);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[announcement,setAnnouncement]=useState('');
  const createLock=useRef(false);
  const active=p.presets.find(slot=>slot.id===p.activeId),editable=Boolean(p.onAdd&&p.onReorder);
  const sorted=reorderPresets(p.presets,order);
  const skinFor=(slot:PresetSlot)=>p.skins[slot.skinId]||INITIAL_SKINS.paper;
  const defaults=(slot:PresetSlot)=>[...(slot.id===p.defaultId?['전체 기본']:[]),...(slot.defaultFor||[]).map(cat=>getArchiveCategory(cat).label+' 기본')].join(' · ');
  const close=()=>{if(!busy){setMode(null);setPicked(null);setError('');}};
  const newPreset=()=>{setName('나의 프리셋');setCopy(true);setKind(active?.layout==='curation'?'group':active&&getCardLayout(active.layout).isNoPhoto?'text':'photo');setError('');setMode('create');};
  const insertAt=(position:number)=>{
    if(!picked)return;
    const ids=sorted.map(slot=>slot.id),from=ids.indexOf(picked);
    if(from<0)return;
    ids.splice(from,1);ids.splice(position>from?position-1:position,0,picked);
    setOrder(ids);requestAnimationFrame(()=>document.querySelector<HTMLButtonElement>(`.preset-sort-item[data-preset-id="${picked}"]`)?.focus({preventScroll:true}));setAnnouncement(`${p.presets.find(slot=>slot.id===picked)?.name}, ${ids.indexOf(picked)+1}번째로 이동했어요.`);setPicked(null);
  };
  const finishSort=()=>{try{p.onReorder?.(sorted.map(slot=>slot.id));setMode('browse');setPicked(null);setAnnouncement('프리셋 순서를 저장했어요.');}catch{setError('순서를 보관하지 못했어요. 다시 시도해 주세요.');}};
  const create=async()=>{
    if(!p.onAdd||!name.trim()||createLock.current||p.presets.length>=20)return;
    createLock.current=true;setBusy(true);setError('');
    try{await p.onAdd({name:name.trim(),kind,copy});setMode(null);}
    catch(e){setError(e instanceof Error?e.message:'프리셋을 만들지 못했어요.');}
    finally{createLock.current=false;setBusy(false);}
  };
  const title=mode==='create'?'새 프리셋 만들기':mode==='sort'?'프리셋 순서 정리':editable?'내 프리셋':'카드 프리셋 선택';
  return <div className="preset-library preset-collection-selector" data-guide={editable?'studio-library':'card-library'}>
    <button type="button" disabled={p.disabled} className="preset-library-open" aria-haspopup="dialog" aria-label={editable?'프리셋 보관함 열기':'카드 프리셋 선택'} onClick={()=>{setError('');setMode('browse');}}>
      <span className="preset-selector-swatch" aria-hidden="true" style={{background:active?skinFor(active).bg:'var(--surface-2)'}}>{active?<i style={{background:skinFor(active).accent}}/>:<Layers size={18}/>}</span>
      <span className="preset-selector-copy"><small>{editable?'편집할 프리셋':'이 로그의 디자인'}</small><strong>{p.currentName||active?.name||'개별 디자인'}</strong></span>
      {p.dirty&&<em className="record-pending-badge">미저장</em>}{active&&defaults(active)&&<small className="preset-selector-default">기본</small>}<ChevronDown size={17}/>
    </button>
    <span className="sr-only" role="status">{announcement}</span>
    <AccessibleDialog open={mode!==null} onClose={close} title={title}>
      <div className="preset-collection">
        {mode==='browse'&&<><div className="preset-collection-toolbar"><span>{p.presets.length}{editable?' / 20':'개'}</span>{editable&&<><button type="button" className="preset-organize" onClick={()=>{setOrder(p.presets.map(slot=>slot.id));setPicked(null);setMode('sort');}}>정리</button><button type="button" className="preset-create-open" disabled={p.presets.length>=20} onClick={newPreset}><Plus size={16}/>새 프리셋</button></>}</div>
          <div className="preset-collection-grid">{p.presets.map((preset,index)=><button type="button" key={preset.id} className="preset-collection-card" data-preset-id={preset.id} aria-pressed={preset.id===p.activeId} onClick={()=>{p.onSelect(preset,index<p.presets.findIndex(slot=>slot.id===p.activeId)?-1:1);setMode(null);}}><PresetThumbnail preset={preset} skin={skinFor(preset)} authorName={p.authorName} item={p.item}/><span className="preset-collection-caption"><strong>{preset.name}</strong>{preset.id===p.activeId&&<Check size={16}/>}<small>{defaults(preset)|| (preset.layout==='curation'?'그룹용':getCardLayout(preset.layout).isNoPhoto?'텍스트용':'사진용')}</small></span></button>)}</div></>}
        {mode==='sort'&&<><p className="preset-sort-hint" id="preset-sort-help">옮길 프리셋을 고른 뒤, 넣을 위치를 눌러주세요.</p><div className={`preset-sort-list ${picked?'has-pick':''}`} aria-describedby="preset-sort-help">{sorted.map((preset,index)=><div key={preset.id}><button type="button" className="preset-insert-target" disabled={!picked} aria-label={`${index+1}번째 위치에 넣기`} onClick={()=>insertAt(index)}><ArrowDownToLine size={13}/>여기로 이동</button><button type="button" className="preset-sort-item" data-preset-id={preset.id} aria-pressed={picked===preset.id} onClick={()=>setPicked(picked===preset.id?null:preset.id)}><small>{String(index+1).padStart(2,'0')}</small><strong>{preset.name}</strong><span>{picked===preset.id?'위치 선택 중':'이동'}</span></button></div>)}<button type="button" className="preset-insert-target" disabled={!picked} aria-label="마지막 위치에 넣기" onClick={()=>insertAt(sorted.length)}><ArrowDownToLine size={13}/>맨 뒤로 이동</button></div><div className="preset-collection-footer"><button type="button" onClick={()=>{setMode('browse');setPicked(null);}}>취소</button><button type="button" className="primary" onClick={finishSort}>순서 저장</button></div></>}
        {mode==='create'&&<form className="preset-create-form" onSubmit={event=>{event.preventDefault();void create();}}><label htmlFor="new-preset-name">프리셋 이름</label><input id="new-preset-name" maxLength={24} value={name} disabled={busy} onChange={event=>setName(event.target.value)} required/><fieldset disabled={busy}><legend>카드 종류</legend><div className="preset-create-kinds">{([{id:'photo',label:'사진용',Icon:Camera},{id:'text',label:'텍스트용',Icon:Type},{id:'group',label:'그룹용',Icon:Layers}] as const).map(entry=><button type="button" key={entry.id} aria-pressed={kind===entry.id} onClick={()=>setKind(entry.id)}><entry.Icon size={17}/>{entry.label}</button>)}</div></fieldset><fieldset disabled={busy}><legend>시작할 디자인</legend><label className="preset-copy-choice"><input type="radio" name="preset-source" checked={copy} onChange={()=>setCopy(true)}/><Copy size={18}/><span><strong>현재 디자인 복제</strong><small>{active?.name||'선택한 프리셋'}에서 시작해요</small></span></label><label className="preset-copy-choice"><input type="radio" name="preset-source" checked={!copy} onChange={()=>setCopy(false)}/><Plus size={18}/><span><strong>새 디자인으로 시작</strong><small>종류에 맞는 기본 양식으로 만들어요</small></span></label></fieldset><button type="submit" className="test-button primary" disabled={busy||!name.trim()||p.presets.length>=20}>{busy?'만드는 중…':'만들고 편집하기 →'}</button></form>}
        {error&&<p role="alert" className="preset-collection-error">{error}</p>}
      </div>
    </AccessibleDialog>
  </div>;
}
