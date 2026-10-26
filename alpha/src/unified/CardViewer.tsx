'use client';
import {useId,useRef,useState,type CSSProperties,type ReactNode,type RefObject} from 'react';
import {MessageCircle,MoreHorizontal,Share2} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import EditorialCard,{cardTitle} from '@/social/EditorialCard';
import CardImageActions from '@/social/CardImageActions';
import type {EditorialStyle} from '@/social/editorialStyle';
import type {UnifiedLog} from './store';
import './CardViewer.css';

type Props={log:UnifiedLog;author:string;authorColor?:string;authorInitial?:string;appearance:EditorialStyle;root:RefObject<HTMLDivElement|null>;actions:ReactNode;options?:(close:()=>void)=>ReactNode;children:ReactNode};
export default function CardViewer({log,author,authorColor,authorInitial,appearance,root,actions,options,children}:Props){
 const [expanded,setExpanded]=useState(false),[sharing,setSharing]=useState(false),[optionsOpen,setOptionsOpen]=useState(false),gesture=useRef<{x:number;y:number}|null>(null),skipClick=useRef(false),tools=useRef<HTMLDivElement>(null),toolsId=useId();
 const changeExpanded=(value:boolean)=>{if(!value&&tools.current?.contains(document.activeElement))document.getElementById(toolsId+'-toggle')?.focus({preventScroll:true});setExpanded(value);};
 return <div className={`un-card-viewer ${expanded?'is-expanded':''}`} style={{'--viewer-ratio':appearance.ratio==='1:1'?1:420/747} as CSSProperties} data-viewer-state={expanded?'editing':'viewing'}>
  <div className="un-viewer-stage" onPointerDown={event=>{if(event.pointerType==='mouse'&&event.button!==0)return;gesture.current={x:event.clientX,y:event.clientY};}} onPointerUp={event=>{const start=gesture.current;gesture.current=null;if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.abs(dy)>48&&Math.abs(dy)>Math.abs(dx)*1.4){const review=(event.target as HTMLElement).closest('[data-ec-scroll]');if(review&&review.scrollHeight>review.clientHeight)return;changeExpanded(dy<0);}}} onPointerCancel={()=>{gesture.current=null;}}>
   <div ref={root} className="un-detail-card"><EditorialCard key={log.id} log={log} author={author} appearance={appearance} hintStrength="strong"/></div>
  </div>
  <section className="un-viewer-drawer" aria-label="로그 반응과 댓글">
   <button id={toolsId+'-toggle'} className="un-viewer-toggle" aria-label={expanded?'댓글·메뉴 접기':'댓글·메뉴 펼치기'} aria-controls={toolsId} aria-expanded={expanded} onClick={event=>{if(skipClick.current&&event.detail>0){skipClick.current=false;return;}skipClick.current=false;changeExpanded(!expanded);}}
    onPointerDown={event=>{if(event.pointerType==='mouse'&&event.button!==0)return;skipClick.current=false;gesture.current={x:event.clientX,y:event.clientY};event.currentTarget.setPointerCapture(event.pointerId);}} onPointerUp={event=>{const start=gesture.current;gesture.current=null;if(start&&Math.abs(event.clientY-start.y)>24){skipClick.current=true;changeExpanded(event.clientY<start.y);}}} onPointerCancel={()=>{gesture.current=null;}}>
    <span className="un-viewer-grab" aria-hidden="true"/>
    <span className="un-viewer-peek-row"><span className="un-viewer-author-mark" style={{'--author-color':authorColor||'var(--muted)'} as CSSProperties}>{authorInitial||author.slice(0,1)}</span><span className="un-viewer-author-copy"><strong>{author}</strong><small>{new Date(log.createdAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</small></span><span className="un-viewer-comment-count"><MessageCircle size={17}/><span>{log.comments.length}</span></span></span>
   </button>
   <div ref={tools} id={toolsId} className="un-detail-tools un-viewer-tools" hidden={!expanded} inert={!expanded}>
    <div className="un-viewer-action-bar"><div className="un-viewer-reactions">{actions}</div><button className="un-viewer-icon-action" aria-label="공유하기" title="공유하기" onClick={()=>setSharing(true)}><Share2 size={18}/></button>{options&&<button className="un-viewer-icon-action" aria-label="로그 옵션" title="로그 옵션" onClick={()=>setOptionsOpen(true)}><MoreHorizontal size={21}/></button>}</div>
    {children}
   </div>
  </section>
  <AccessibleDialog open={sharing} title="공유·이미지 저장" onClose={()=>setSharing(false)} panelClassName="lab-dialog un-export-dialog"><CardImageActions key={log.id+JSON.stringify(appearance)} root={root} title={cardTitle(log)} hasPhoto={!!log.image}/></AccessibleDialog>
  <AccessibleDialog open={optionsOpen} title="로그 옵션" onClose={()=>setOptionsOpen(false)} panelClassName="lab-dialog un-log-options"><div className="un-log-options-list">{options?.(()=>setOptionsOpen(false))}</div></AccessibleDialog>
 </div>;
}
