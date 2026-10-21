'use client';
import {useState,type ReactNode} from 'react';
import type {ArchiveItem,PresetSlot,SkinTheme,CardAppearance} from '@/types/l2';
import {getCardLayout} from '@/lib/cardLayouts';
import {photoTone} from '@/lib/photoTone';
import AccessibleDialog from './AccessibleDialog';
import CardStage from './CardStage';
import FitCard from './FitCard';
import './CardDetailsDialog.css';
const elements=[{key:'showScore',label:'별점'},{key:'showProsCons',label:'요약'},{key:'showLocation',label:'장소'},{key:'showSignature',label:'서명'},{key:'showGrain',label:'질감'},{key:'showDecorations',label:'장식 문구'},{key:'showNumber',label:'로그 번호'}] as const;
export default function CardDetailsDialog({item,slot,skin,authorName,members=[],historyControls,comparison,disabled,onChange,onClose}:{item:ArchiveItem;slot:PresetSlot;skin:SkinTheme;authorName:string;members?:ArchiveItem[];historyControls?:ReactNode;comparison?:{item:ArchiveItem;appearance:CardAppearance};disabled?:boolean;onChange:(patch:Partial<PresetSlot>)=>void;onClose:()=>void}){
 const [section,setSection]=useState<'display'|'photo'>('display'),layout=getCardLayout(slot.layout),tone=photoTone(slot);
 return <AccessibleDialog open onClose={onClose} title="세부사항" panelClassName="card-details-dialog">
  <div className="card-details-body">
   <div className="card-details-preview" aria-label="세부사항 실시간 미리보기">{comparison&&<span className="design-comparison-label">저장 전 원본</span>}<FitCard ratio={comparison?.appearance.slot.ratio||slot.ratio}><CardStage item={comparison?.item||item} slot={comparison?.appearance.slot||slot} skin={comparison?.appearance.skin||skin} authorName={comparison?.appearance.authorName??authorName} selectedItems={members} curationTitle={item.title}/></FitCard></div>
   <div className="card-details-settings" tabIndex={0} aria-label="카드 세부사항 조절 영역">
    <fieldset disabled={disabled} className="card-details-fields"><legend className="sr-only">카드 표시와 사진 보정</legend>
     <div className="preset-ratios" role="group" aria-label="카드 비율">{(['3:4','1:1','9:16'] as const).map(ratio=><button type="button" key={ratio} disabled={!layout.supportedRatios.includes(ratio)} title={!layout.supportedRatios.includes(ratio)?'티켓은 세로 비율만 지원해요':undefined} aria-pressed={ratio===slot.ratio} onClick={()=>onChange({ratio})}>{ratio}</button>)}</div>
     <div className="card-details-tabs" role="group" aria-label="세부사항 종류"><button type="button" aria-pressed={section==='display'} aria-controls="card-display-panel" id="card-display-tab" onClick={()=>setSection('display')}>표시 항목</button>{!layout.isNoPhoto&&<button type="button" aria-pressed={section==='photo'} aria-controls="card-photo-panel" id="card-photo-tab" onClick={()=>setSection('photo')}>사진 보정</button>}</div>
     {section==='display'||layout.isNoPhoto?<div className="preset-toggles" role="region" id="card-display-panel" aria-labelledby="card-display-tab">{elements.filter(entry=>layout.supportedElements.includes(entry.key)).map(entry=><label key={entry.key}><input type="checkbox" name={entry.key} checked={slot[entry.key]!==false} onChange={event=>onChange({[entry.key]:event.target.checked})}/><span>{entry.label}</span></label>)}</div>:
     <div className="preset-photo-tones" role="region" id="card-photo-panel" aria-labelledby="card-photo-tab">{([{key:'photoSaturation',label:'채도',min:0,max:200},{key:'photoLightness',label:'명도',min:-50,max:50},{key:'photoBrightness',label:'밝기',min:50,max:150}] as const).map(control=><label key={control.key}><span>{control.label}<output>{tone[control.key]}{control.key==='photoLightness'?'':'%'}</output></span><input type="range" aria-label={`사진 ${control.label}`} min={control.min} max={control.max} step="1" value={tone[control.key]} onChange={event=>onChange({[control.key]:Number(event.target.value)})}/></label>)}<button type="button" onClick={()=>onChange({photoSaturation:100,photoLightness:0,photoBrightness:100})}>사진 보정 초기화</button></div>}
    </fieldset>
   </div>
  </div>
  <div className="card-details-footer">{historyControls}<button type="button" className="card-details-done" onClick={onClose}>완료</button></div>
 </AccessibleDialog>;
}
