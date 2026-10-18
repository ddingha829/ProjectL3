'use client';
import { useMemo, useState } from 'react';
import { Camera, Type, Check, LoaderCircle, Trash2 } from 'lucide-react';
import type { PresetSlot, SkinTheme } from '@/types/l2';
import { INITIAL_SKINS, PRESET_SLOTS } from '@/data/initialData';
import { STUDIO_PHOTO_SAMPLE, STUDIO_TEXT_SAMPLE } from '@/data/studioSamples';
import { fallbackSkinId, visibleSkins } from '@/lib/skinLibrary';
import { PRESET_DEFAULT_SCOPES, type PresetDefaultScope } from '@/lib/presetDefaults';
import PresetLibrary, { type NewPreset } from './PresetLibrary';
import { getCardLayout, resolveEffectiveSlot } from '@/lib/cardLayouts';
import CardStage from './CardStage';
import CardStyleControls from './CardStyleControls';
import FitCard from './FitCard';
import AccessibleDialog from './AccessibleDialog';
import './StudioPanel.css';
interface Props {
 presets:PresetSlot[];skins:Record<string,SkinTheme>;defaultPresetId:string;authorName:string;
 onSavePreset:(slot:PresetSlot,scope?:PresetDefaultScope,order?:string[])=>Promise<void>;
 onReorderPresets:(ids:string[])=>void;onClearCategoryDefault:(category:Exclude<PresetDefaultScope,'ALL'>)=>void;
 onDeletePreset?:(id:string)=>void;onGenerate:(prompt:string)=>Promise<SkinTheme>;onDeleteSkin?:(id:string)=>void;
}
export default function StudioPanel(p:Props){
 const [activeId,setActiveId]=useState(p.defaultPresetId),[drafts,setDrafts]=useState<Record<string,PresetSlot>>({});
 const initial=p.presets.find(slot=>slot.id===activeId)||p.presets[0],draft=drafts[activeId]||initial;
 const [photo,setPhoto]=useState(!getCardLayout(initial.layout).isNoPhoto),[direction,setDirection]=useState(1);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[defaultOpen,setDefaultOpen]=useState(false);
 const [extraSkins,setExtraSkins]=useState<Record<string,SkinTheme>>({});
 const allSkins={...p.skins,...extraSkins},palettes=visibleSkins(allSkins),skin=palettes[draft.skinId]||palettes.paper||Object.values(palettes)[0]||INITIAL_SKINS.paper;
 const groupMode=draft.layout==='curation';
 const item=useMemo(()=>({... (photo?STUDIO_PHOTO_SAMPLE:STUDIO_TEXT_SAMPLE),...(groupMode?{cat:'GROUP' as const,kind:'group' as const,title:'내가 좋아하는 오후',quote:'다시 찾고 싶은 순간 세 곳'}:{}),author:p.authorName||'나의 기록'}),[photo,p.authorName,groupMode]);
 const slot=resolveEffectiveSlot(item,draft);
 const visual=(value:PresetSlot)=>JSON.stringify(Object.fromEntries(Object.entries(value).filter(([key])=>key!=='defaultFor')));
 const saved=p.presets.find(preset=>preset.id===draft.id),dirty=!saved||visual(saved)!==visual(draft);
 const library=p.presets.map(preset=>({...preset,...drafts[preset.id],defaultFor:preset.defaultFor}));
 const change=(patch:Partial<PresetSlot>,step=1)=>{setDirection(step);setDrafts(previous=>({...previous,[draft.id]:{...draft,...patch}}));setError('');};
 const selectPhotoMode=(next:boolean)=>{if(groupMode)return;setPhoto(next);if(getCardLayout(draft.layout).isNoPhoto===next)change({layout:next?'spec':'broadside'});};
 const add=async(options:NewPreset)=>{
  if(p.presets.length>=20)throw new Error('프리셋은 20개까지 만들 수 있어요.');
  const source=options.copy?draft:PRESET_SLOTS[0],sourceLayout=getCardLayout(source.layout);
  const layout=options.kind==='group'?'curation':options.kind==='text'?(sourceLayout.isNoPhoto?source.layout:'broadside'):!sourceLayout.isNoPhoto&&source.layout!=='curation'?source.layout:'spec';
  const created:PresetSlot={...source,id:`preset-${crypto.randomUUID()}`,name:options.name,layout,skinId:options.copy?source.skinId:fallbackSkinId(p.skins),defaultFor:undefined};
  await p.onSavePreset(created);
  setDrafts(previous=>({...previous,[created.id]:created}));setActiveId(created.id);setPhoto(options.kind!=='text');setDirection(1);setError('');
 };
 const removePreset=()=>{if(p.presets.length<=1||p.defaultPresetId===draft.id)return;try{p.onDeletePreset?.(draft.id);setDrafts(previous=>{const next={...previous};delete next[draft.id];return next;});setActiveId(p.defaultPresetId);setPhoto(!getCardLayout((p.presets.find(slot=>slot.id===p.defaultPresetId)||p.presets[0]).layout).isNoPhoto);}catch(e){setError(e instanceof Error?e.message:'프리셋을 삭제하지 못했어요.');}};
 const removeSkin=(id:string)=>{if(Object.keys(palettes).length<=1||!p.onDeleteSkin)return;const fallback=fallbackSkinId({...p.skins,...extraSkins,[id]:{...palettes[id],hidden:true}});try{p.onDeleteSkin(id);setExtraSkins(previous=>({...previous,[id]:{...palettes[id],hidden:true}}));setDrafts(previous=>Object.fromEntries(Object.entries(previous).map(([key,slot])=>[key,slot.skinId===id?{...slot,skinId:fallback}:slot])));setError('');}catch(e){setError(e instanceof Error?e.message:'색상을 삭제하지 못했어요.');}};
 const save=async(scope?:PresetDefaultScope)=>{if(busy||!draft.name.trim()||scope&&groupMode)return;setBusy(true);setError('');const committed={...draft,name:draft.name.trim()};try{await p.onSavePreset(committed,scope);if(scope)setDefaultOpen(false);setDrafts(previous=>({...previous,[committed.id]:committed}));}catch(e){setError(e instanceof Error?e.message:'프리셋을 저장하지 못했어요.');}finally{setBusy(false);}};
 return <section className="preset-studio" aria-label="프리셋 스튜디오">
  <div className="preset-preview"><FitCard ratio={slot.ratio} transition="slide" direction={direction} animationKey={`${draft.id}-${slot.layout}-${slot.skinId}-${slot.ratio}`}><CardStage item={item} slot={slot} skin={skin} authorName={p.authorName} selectedItems={groupMode?[STUDIO_PHOTO_SAMPLE,{...STUDIO_TEXT_SAMPLE,id:'studio-text'}]:[]} curationTitle={item.title}/></FitCard></div>
  <PresetLibrary presets={library} activeId={draft.id} defaultId={p.defaultPresetId} skins={palettes} authorName={p.authorName} dirty={dirty} disabled={busy} onAdd={add} onReorder={p.onReorderPresets} onSelect={(preset,direction)=>{setDirection(direction);setActiveId(preset.id);setPhoto(!getCardLayout(preset.layout).isNoPhoto);setError('');}}/>
  <div className="preset-editor-row"><div className="preset-name-row" data-guide="studio-name"><div className="preset-name-field"><label htmlFor="preset-name">프리셋 이름</label><input id="preset-name" disabled={busy} value={draft.name} maxLength={24} onChange={e=>change({name:e.target.value})}/></div>{dirty&&<span className="preset-draft-dot" aria-label="저장 전 변경사항"/>}{p.presets.length>1&&p.defaultPresetId!==draft.id&&<button type="button" className="preset-delete-btn" aria-label="프리셋 삭제" disabled={busy} onClick={removePreset}><Trash2 size={14}/></button>}<div className="preset-photo-mode">{groupMode?<span className="preset-group-only">그룹 전용 · LIST</span>:<><button type="button" aria-label="사진 예시" disabled={busy} aria-pressed={photo} onClick={()=>selectPhotoMode(true)}><Camera size={14}/><span>사진용</span></button><button type="button" aria-label="글 예시" disabled={busy} aria-pressed={!photo} onClick={()=>selectPhotoMode(false)}><Type size={14}/><span>텍스트용</span></button></>}</div></div>
   <CardStyleControls slot={slot} skin={skin} item={item} photoMode={photo} skins={allSkins} disabled={busy} onChange={change} onGenerate={p.onGenerate} onGenerated={generated=>{setExtraSkins(previous=>({...previous,[generated.id]:generated}));change({skinId:generated.id});}} onDeleteSkin={removeSkin}/>
  </div>
  {error&&<p role="alert" className="preset-error">{error}</p>}
  <div className="preset-footer"><button type="button" className="preset-default" aria-pressed={p.defaultPresetId===draft.id} disabled={busy||groupMode||!draft.name.trim()} onClick={()=>setDefaultOpen(true)}>{p.defaultPresetId===draft.id&&<Check size={14}/>}기본 프리셋 지정</button><button type="button" className="preset-save" onClick={()=>void save()} disabled={busy||!draft.name.trim()||!dirty}>{busy?<LoaderCircle size={16} className="preset-spinner"/>:<Check size={16}/>}프리셋 저장</button></div>
    <AccessibleDialog open={defaultOpen} onClose={()=>{if(!busy)setDefaultOpen(false);}} title="기본 프리셋 지정"><div className="preset-default-scopes"><p>새 로그에 적용할 기본 디자인을 선택하세요.</p>{PRESET_DEFAULT_SCOPES.map(scope=>{const current=scope.id==='ALL'?p.presets.find(slot=>slot.id===p.defaultPresetId):p.presets.find(slot=>slot.defaultFor?.includes(scope.id));return <div key={scope.id}><button type="button" disabled={busy} aria-pressed={current?.id===draft.id} onClick={()=>void save(scope.id)}><strong>{scope.label}</strong><span>{current?.name||'전체 기본 사용'}</span>{current?.id===draft.id&&<Check size={17}/>}</button>{scope.id!=='ALL'&&current&&<button type="button" className="preset-default-clear" disabled={busy} aria-label={scope.label+' 기본값 해제'} onClick={()=>p.onClearCategoryDefault(scope.id as Exclude<PresetDefaultScope,'ALL'>)}>전체 기본 사용</button>}</div>})}{error&&<p role="alert">{error}</p>}</div></AccessibleDialog>
 </section>;
}
