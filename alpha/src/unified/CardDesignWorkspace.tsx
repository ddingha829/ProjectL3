'use client';
import {useId,useLayoutEffect,useRef,useState,type ReactNode,type CSSProperties} from 'react';
import {Maximize2,Image,Layers,Palette,RotateCw,SlidersHorizontal,Type} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import EditorialCard from '@/social/EditorialCard';
import CardDesignEditor from '@/social/CardDesignEditor';
import type {LabLog} from '@/social/model';
import type {EditorialStyle} from '@/social/editorialStyle';
import {BENTO_RATIO_LABELS,bentoKind,cardCanvasHeight,hasBentoFront} from '@/social/bentoLayout';
import './StudioWorkspace.css';

type Section='back'|'color'|'details';
/** The same live preview and controls for presets and individual cards. */
export default function CardDesignWorkspace({log,author,value,onChange,footer,onPhotoToggle}:{log:LabLog;author:string;value:EditorialStyle;onChange:(style:EditorialStyle)=>void;footer:ReactNode;onPhotoToggle?:()=>void}){
 const [expanded,setExpanded]=useState(false);
 const [section,setSection]=useState<Section>('back'),[side,setSide]=useState<'front'|'back'>('back');
 const options=useRef<HTMLDivElement>(null),id=useId(),photo=Boolean(log.image);
 const choose=(next:Section)=>{setSection(next);setSide('back');};
 useLayoutEffect(()=>{
  if(section!=='back')return;
  const strip=options.current?.querySelector<HTMLElement>('.lab-back-choices'),active=strip?.querySelector<HTMLElement>('[aria-pressed=true]');
  if(strip&&active&&strip.scrollWidth>strip.clientWidth){const row=strip.getBoundingClientRect(),item=active.getBoundingClientRect();strip.scrollLeft+=item.left-row.left-(row.width-item.width)/2;}
 },[section,log.id,value.back]);
 return <>
  <AccessibleDialog open={expanded} title="카드 미리보기" onClose={()=>setExpanded(false)} panelClassName="lab-dialog studio-expanded-preview"><EditorialCard log={log} author={author} appearance={value} interactive initialSide={side}/></AccessibleDialog>
  <div className="un-studio-preview studio-canvas">
   <button className="studio-expand" aria-label="카드 미리보기 확대" onClick={()=>setExpanded(true)}><Maximize2 size={17}/></button>
   <div className="studio-card-stage" style={{'--studio-card-ratio':420/cardCanvasHeight(log)} as CSSProperties}><EditorialCard key={`${log.id}:${photo}`} log={log} author={author} appearance={value} interactive={false} initialSide={side}/></div>
   <div className="studio-preview-bar">
    <button onClick={()=>setSide(side==='front'?'back':'front')} disabled={!hasBentoFront(log)} aria-label="미리보기 앞뒤 전환"><RotateCw size={14}/>{side==='back'?'뒷면':'피드 앞면'}</button>
    <span className="studio-auto-ratio">{hasBentoFront(log)?`앞면 자동 · ${BENTO_RATIO_LABELS[bentoKind(log)]}`:'긴 글 리뷰'}</span>
    {onPhotoToggle?<button aria-label="사진 없는 카드 미리보기" aria-pressed={!photo} onClick={()=>{onPhotoToggle();setSide('back');}}>{photo?<Image size={16}/>:<Type size={16}/>}<span>{photo?'사진':'글'}</span></button>:<span className="studio-preview-kind">{photo?<Image size={14}/>:<Type size={14}/>}</span>}
   </div>
  </div>
  <div className="un-studio-tools studio-workbench" data-editor-section={section}>
   <div className="studio-tabs" aria-label="뒷면 편집 메뉴">{([['back','리뷰 디자인',Layers],['color','색상',Palette],['details','질감·글꼴',SlidersHorizontal]] as const).map(([key,label,Icon])=><button key={key} aria-pressed={section===key} aria-controls={id} onClick={()=>choose(key)}><Icon size={16}/>{label}</button>)}</div>
   <div ref={options} className="studio-options" id={id} key={section} role="region" aria-label={`${section==='back'?'뒷면':section==='color'?'색상':'질감·글꼴'} 설정`} tabIndex={0}>
    <CardDesignEditor key={log.id} section={section} hideApply value={value} hasPhoto={photo} onChange={onChange} dirty onApply={()=>{}}/>
   </div>
   <footer className="studio-save-bar">{footer}</footer>
  </div>
 </>;
}
