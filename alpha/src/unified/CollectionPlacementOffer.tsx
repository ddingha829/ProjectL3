'use client';
import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {ArrowUpRight,Grid2X2,X} from 'lucide-react';
import type {UnifiedLog} from './store';
import './CollectionPlacementOffer.css';

export const collectionIntroKey=(owner:string)=>`ticgle_collection_intro_v1:${owner}`;
const seenThisVisit=new Set<string>();
function firstVisit(owner:string){if(seenThisVisit.has(owner))return false;try{return localStorage.getItem(collectionIntroKey(owner))!=='1';}catch{return true;}}

/** A dismissible, nonmodal invitation after the existing saved-card moment. */
export default function CollectionPlacementOffer({log,owner,onPlace,onDismiss}:{log:UnifiedLog;owner:string;onPlace:()=>void;onDismiss:()=>void}){
 const [intro]=useState(()=>firstVisit(owner)),[host,setHost]=useState<HTMLElement|null>(null),[hovered,setHovered]=useState(false),[focused,setFocused]=useState(false),[visible,setVisible]=useState(true);
 const paused=hovered||focused;
 const remaining=useRef(intro?12000:8000),dismiss=useRef(onDismiss);dismiss.current=onDismiss;
 useEffect(()=>{
  setHost(document.querySelector<HTMLElement>('[data-app-chrome]')||document.body);
  seenThisVisit.add(owner);try{localStorage.setItem(collectionIntroKey(owner),'1');}catch{}
  const visibility=()=>setVisible(document.visibilityState!=='hidden');visibility();document.addEventListener('visibilitychange',visibility);
  return()=>document.removeEventListener('visibilitychange',visibility);
 },[owner]);
 useEffect(()=>{
  if(!host||paused||!visible)return;
  const started=Date.now(),timer=setTimeout(()=>dismiss.current(),remaining.current);
  return()=>{clearTimeout(timer);remaining.current=Math.max(0,remaining.current-(Date.now()-started));};
 },[host,paused,visible]);
 if(!host)return null;
 return createPortal(<aside className="un-collection-offer" aria-label="끌렉션에 놓기 안내" data-no-swipe onPointerEnter={event=>{if(event.pointerType==='mouse')setHovered(true);}} onPointerLeave={event=>{if(event.pointerType==='mouse')setHovered(false);}} onFocusCapture={()=>setFocused(true)} onBlurCapture={event=>{if(!event.currentTarget.contains(event.relatedTarget as Node|null))setFocused(false);}}>
  <div className="un-collection-offer-main">
   <span className="un-collection-offer-art" aria-hidden="true">{log.image?<img src={log.image} alt="" decoding="async"/>:<Grid2X2 size={22} strokeWidth={1.5}/>}</span>
   <div className="un-collection-offer-copy" role="status"><strong>이 작품을 끌렉션에 놓아볼까요?</strong><span>{log.work?.title||log.title}</span></div>
   <button type="button" className="un-collection-offer-close" aria-label="끌렉션 안내 닫기" onClick={onDismiss}><X size={17} strokeWidth={1.7}/></button>
  </div>
  {intro&&<p className="un-collection-offer-intro">작품 티끌은 끌렉션에서 모을 수 있어요.<br/>원하는 빈 칸을 골라 나만의 취향집을 채워보세요.</p>}
  <div className="un-collection-offer-actions"><span><Grid2X2 size={14} aria-hidden="true"/>내 끌렉션</span><button type="button" onClick={onPlace}>자리 고르기<ArrowUpRight size={15} aria-hidden="true"/></button></div>
 </aside>,host);
}
