'use client';
import {useState} from 'react';
import {ArrowLeft,Check,ChevronDown,Palette} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import {styleOf} from '@/social/EditorialCard';
import {FRONT_NAMES,BACK_NAMES,type EditorialStyle} from '@/social/editorialStyle';
import CardDesignWorkspace from './CardDesignWorkspace';
import type {Preset,UnifiedLog} from './store';
import './CardStyleEditor.css';

export default function CardStyleEditor({log,author,value,presets,onChange,onApply,onClose}:{log:UnifiedLog;author:string;value:EditorialStyle;presets:Preset[];onChange:(value:EditorialStyle)=>void;onApply:()=>void;onClose:()=>void}){
 const [library,setLibrary]=useState(false),[discard,setDiscard]=useState(false),dirty=JSON.stringify(value)!==JSON.stringify(styleOf(log));
 const close=()=>{if(dirty)setDiscard(true);else onClose();};
 return <>
  <AccessibleDialog open title="카드 꾸미기" closeLabel="카드 꾸미기 닫기" closeIcon={<ArrowLeft size={21}/>} onClose={close} panelClassName="lab-dialog un-card-style-dialog">
   <section className="un-studio un-studio-workspace un-card-design-workspace" aria-label="카드 디자인 편집">
    <CardDesignWorkspace log={log} author={author} value={value} onChange={onChange} footer={<><button className="studio-settings" onClick={()=>setLibrary(true)}><Palette size={16}/>프리셋<ChevronDown size={12}/></button><button className="un-primary" disabled={!dirty} onClick={onApply}><Check size={16}/>{dirty?'꾸미기 확정':'적용됨'}</button></>}/>
   </section>
  </AccessibleDialog>
  <AccessibleDialog open={library} title="프리셋 적용" onClose={()=>setLibrary(false)} panelClassName="lab-dialog"><div className="un-preset-options">{presets.map(preset=><button key={preset.id} onClick={()=>{onChange({...preset.style});setLibrary(false);}}><span className="un-preset-swatch" style={{background:`linear-gradient(125deg,${preset.style.bg} 50%,${preset.style.accent} 50%)`}}/><span>{preset.name}<small>{FRONT_NAMES[preset.style.front]} · {BACK_NAMES[preset.style.back]}</small></span><ChevronDown size={15}/></button>)}</div></AccessibleDialog>
  <AccessibleDialog open={discard} title="변경한 디자인을 닫을까요?" onClose={()=>setDiscard(false)} panelClassName="lab-dialog"><p className="un-subtle">아직 카드에 적용하지 않은 변경사항이 있어요.</p><div className="un-edit-discard-actions"><button className="un-outline" onClick={()=>setDiscard(false)}>계속 꾸미기</button><button className="un-primary" onClick={onClose}>변경 취소</button></div></AccessibleDialog>
 </>;
}
