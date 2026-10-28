'use client';
import {useId,useRef,useState,type CSSProperties,type ReactNode,type RefObject} from 'react';
import {MessageCircle,MoreHorizontal,Share2} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import EditorialCard,{cardTitle} from '@/social/EditorialCard';
import CardImageActions from '@/social/CardImageActions';
import type {EditorialStyle} from '@/social/editorialStyle';
import type {UnifiedLog} from './store';
import {useCardBackSwipe} from './useCardBackSwipe';
import './CardViewer.css';

type Props={log:UnifiedLog;author:string;authorColor?:string;authorInitial?:string;appearance:EditorialStyle;root:RefObject<HTMLDivElement|null>;onBack:()=>boolean;actions:ReactNode;place?:ReactNode;options?:(close:()=>void)=>ReactNode;children:ReactNode};
export default function CardViewer({log,author,authorColor,authorInitial,appearance,root,onBack,actions,place,options,children}:Props){
 const [expanded,setExpanded]=useState(false),[sharing,setSharing]=useState(false),[optionsOpen,setOptionsOpen]=useState(false),gesture=useRef<{x:number;y:number}|null>(null),skipClick=useRef(false),tools=useRef<HTMLDivElement>(null),toolsId=useId();
 const viewer=useRef<HTMLDivElement>(null);useCardBackSwipe(viewer,onBack,!sharing&&!optionsOpen);
 const changeExpanded=(value:boolean)=>{if(!value&&tools.current?.contains(document.activeElement))document.getElementById(toolsId+'-toggle')?.focus({preventScroll:true});setExpanded(value);};
 return <div ref={viewer} className={`un-card-viewer ${expanded?'is-expanded':''}`} style={{'--viewer-ratio':appearance.ratio==='1:1'?1:420/747,'--viewer-peek-content':place?'136px':'112px'} as CSSProperties} data-viewer-state={expanded?'commenting':'viewing'}>
  <div className="un-viewer-stage" onPointerDown={event=>{if(event.pointerType==='mouse'&&event.button!==0)return;gesture.current={x:event.clientX,y:event.clientY};}} onPointerUp={event=>{const start=gesture.current;gesture.current=null;if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.abs(dy)>48&&Math.abs(dy)>Math.abs(dx)*1.4){const review=(event.target as HTMLElement).closest('[data-ec-scroll]');if(review&&review.scrollHeight>review.clientHeight)return;changeExpanded(dy<0);}}} onPointerCancel={()=>{gesture.current=null;}}>
   <div ref={root} className="un-detail-card"><EditorialCard key={log.id} log={log} author={author} appearance={appearance} hintStrength="strong"/></div>
  </div>
  <section className="un-viewer-drawer" aria-label="티끌 반응과 댓글">
   <button id={toolsId+'-toggle'} className="un-viewer-toggle" aria-label={expanded?'댓글 접기':'댓글 펼치기'} aria-controls={toolsId} aria-expanded={expanded} onClick={event=>{if(skipClick.current&&event.detail>0){skipClick.current=false;return;}skipClick.current=false;changeExpanded(!expanded);}}
    onPointerDown={event=>{if(event.pointerType==='mouse'&&event.button!==0)return;skipClick.current=false;gesture.current={x:event.clientX,y:event.clientY};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerUp={event=>{const start=gesture.current;gesture.current=null;if(start&&Math.abs(event.clientY-start.y)>24&&Math.abs(event.clientY-start.y)>Math.abs(event.clientX-start.x)*1.3){skipClick.current=true;changeExpanded(event.clientY<start.y);}}} onPointerCancel={()=>{gesture.current=null;}}>
    <span className="un-viewer-grab" aria-hidden="true"/>
    <span className="un-viewer-peek-row"><span className="un-viewer-author-mark" style={{'--author-color':authorColor||'var(--muted)'} as CSSProperties}>{authorInitial||author.slice(0,1)}</span><span className="un-viewer-author-copy"><strong>{author}</strong><small>{new Date(log.createdAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</small></span><span className="un-viewer-comment-count"><MessageCircle size={17}/><span>{log.comments.length}</span></span></span>
   </button>
   <div className="un-viewer-summary"><div className="un-viewer-action-bar"><div className="un-viewer-reactions">{actions}</div><button className="un-viewer-icon-action" aria-label="공유하기" title="공유하기" onClick={()=>setSharing(true)}><Share2 size={18}/></button>{options&&<button className="un-viewer-icon-action" aria-label="티끌 옵션" title="티끌 옵션" onClick={()=>setOptionsOpen(true)}><MoreHorizontal size={21}/></button>}</div>{place}</div>
   <div ref={tools} id={toolsId} className="un-detail-tools un-viewer-tools" hidden={!expanded} inert={!expanded}>{children}</div>
  </section>
  <AccessibleDialog open={sharing} title="공유·이미지 저장" onClose={()=>setSharing(false)} panelClassName="lab-dialog un-export-dialog"><CardImageActions key={log.id+JSON.stringify(appearance)} root={root} title={cardTitle(log)} hasPhoto={!!log.image}/></AccessibleDialog>
  <AccessibleDialog open={optionsOpen} title="티끌 옵션" onClose={()=>setOptionsOpen(false)} panelClassName="lab-dialog un-log-options"><div className="un-log-options-list">{options?.(()=>setOptionsOpen(false))}</div></AccessibleDialog>
 </div>;
}
