'use client';
import {useEffect,useRef,type RefObject} from 'react';
import {swipeAxis} from './pageSwipe';
import {isCardBackSwipe} from './cardNavigation';
type Gesture={id:number;x:number;y:number;time:number;dx:number;claimed:boolean;panel:HTMLElement;overlay:HTMLElement};
export function useCardBackSwipe(root:RefObject<HTMLElement|null>,onBack:()=>boolean,enabled=true){
 const callback=useRef(onBack),suppress=useRef(0);callback.current=onBack;
 useEffect(()=>{
  const click=(event:MouseEvent)=>{if(event.detail>0&&performance.now()<suppress.current){event.preventDefault();event.stopImmediatePropagation();}};
  document.addEventListener('click',click,true);return()=>document.removeEventListener('click',click,true);
 },[]);
 useEffect(()=>{
  if(!enabled)return;
  let gesture:Gesture|null=null;const touches=new Set<number>();
  const top=(panel:HTMLElement)=>Array.from(document.querySelectorAll('[aria-modal="true"]')).at(-1)===panel;
  const restore=(g:Gesture,spring=false)=>{
   const from=g.panel.style.transform;g.panel.style.removeProperty('transform');g.panel.style.removeProperty('will-change');g.panel.removeAttribute('data-back-swiping');
   g.overlay.style.removeProperty('background');g.overlay.style.removeProperty('backdrop-filter');g.overlay.style.removeProperty('-webkit-backdrop-filter');
   if(spring&&g.dx&&!matchMedia('(prefers-reduced-motion:reduce)').matches)g.panel.animate([{transform:from},{transform:'translate3d(0,0,0)'}],{duration:180,easing:'cubic-bezier(.2,.75,.2,1)'});
  };
  const cancel=(spring=true)=>{if(gesture)restore(gesture,spring);gesture=null;};
  const down=(event:PointerEvent)=>{
   suppress.current=0;
   if(event.pointerType==='touch'){touches.add(event.pointerId);if(touches.size>1){cancel();return;}}
   // Leave the screen edge to the browser/OS back gesture; its popstate closes the same card.
   if(event.pointerType==='touch'&&event.clientX<=24)return;
   const target=event.target,panel=root.current?.closest<HTMLElement>('.un-detail-dialog'),overlay=panel?.parentElement;
   if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey||!(target instanceof Element)||!root.current?.contains(target)||!panel||!overlay||!top(panel)||target.closest('input,textarea,select,a,[contenteditable="true"],[data-no-back-swipe]')||window.getSelection()?.toString())return;
   if(event.pointerType==='mouse'&&target.closest('[data-ec-scroll]'))return;
   gesture={id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now(),dx:0,claimed:false,panel,overlay};
  };
  const move=(event:PointerEvent)=>{
   const g=gesture;if(!g||g.id!==event.pointerId)return;
   if(touches.size>1||!top(g.panel)||event.pointerType==='mouse'&&event.buttons!==1){cancel();return;}
   const dx=event.clientX-g.x,dy=event.clientY-g.y,axis=swipeAxis(dx,dy);
   if(!g.claimed&&(axis==='vertical'||dx< -12)){suppress.current=performance.now()+500;cancel(false);return;}
   if(!g.claimed&&dx>12&&axis==='horizontal'){g.claimed=true;g.panel.style.willChange='transform';g.panel.setAttribute('data-back-swiping','true');window.getSelection()?.removeAllRanges();}
   if(!g.claimed)return;if(event.cancelable)event.preventDefault();
   g.dx=Math.max(0,Math.min(innerWidth*.95,dx));const progress=g.dx/innerWidth;
   g.panel.style.transform=`translate3d(${g.dx}px,0,0)`;
   g.overlay.style.background=`color-mix(in srgb,var(--bg) ${88-progress*65}%,transparent)`;
   g.overlay.style.backdropFilter=`blur(${24*(1-progress)}px)`;g.overlay.style.setProperty('-webkit-backdrop-filter',`blur(${24*(1-progress)}px)`);
  };
  const up=(event:PointerEvent)=>{
   touches.delete(event.pointerId);const g=gesture;if(!g||g.id!==event.pointerId)return;gesture=null;
   if(g.claimed)suppress.current=performance.now()+500;
   const back=g.claimed&&top(g.panel)&&isCardBackSwipe(event.clientX-g.x,event.clientY-g.y,performance.now()-g.time,innerWidth);
   if(back&&callback.current())restore(g,false);else restore(g,true);
  };
  const pointerCancel=(event:PointerEvent)=>{touches.delete(event.pointerId);if(gesture?.id===event.pointerId)cancel();};
  const blur=()=>{touches.clear();cancel(false);};
  const drag=(event:DragEvent)=>{if(gesture)event.preventDefault();};
  window.addEventListener('pointerdown',down,true);window.addEventListener('pointermove',move,{capture:true,passive:false});window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',pointerCancel,true);window.addEventListener('blur',blur);document.addEventListener('dragstart',drag,true);
  return()=>{blur();window.removeEventListener('pointerdown',down,true);window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',pointerCancel,true);window.removeEventListener('blur',blur);document.removeEventListener('dragstart',drag,true);};
 },[enabled,root]);
}
