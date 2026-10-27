'use client';
import {useId,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {Image,Layers,Palette,RotateCw,SlidersHorizontal,Type} from 'lucide-react';
import EditorialCard from '@/social/EditorialCard';
import CardDesignEditor from '@/social/CardDesignEditor';
import type {LabLog} from '@/social/model';
import type {EditorialStyle} from '@/social/editorialStyle';
import './StudioWorkspace.css';

type Section='front'|'back'|'color'|'details';
/** The same live preview and controls for presets and individual cards. */
export default function CardDesignWorkspace({log,author,value,onChange,footer,onPhotoToggle}:{log:LabLog;author:string;value:EditorialStyle;onChange:(style:EditorialStyle)=>void;footer:ReactNode;onPhotoToggle?:()=>void}){
 const [section,setSection]=useState<Section>(log.image?'front':'back'),[side,setSide]=useState<'front'|'back'>(log.image?'front':'back');
 const options=useRef<HTMLDivElement>(null),id=useId(),photo=Boolean(log.image);
 const choose=(next:Section)=>{setSection(next);if(next==='front'||next==='back')setSide(next);};
 useLayoutEffect(()=>{
  if(section!=='back')return;
  const strip=options.current?.querySelector<HTMLElement>('.lab-back-choices'),active=strip?.querySelector<HTMLElement>('[aria-pressed=true]');
  if(strip&&active&&strip.scrollWidth>strip.clientWidth){const row=strip.getBoundingClientRect(),item=active.getBoundingClientRect();strip.scrollLeft+=item.left-row.left-(row.width-item.width)/2;}
 },[section,log.id,value.back]);
 return <>
  <div className="un-studio-preview studio-canvas">
   <div className="studio-card-stage" data-ratio={value.ratio}><EditorialCard key={`${log.id}:${photo}`} log={log} author={author} appearance={value} interactive={false} initialSide={side}/></div>
   <div className="studio-preview-bar">
    <button onClick={()=>setSide(side==='front'?'back':'front')} disabled={!photo} aria-label="미리보기 앞뒤 전환"><RotateCw size={14}/>{!photo||side==='back'?'뒷면':'앞면'}</button>
    <div className="studio-ratios" aria-label="카드 비율">{(['9:16','1:1'] as const).map(ratio=><button key={ratio} aria-pressed={value.ratio===ratio} onClick={()=>onChange({...value,ratio})}>{ratio}</button>)}</div>
    {onPhotoToggle?<button aria-label="사진 없는 카드 미리보기" aria-pressed={!photo} onClick={()=>{onPhotoToggle();if(photo&&section==='front')choose('back');}}>{photo?<Image size={16}/>:<Type size={16}/>}<span>{photo?'사진':'글'}</span></button>:<span className="studio-preview-kind">{photo?<Image size={14}/>:<Type size={14}/>}</span>}
   </div>
  </div>
  <div className="un-studio-tools studio-workbench" data-editor-section={section}>
   <div className="studio-tabs" aria-label="카드 편집 메뉴">{([['front','앞면',Image],['back','뒷면',Layers],['color','색상',Palette],['details','질감·글꼴',SlidersHorizontal]] as const).map(([key,label,Icon])=><button key={key} aria-pressed={section===key} aria-controls={id} onClick={()=>choose(key)}><Icon size={16}/>{label}</button>)}</div>
   <div ref={options} className="studio-options" id={id} key={section} role="region" aria-label={`${section==='front'?'앞면':section==='back'?'뒷면':section==='color'?'색상':'질감·글꼴'} 설정`} tabIndex={0}>
    <CardDesignEditor key={log.id} section={section} hideApply value={value} hasPhoto={photo} onChange={onChange} dirty onApply={()=>{}}/>
   </div>
   <footer className="studio-save-bar">{footer}</footer>
  </div>
 </>;
}
