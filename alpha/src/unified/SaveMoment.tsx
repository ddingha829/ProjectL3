'use client';
import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {Check} from 'lucide-react';
import EditorialCard from '@/social/EditorialCard';
import type {UnifiedLog} from './store';

/** A confirmed save becomes a card, then settles into its actual feed position. */
export default function SaveMoment({log,author,onDone}:{log:UnifiedLog;author:string;onDone:()=>void}){
 const card=useRef<HTMLDivElement>(null),done=useRef(onDone);done.current=onDone;
 useEffect(()=>{
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const timer=setTimeout(()=>done.current(),reduced?1500:1900);
  let animation:Animation|undefined;
  const frame=requestAnimationFrame(()=>{
   const element=card.current;if(!element||reduced)return;
   const target=Array.from(document.querySelectorAll<HTMLElement>('.un-log[data-log-id]')).find(node=>node.dataset.logId===log.id);
   const from=element.getBoundingClientRect(),to=target?.getBoundingClientRect();
   const visible=to&&to.top>=0&&to.bottom<innerHeight;
   const finish=visible?`translate(${to.left+to.width/2-from.left-from.width/2}px,${to.top+to.height/2-from.top-from.height/2}px) scale(${to.width/from.width})`:'translateY(18px) scale(.94)';
   animation=element.animate([{opacity:0,transform:'translateY(20px) scale(.92)',offset:0},{opacity:1,transform:'translateY(0) scale(1.015)',offset:.18},{opacity:1,transform:'translateY(0) scale(1)',offset:.32},{opacity:1,transform:'translateY(0) scale(1)',offset:.65},{opacity:0,transform:finish,offset:1}],{duration:1800,easing:'cubic-bezier(.22,.7,.25,1)',fill:'both'});
  });
  return()=>{clearTimeout(timer);cancelAnimationFrame(frame);animation?.cancel();};
 },[log.id]);
 return createPortal(<div className="un-save-moment" aria-live="polite"><div ref={card} className="un-save-moment-card" aria-hidden="true"><EditorialCard log={log} author={author} interactive={false}/></div><div className="un-save-moment-caption"><Check size={16}/><span>티끌 한 장을 남겼어요</span></div></div>,document.body);
}
