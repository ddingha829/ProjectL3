'use client';
import {useId,useRef,useState,type CSSProperties,type ReactNode,type RefObject} from 'react';
import {ChevronUp,Share2} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import EditorialCard,{cardTitle} from '@/social/EditorialCard';
import CardImageActions from '@/social/CardImageActions';
import type {EditorialStyle} from '@/social/editorialStyle';
import type {UnifiedLog} from './store';
import './CardViewer.css';

export default function CardViewer({log,author,appearance,root,children}:{log:UnifiedLog;author:string;appearance:EditorialStyle;root:RefObject<HTMLDivElement|null>;children:ReactNode}){
 const [expanded,setExpanded]=useState(false),[sharing,setSharing]=useState(false),gesture=useRef<{x:number;y:number}|null>(null),skipClick=useRef(false),tools=useRef<HTMLDivElement>(null),toolsId=useId();
 const changeExpanded=(value:boolean)=>{if(!value&&tools.current?.contains(document.activeElement))document.getElementById(toolsId+'-toggle')?.focus({preventScroll:true});setExpanded(value);};
 return <div className={`un-card-viewer ${expanded?'is-expanded':''}`} style={{'--viewer-ratio':appearance.ratio==='1:1'?1:420/747} as CSSProperties} data-viewer-state={expanded?'editing':'viewing'}>
  <div className="un-viewer-stage" onPointerDown={e=>{if(e.pointerType==='mouse'&&e.button!==0)return;gesture.current={x:e.clientX,y:e.clientY};}} onPointerUp={e=>{const start=gesture.current;gesture.current=null;if(!start)return;const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.abs(dy)>48&&Math.abs(dy)>Math.abs(dx)*1.4){const review=(e.target as HTMLElement).closest('[data-ec-scroll]');if(review&&review.scrollHeight>review.clientHeight)return;changeExpanded(!expanded);}}} onPointerCancel={()=>{gesture.current=null;}}>
   <div ref={root} className="un-detail-card"><EditorialCard key={log.id} log={log} author={author} appearance={appearance} hintStrength="strong"/></div>
  </div>
  <div className="un-viewer-drawer">
   <button id={toolsId+'-toggle'} className="un-viewer-toggle" aria-label={expanded?'편집·공유 메뉴 접기':'편집·공유 메뉴 열기'} aria-controls={toolsId} aria-expanded={expanded} onClick={()=>{if(skipClick.current){skipClick.current=false;return;}changeExpanded(!expanded);}}
    onPointerDown={e=>{skipClick.current=false;gesture.current={x:e.clientX,y:e.clientY};e.currentTarget.setPointerCapture(e.pointerId);}} onPointerUp={e=>{const start=gesture.current;gesture.current=null;if(start&&Math.abs(e.clientY-start.y)>32){skipClick.current=true;changeExpanded(e.clientY<start.y);}}} onPointerCancel={()=>{gesture.current=null;}}>
    <span className="un-viewer-chevron" aria-hidden="true"><ChevronUp size={28}/><ChevronUp size={28}/></span><span className="sr-only">{expanded?'카드 크게 보기':'편집 및 공유'}</span>
   </button>
   <div ref={tools} id={toolsId} className="un-detail-tools un-viewer-tools" hidden={!expanded} inert={!expanded}>
    <div className="un-viewer-share-row"><button className="un-outline" onClick={()=>setSharing(true)}><Share2 size={17}/>공유하기</button></div>
    {children}
   </div>
  </div>
  <AccessibleDialog open={sharing} title="공유·이미지 저장" onClose={()=>setSharing(false)} panelClassName="lab-dialog un-export-dialog"><CardImageActions key={log.id+JSON.stringify(appearance)} root={root} title={cardTitle(log)} hasPhoto={!!log.image}/></AccessibleDialog>
 </div>;
}
