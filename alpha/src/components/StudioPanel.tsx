'use client';
import { useMemo, useRef, useState } from 'react';
import { Camera, Type, ChevronLeft, ChevronRight, ChevronDown, Check, Sparkles, LoaderCircle, Trash2 } from 'lucide-react';
import type { PresetSlot, SkinTheme } from '@/types/l2';
import { INITIAL_SKINS } from '@/data/initialData';
import { STUDIO_PHOTO_SAMPLE, STUDIO_TEXT_SAMPLE } from '@/data/studioSamples';
import { fallbackSkinId, visibleSkins } from '@/lib/skinLibrary';
import { PRESET_DEFAULT_SCOPES, type PresetDefaultScope } from '@/lib/presetDefaults';
import PresetLibrary from './PresetLibrary';
import { CARD_LAYOUTS, getCardLayout, resolveEffectiveSlot } from '@/lib/cardLayouts';
import CardStage from './CardStage';
import FitCard from './FitCard';
import AccessibleDialog from './AccessibleDialog';
import './StudioPanel.css';

interface Props {
  presets: PresetSlot[];
  skins: Record<string, SkinTheme>;
  defaultPresetId: string;
  authorName: string;
  onSavePreset: (slot: PresetSlot, scope?: PresetDefaultScope, order?: string[]) => Promise<void>;
  onReorderPresets: (ids: string[]) => void;
  onClearCategoryDefault: (category: Exclude<PresetDefaultScope, 'ALL'>) => void;
  onDeletePreset?: (id: string) => void;
  onGenerate: (prompt: string) => Promise<SkinTheme>;
  onDeleteSkin?: (id: string) => void;
}
const elements=[{key:'showScore',label:'별점'},{key:'showProsCons',label:'요약'},{key:'showLocation',label:'장소'},{key:'showSignature',label:'서명'},{key:'showGrain',label:'질감'},{key:'showDecorations',label:'장식 문구'},{key:'showNumber',label:'로그 번호'}] as const;

export default function StudioPanel(p:Props){
  const [activeId,setActiveId]=useState(p.defaultPresetId);const [drafts,setDrafts]=useState<Record<string,PresetSlot>>({});
  const initial=p.presets.find(slot=>slot.id===activeId)||p.presets[0];
  const draft=drafts[activeId]||initial;
  const [photo,setPhoto]=useState(!getCardLayout(initial.layout).isNoPhoto);
  const [tab,setTab]=useState<'layout'|'color'|'details'>('layout');const [picker,setPicker]=useState<'layout'|'color'|'generate'|'default'|null>(null);
  const [prompt,setPrompt]=useState('');const [extraSkins,setExtraSkins]=useState<Record<string,SkinTheme>>({});
  const [direction,setDirection]=useState(1);const libraryOrder=useRef<string[]|undefined>(undefined);
  const [busy,setBusy]=useState(false);const [generating,setGenerating]=useState(false);const [error,setError]=useState('');
  const palettes=visibleSkins({...p.skins,...extraSkins});const skin=palettes[draft.skinId]||palettes.paper||Object.values(palettes)[0]||INITIAL_SKINS.paper;
  const groupMode=draft.layout==='curation';
  const item=useMemo(()=>({... (photo?STUDIO_PHOTO_SAMPLE:STUDIO_TEXT_SAMPLE),...(groupMode?{cat:'GROUP' as const,kind:'group' as const,title:'내가 좋아하는 오후',quote:'다시 찾고 싶은 순간 세 곳'}:{}),author:p.authorName||'나의 기록'}),[photo,p.authorName,groupMode]);
  const slot=resolveEffectiveSlot(item,draft),layout=getCardLayout(slot.layout);
  const options=CARD_LAYOUTS.filter(option=>groupMode?option.id==='curation':option.id!=='curation'&&option.isNoPhoto!==photo);
  const saved=p.presets.find(preset=>preset.id===draft.id);
  const visual=(value:PresetSlot)=>JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key])=>key!=='defaultFor')));
  const dirty=!saved||visual(saved)!==visual(draft);
  const rail=[...p.presets,...Object.values(drafts).filter(entry=>!p.presets.some(saved=>saved.id===entry.id))];
  const change=(patch:Partial<PresetSlot>)=>{setDrafts(previous=>({...previous,[draft.id]:{...draft,...patch}}));setError('');};
  const selectPhotoMode=(next:boolean)=>{if(groupMode)return;setPhoto(next);if(getCardLayout(draft.layout).isNoPhoto===next)change({layout:next?'spec':'broadside'});};
  const nextLayout=(step:number)=>{setDirection(step);const index=options.findIndex(option=>option.id===slot.layout);const option=options[(index+step+options.length)%options.length];change({layout:option.id});};
  const nextColor=(step:number)=>{setDirection(step);const all=Object.values(palettes),index=all.findIndex(option=>option.id===skin.id);change({skinId:all[(index+step+all.length)%all.length].id});};
  const add=()=>{if(rail.length>=20)return;const id=`preset-${crypto.randomUUID()}`;setDirection(1);setDrafts(previous=>({...previous,[id]:{...draft,id,name:`프리셋 ${rail.length+1}`,defaultFor:undefined}}));setActiveId(id);setTab('layout');setError('');};
  const removePreset=()=>{
    const targetId=draft.id;
    if(rail.length<=1||targetId===p.defaultPresetId)return;
    setDrafts(previous=>{const next={...previous};delete next[targetId];return next;});
    if(saved)p.onDeletePreset?.(targetId);
    setActiveId(p.defaultPresetId);
  };
  const removeSkin=(id:string)=>{
    if(Object.keys(palettes).length<=1||!p.onDeleteSkin)return;
    const fallback=fallbackSkinId({...p.skins,...extraSkins,[id]:{...palettes[id],hidden:true}});
    try{
      p.onDeleteSkin(id);
      setExtraSkins(previous=>({...previous,[id]:{...palettes[id],hidden:true}}));
      setDrafts(previous=>Object.fromEntries(Object.entries(previous).map(([key,slot])=>[key,slot.skinId===id?{...slot,skinId:fallback}:slot])));
      setError('');
    }catch(e){setError(e instanceof Error?e.message:'색상을 삭제하지 못했어요.');}
  };
  const save=async(scope?:PresetDefaultScope)=>{if(busy||!draft.name.trim())return;setBusy(true);setError('');const committed={...draft,name:draft.name.trim()};if(scope&&groupMode){setBusy(false);setError('LIST는 그룹 전용 프리셋이에요. 일반 로그용 프리셋을 기본으로 지정해 주세요.');return;}try{await p.onSavePreset(committed,scope,scope?undefined:libraryOrder.current);if(scope){libraryOrder.current=undefined;setPicker(null);}setDrafts(previous=>({...previous,[committed.id]:committed}));}catch(e){setError(e instanceof Error?e.message:'프리셋을 저장하지 못했어요.');}finally{setBusy(false);}};
  const generate=async()=>{if(generating||!prompt.trim())return;setGenerating(true);setError('');try{const generated=await p.onGenerate(prompt.trim());setExtraSkins(previous=>({...previous,[generated.id]:generated}));change({skinId:generated.id});setPicker(null);}catch(e){setError(e instanceof Error?e.message:'팔레트를 만들지 못했어요.');}finally{setGenerating(false);}};
  return <section className="preset-studio" aria-label="프리셋 스튜디오">
    <div className="preset-preview"><FitCard ratio={slot.ratio} transition="slide" direction={direction} animationKey={`${draft.id}-${slot.layout}-${slot.skinId}-${slot.ratio}`}><CardStage item={item} slot={slot} skin={skin} authorName={p.authorName} selectedItems={groupMode?[STUDIO_PHOTO_SAMPLE,{...STUDIO_TEXT_SAMPLE,id:"studio-text"}]:[]} curationTitle={item.title}/></FitCard></div>
    <PresetLibrary presets={rail.map(preset=>({...preset,name:drafts[preset.id]?.name||preset.name}))} activeId={draft.id} defaultId={p.defaultPresetId} onAdd={add} onReorder={ids=>{p.onReorderPresets(ids);libraryOrder.current=ids;}} onSelect={(preset,direction)=>{setDirection(direction);setActiveId(preset.id);setPhoto(!getCardLayout((drafts[preset.id]||preset).layout).isNoPhoto);setError('');}}/>
    <div className="preset-name-row" data-guide="studio-name"><div className="preset-name-field"><label htmlFor="preset-name">프리셋 이름</label><input id="preset-name" value={draft.name} maxLength={24} onChange={e=>change({name:e.target.value})}/></div>{dirty&&<span className="preset-draft-dot" title="저장 전 변경사항" aria-label="저장 전 변경사항"/>}{rail.length>1&&p.defaultPresetId!==draft.id&&<button type="button" className="preset-delete-btn" aria-label="프리셋 삭제" title="프리셋 삭제" onClick={removePreset}><Trash2 size={14}/></button>}<div className="preset-photo-mode">{groupMode?<span className="preset-group-only">그룹 전용 · LIST</span>:<><button type="button" aria-label="사진 예시" aria-pressed={photo} onClick={()=>selectPhotoMode(true)}><Camera size={14}/><span>사진용</span></button><button type="button" aria-label="글 예시" aria-pressed={!photo} onClick={()=>selectPhotoMode(false)}><Type size={14}/><span>텍스트용</span></button></>}</div></div>

    <div className="preset-controls"><div className="preset-tabs" role="tablist" aria-label="프리셋 편집">{([{id:'layout',label:'디자인'},{id:'color',label:'색상'},{id:'details',label:'세부사항'}] as const).map(entry=><button type="button" key={entry.id} role="tab" aria-selected={tab===entry.id} onClick={()=>setTab(entry.id)}>{entry.label}</button>)}</div>
      <div className="preset-control-panel" role="tabpanel" aria-label={tab==='layout'?'카드 디자인':tab==='color'?'카드 색상':'세부사항'}>
        {tab==='layout'&&<div className="preset-stepper"><button type="button" aria-label="이전 디자인" onClick={()=>nextLayout(-1)}><ChevronLeft/></button><button type="button" className="preset-current" aria-haspopup="dialog" onClick={()=>setPicker('layout')}><strong>{layout.name}</strong><small>{layout.sub}</small><ChevronDown size={15}/></button><button type="button" aria-label="다음 디자인" onClick={()=>nextLayout(1)}><ChevronRight/></button></div>}
        {tab==='color'&&<><div className="preset-stepper"><button type="button" aria-label="이전 팔레트" onClick={()=>nextColor(-1)}><ChevronLeft/></button><button type="button" className="preset-current" aria-haspopup="dialog" onClick={()=>setPicker('color')}><span className="preset-color-dots">{[skin.bg,skin.text,skin.accent].map((color,index)=><i key={index} style={{background:color}}/>)}</span><strong>{skin.name}</strong><ChevronDown size={15}/></button><button type="button" aria-label="다음 팔레트" onClick={()=>nextColor(1)}><ChevronRight/></button><button type="button" className="preset-delete-color" aria-label={`${skin.name} 팔레트 삭제`} disabled={Object.keys(palettes).length<=1} onClick={()=>removeSkin(skin.id)}><Trash2 size={14}/><span>삭제</span></button></div><button type="button" className="preset-generate-link" onClick={()=>setPicker('generate')}><Sparkles size={13}/>분위기로 팔레트 만들기</button></>}
        {tab==='details'&&<div className="preset-details"><div className="preset-ratios" role="group" aria-label="카드 비율">{layout.supportedRatios.map(ratio=><button type="button" key={ratio} aria-pressed={slot.ratio===ratio} onClick={()=>change({ratio})}>{ratio}</button>)}</div><div className="preset-toggles">{elements.filter(entry=>layout.supportedElements.includes(entry.key)).map(entry=><label key={entry.key}><input type="checkbox" name={entry.key} checked={draft[entry.key]!==false} onChange={e=>change({[entry.key]:e.target.checked})}/><span>{entry.label}</span></label>)}</div></div>}
      </div>
    </div>
    {error&&<p role="alert" className="preset-error">{error}</p>}
    <div className="preset-footer"><button type="button" className="preset-default" aria-pressed={p.defaultPresetId===draft.id} disabled={busy||groupMode||!draft.name.trim()} onClick={()=>setPicker('default')}>{p.defaultPresetId===draft.id&&<Check size={14}/>}기본 프리셋 지정</button><button type="button" className="preset-save" onClick={()=>void save()} disabled={busy||!draft.name.trim()||!dirty}>{busy?<LoaderCircle size={16} className="preset-spinner"/>:<Check size={16}/>}프리셋 저장</button></div>
    <AccessibleDialog open={picker==='default'} onClose={()=>{if(!busy)setPicker(null);}} title="기본 프리셋 지정"><div className="preset-default-scopes"><p>새 로그에 적용할 기본 디자인을 선택하세요.</p>{PRESET_DEFAULT_SCOPES.map(scope=>{const current=scope.id==='ALL'?p.presets.find(slot=>slot.id===p.defaultPresetId):p.presets.find(slot=>slot.defaultFor?.includes(scope.id));return <div key={scope.id}><button type="button" disabled={busy} aria-pressed={current?.id===draft.id} onClick={()=>void save(scope.id)}><strong>{scope.label}</strong><span>{current?.name||'전체 기본 사용'}</span>{current?.id===draft.id&&<Check size={17}/>}</button>{scope.id!=='ALL'&&current&&<button type="button" className="preset-default-clear" disabled={busy} aria-label={scope.label+' 기본값 해제'} onClick={()=>p.onClearCategoryDefault(scope.id as Exclude<PresetDefaultScope,'ALL'>)}>전체 기본 사용</button>}</div>})}{error&&<p role="alert">{error}</p>}</div></AccessibleDialog>
    <AccessibleDialog open={picker==='layout'} onClose={()=>setPicker(null)} title="카드 디자인"><div className="preset-layout-picker">{options.map(option=><button type="button" key={option.id} aria-pressed={slot.layout===option.id} onClick={()=>{change({layout:option.id});setPicker(null);}}><strong>{option.name}</strong><span>{option.sub}</span></button>)}</div></AccessibleDialog>
    <AccessibleDialog open={picker==='color'} onClose={()=>setPicker(null)} title="팔레트"><div className="preset-palette-picker">{Object.values(palettes).map(option=><div key={option.id} className="preset-palette-item"><button type="button" aria-pressed={skin.id===option.id} onClick={()=>{change({skinId:option.id});setPicker(null);}}><span>{[option.bg,option.text,option.accent].map((color,index)=><i key={index} style={{background:color}}/>)}</span><strong>{option.name}</strong></button><button type="button" className="preset-palette-del" aria-label={`${option.name} 팔레트 삭제`} disabled={Object.keys(palettes).length<=1} onClick={e=>{e.stopPropagation();removeSkin(option.id);}}><Trash2 size={13}/></button></div>)}</div></AccessibleDialog>
    <AccessibleDialog open={picker==='generate'} onClose={()=>{if(!generating)setPicker(null);}} title="어떤 분위기로 남길까요?"><form className="preset-generate-form" onSubmit={e=>{e.preventDefault();void generate();}}><input value={prompt} onChange={e=>setPrompt(e.target.value)} maxLength={120} placeholder="예: 이른 아침의 미술관" disabled={generating}/><button type="submit" className="test-button primary" disabled={generating||!prompt.trim()}>{generating?'팔레트 만드는 중…':'팔레트 만들기'}</button>{error&&<p role="alert">{error}</p>}</form></AccessibleDialog>
  </section>;
}
