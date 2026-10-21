'use client';
import { useState, type ReactNode } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, LoaderCircle, Sparkles, Trash2 } from 'lucide-react';
import type { ArchiveItem, PresetSlot, SkinTheme, CardAppearance } from '@/types/l2';
import { CARD_LAYOUTS, getCardLayout, itemHasPhoto } from '@/lib/cardLayouts';
import { visibleSkins } from '@/lib/skinLibrary';
import PresetThumbnail from './PresetThumbnail';
import CardDetailsDialog from './CardDetailsDialog';
import AccessibleDialog from './AccessibleDialog';
import './StudioPanel.css';

interface Props {
  slot: PresetSlot;
  skin: SkinTheme;
  item: ArchiveItem;
  authorName?: string;
  members?: ArchiveItem[];
  historyControls?:ReactNode;
  comparison?:{item:ArchiveItem;appearance:CardAppearance};
  skins: Record<string, SkinTheme>;
  disabled?: boolean;
  photoMode?: boolean;
  onChange: (patch: Partial<PresetSlot>, direction?: number) => void;
  onGenerate?: (prompt: string) => Promise<SkinTheme>;
  onGenerated?: (skin: SkinTheme) => void;
  onDeleteSkin?: (id: string) => void;
}
/** Shared tools edit their caller's draft; they never save a preset or a log. */
export default function CardStyleControls(p: Props) {
  const [tab,setTab]=useState<'layout'|'color'>('layout');
  const [picker,setPicker]=useState<'layout'|'color'|'details'|'generate'|null>(null);
  const [prompt,setPrompt]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const layout=getCardLayout(p.slot.layout);
  const options=CARD_LAYOUTS.filter(option=>p.item.cat==='GROUP'?option.id==='curation':option.id!=='curation'&&(p.photoMode===undefined?(itemHasPhoto(p.item)||option.isNoPhoto):option.isNoPhoto!==p.photoMode));
  // A historical card may use a palette that is no longer in the library.
  const palettes=visibleSkins(p.skins), colors=Object.values(palettes);
  const change=(patch:Partial<PresetSlot>,direction=1)=>{if(!p.disabled)p.onChange(patch,direction);};
  const step=(amount:number)=>{
    if(tab==='layout'){
      const at=options.findIndex(entry=>entry.id===p.slot.layout),next=options[((at<0?(amount>0?-1:0):at)+amount+options.length)%options.length];
      if(next)change({layout:next.id},amount);
    } else {
      const at=colors.findIndex(entry=>entry.id===p.skin.id),next=colors[((at<0?(amount>0?-1:0):at)+amount+colors.length)%colors.length];
      if(next)change({skinId:next.id},amount);
    }
  };
  const generate=async()=>{
    if(!p.onGenerate||!prompt.trim()||busy)return;
    setBusy(true);setError('');
    try{const skin=await p.onGenerate(prompt.trim());p.onGenerated?.(skin);setPicker(null);}
    catch(e){setError(e instanceof Error?e.message:'팔레트를 만들지 못했어요.');}
    finally{setBusy(false);}
  };
  return <div className="preset-controls">
    <div className="preset-tabs" role="group" aria-label="디자인 편집">
      <button type="button" disabled={p.disabled} aria-pressed={tab==='layout'} onClick={()=>setTab('layout')}>디자인</button>
      <button type="button" disabled={p.disabled} aria-pressed={tab==='color'} onClick={()=>setTab('color')}>색상</button>
      <button type="button" disabled={p.disabled} aria-haspopup="dialog" onClick={()=>setPicker('details')}>세부사항</button>
    </div>
    <div className="preset-control-panel" role="region" aria-label={tab==='layout'?'카드 디자인':'카드 색상'}>
      <div className="preset-stepper">
        <button type="button" disabled={p.disabled||(tab==='layout'?options.length:colors.length)<2} aria-label={tab==='layout'?'이전 디자인':'이전 팔레트'} onClick={()=>step(-1)}><ChevronLeft size={19}/></button>
        <button type="button" disabled={p.disabled} className="preset-current" aria-haspopup="dialog" onClick={()=>setPicker(tab)}>
          {tab==='color'&&<span className="preset-color-dots">{[p.skin.bg,p.skin.text,p.skin.accent].map((color,i)=><i key={i} style={{background:color}}/>)}</span>}
          <strong>{tab==='layout'?layout.name:p.skin.name}</strong>{tab==='layout'&&<small>{layout.sub}</small>}<ChevronDown size={14}/>
        </button>
        <button type="button" disabled={p.disabled||(tab==='layout'?options.length:colors.length)<2} aria-label={tab==='layout'?'다음 디자인':'다음 팔레트'} onClick={()=>step(1)}><ChevronRight size={19}/></button>
      </div>
    </div>
    <AccessibleDialog open={picker==='layout'} onClose={()=>setPicker(null)} title="카드 디자인"><div className="preset-layout-picker visual-layout-picker">{options.map(option=><button type="button" key={option.id} aria-label={option.name} aria-pressed={layout.id===option.id} onClick={()=>{change({layout:option.id});setPicker(null);}}><PresetThumbnail lazy preset={{...p.slot,layout:option.id}} skin={p.skin} item={p.item} members={p.members} authorName={p.authorName??p.item.author??''}/><strong>{option.name}</strong><span>{option.sub}</span></button>)}</div></AccessibleDialog>
    <AccessibleDialog open={picker==='color'} onClose={()=>setPicker(null)} title="팔레트">
      {p.onGenerate&&<button type="button" className="preset-generate-link" onClick={()=>setPicker('generate')}><Sparkles size={16}/>분위기로 팔레트 만들기</button>}
      <div className="preset-palette-picker">{colors.map(skin=><div key={skin.id} className="preset-palette-item"><button type="button" aria-label={skin.name} aria-pressed={skin.id===p.skin.id} onClick={()=>{change({skinId:skin.id});setPicker(null);}}><span className="palette-sample" aria-hidden="true" style={{background:skin.bg,color:skin.text}}><i style={{background:skin.accent,color:skin.bg}}>L2.</i><b>{p.item.title.slice(0,14)||"나의 일상"}</b><small style={{color:skin.sub}}>오늘의 작은 순간</small></span><strong>{skin.name}</strong></button>{p.onDeleteSkin&&<button type="button" className="preset-palette-del" aria-label={`${skin.name} 팔레트 삭제`} disabled={colors.length<=1} onClick={()=>p.onDeleteSkin?.(skin.id)}><Trash2 size={13}/></button>}</div>)}</div>
    </AccessibleDialog>
    {picker==='details'&&<CardDetailsDialog item={p.item} slot={p.slot} skin={p.skin} authorName={p.authorName??p.item.author??''} members={p.members} historyControls={p.historyControls} comparison={p.comparison} disabled={p.disabled} onChange={patch=>change(patch)} onClose={()=>setPicker(null)}/>}
    <AccessibleDialog open={picker==='generate'} onClose={()=>{if(!busy)setPicker(null);}} title="어떤 분위기로 남길까요?"><form className="preset-generate-form" onSubmit={event=>{event.preventDefault();void generate();}}><input value={prompt} onChange={event=>setPrompt(event.target.value)} placeholder="예: 이른 아침의 미술관" maxLength={120} disabled={busy}/><button type="submit" className="test-button primary" disabled={busy||!prompt.trim()}>{busy?<><LoaderCircle size={16} className="preset-spinner"/>만드는 중…</>:'팔레트 만들기'}</button>{error&&<p role="alert">{error}</p>}</form></AccessibleDialog>
  </div>;
}
