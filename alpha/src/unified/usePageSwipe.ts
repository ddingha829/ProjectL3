'use client';
import {useEffect,useRef,type RefObject} from 'react';
import {swipeAxis,swipeIntent,swipeOffset,type SwipeDirection} from './pageSwipe';

type Gesture={id:number;kind:string;x:number;y:number;time:number;claimed:boolean;offset:number;target:Element;surfaces:HTMLElement[]};
type Options={root:RefObject<HTMLElement|null>;canSwipe:(direction:SwipeDirection)=>boolean};
/** One primary pointer pages the main screen; local edit modes and multitouch own their gestures. */
export function usePageSwipe(enabled:boolean,onSwipe:(direction:SwipeDirection,offset:number)=>void,options:Options){
 const live=useRef({onSwipe,...options}),suppress=useRef(0);live.current={onSwipe,...options};
 useEffect(()=>{
  const stopClick=(event:MouseEvent)=>{if(event.detail>0&&performance.now()<suppress.current&&event.target instanceof Element&&event.target.closest('.un-app')){event.preventDefault();event.stopImmediatePropagation();}};
  document.addEventListener('click',stopClick,true);return()=>document.removeEventListener('click',stopClick,true);
 },[]);
 useEffect(()=>{
  if(!enabled)return;
  let gesture:Gesture|null=null;const touches=new Set<number>();
  const blocked=(target:Element)=>Boolean(target.closest('[data-no-swipe],[data-no-page-swipe],.mosaic-frame.is-editing,.leaflet-control,input,textarea,select,a,[contenteditable="true"]'));
  const resetMotion=(g:Gesture,spring=false)=>{
   live.current.root.current?.removeAttribute('data-page-swipe-active');
   for(const element of g.surfaces){
    const from=element.style.transform;element.style.removeProperty('transform');element.style.removeProperty('will-change');
    if(spring&&g.offset&&!matchMedia('(prefers-reduced-motion:reduce)').matches)element.animate([{transform:from},{transform:'translate3d(0,0,0)'}],{duration:180,easing:'cubic-bezier(.2,.75,.2,1)'});
   }
  };
  const cancel=(spring=true)=>{if(gesture)resetMotion(gesture,spring);gesture=null;};
  const down=(event:PointerEvent)=>{
   suppress.current=0;
   if(event.pointerType==='touch'){touches.add(event.pointerId);if(touches.size>1){cancel();return;}}
   if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey)return;
   const target=event.target;
   if(!(target instanceof Element)||!target.closest('.un-app')||event.clientX<24||event.clientX>innerWidth-24||document.querySelector('[aria-modal="true"]')||blocked(target))return;
   if(target.closest('.leaflet-container'))return;
   const button=target.closest('button');if(button&&!button.closest('.un-main,.lab-nav-rail'))return;
   for(let node=target;node&&!node.matches('.un-app');node=node.parentElement!){const overflow=getComputedStyle(node).overflowX;if(node.scrollWidth>node.clientWidth+2&&(overflow==='auto'||overflow==='scroll'))return;}
   gesture={id:event.pointerId,kind:event.pointerType,x:event.clientX,y:event.clientY,time:performance.now(),claimed:false,offset:0,target,surfaces:[]};
  };
  const move=(event:PointerEvent)=>{
   const g=gesture;if(!g||g.id!==event.pointerId)return;
   if(!g.target.isConnected||(g.kind==='mouse'&&event.buttons!==1)||touches.size>1||document.querySelector('[aria-modal="true"]')||blocked(g.target)){cancel();return;}
   const dx=event.clientX-g.x,dy=event.clientY-g.y,axis=swipeAxis(dx,dy);
   if(!g.claimed&&axis==='vertical'){suppress.current=performance.now()+500;cancel(false);return;}
   if(!g.claimed&&axis==='horizontal'){
    g.claimed=true;g.surfaces=Array.from(live.current.root.current?.querySelectorAll<HTMLElement>('[data-page-swipe-surface]')||[]).filter(element=>element.getClientRects().length>0);
    for(const element of g.surfaces){for(const animation of element.getAnimations())animation.cancel();element.style.willChange='transform';}
    live.current.root.current?.setAttribute('data-page-swipe-active','true');
   }
   if(!g.claimed)return;
   if(event.cancelable)event.preventDefault();
   const direction:SwipeDirection=dx<0?1:-1;g.offset=swipeOffset(dx,innerWidth,live.current.canSwipe(direction));
   for(const element of g.surfaces)element.style.transform=`translate3d(${g.offset}px,0,0)`;
  };
  const up=(event:PointerEvent)=>{
   touches.delete(event.pointerId);const g=gesture;if(!g||g.id!==event.pointerId)return;gesture=null;
   const direction=g.claimed?swipeIntent(event.clientX-g.x,event.clientY-g.y,performance.now()-g.time):null;
   const navigate=direction&&g.target.isConnected&&live.current.canSwipe(direction)&&!document.querySelector('[aria-modal="true"]')&&!blocked(g.target);
   if(g.claimed)suppress.current=performance.now()+500;
   resetMotion(g,!navigate);if(navigate&&direction)live.current.onSwipe(direction,g.offset);
  };
  const pointerCancel=(event:PointerEvent)=>{touches.delete(event.pointerId);if(gesture?.id===event.pointerId)cancel();};
  const blur=()=>{touches.clear();cancel(false);};
  const preventNativeDrag=(event:DragEvent)=>{if(gesture)event.preventDefault();};
  window.addEventListener('pointerdown',down,true);window.addEventListener('pointermove',move,{passive:false,capture:true});window.addEventListener('pointerup',up,true);window.addEventListener('pointercancel',pointerCancel,true);window.addEventListener('blur',blur);document.addEventListener('dragstart',preventNativeDrag,true);
  return()=>{blur();window.removeEventListener('pointerdown',down,true);window.removeEventListener('pointermove',move,true);window.removeEventListener('pointerup',up,true);window.removeEventListener('pointercancel',pointerCancel,true);window.removeEventListener('blur',blur);document.removeEventListener('dragstart',preventNativeDrag,true);};
 },[enabled]);
}
