'use client';
import {useEffect,useRef,type RefObject} from 'react';
import {swipeAxis,swipeIntent,swipeOffset,type SwipeDirection} from './pageSwipe';

type Gesture={id:number;kind:string;x:number;y:number;time:number;claimed:boolean;offset:number;target:Element;edge?:'left'|'right';surfaces:HTMLElement[]};
type Options={root:RefObject<HTMLElement|null>;canSwipe:(direction:SwipeDirection)=>boolean};
type Live=Options&{onSwipe:(direction:SwipeDirection,offset:number)=>void};

/** Touch events survive native pointercancel on iOS; mouse/pen keep pointer input. */
export function bindPageSwipe(read:()=>Live,suppress:{current:number}){
 let gesture:Gesture|null=null;
 const blocked=(target:Element)=>Boolean(target.closest('[data-no-swipe],[data-no-page-swipe],.mosaic-frame.is-editing,.leaflet-control,input,textarea,select,a,[contenteditable="true"]'));
 const resetMotion=(g:Gesture,spring=false)=>{
  read().root.current?.removeAttribute('data-page-swipe-active');
  for(const element of g.surfaces){
   const from=element.style.transform;element.style.removeProperty('transform');element.style.removeProperty('will-change');
   if(spring&&g.offset&&!matchMedia('(prefers-reduced-motion:reduce)').matches)element.animate([{transform:from},{transform:'translate3d(0,0,0)'}],{duration:180,easing:'cubic-bezier(.2,.75,.2,1)'});
  }
 };
 const cancel=(spring=true)=>{if(gesture)resetMotion(gesture,spring);gesture=null;};
 const begin=(id:number,kind:string,x:number,y:number,target:EventTarget|null)=>{
  cancel(false);suppress.current=0;
  if(!(target instanceof Element)||!target.closest('.un-app')&&!target.closest('.un-navigation')||x<24||x>innerWidth-24||document.querySelector('[aria-modal="true"]')||blocked(target))return;
  let edge:'left'|'right'|undefined;const map=target.closest('.leaflet-container');
  if(map){if(!target.closest('[data-page-swipe-map]'))return;const bounds=map.getBoundingClientRect();edge=x-bounds.left<=44?'left':bounds.right-x<=44?'right':undefined;if(!edge)return;}
  const button=target.closest('button');if(button&&!button.closest('.un-main,.lab-nav-rail'))return;
  for(let node=target;node&&!node.matches('.un-app')&&!node.matches('.un-navigation');node=node.parentElement!){const overflow=getComputedStyle(node).overflowX;if(node.scrollWidth>node.clientWidth+2&&(overflow==='auto'||overflow==='scroll'))return;}
  gesture={id,kind,x,y,time:performance.now(),claimed:false,offset:0,target,edge,surfaces:[]};return Boolean(edge);
 };
 const move=(id:number,x:number,y:number,event:Event)=>{
  const g=gesture;if(!g||g.id!==id)return;
  if(!g.target.isConnected||document.querySelector('[aria-modal="true"]')||blocked(g.target)){cancel();return;}
  const dx=x-g.x,dy=y-g.y,axis=swipeAxis(dx,dy);
  if(g.edge){event.stopPropagation();if(g.edge==='left'&&dx< -12||g.edge==='right'&&dx>12){cancel(false);return;}}
  if(!g.claimed&&axis==='vertical'){suppress.current=performance.now()+500;cancel(false);return;}
  if(!g.claimed&&axis==='horizontal'){
   g.claimed=true;g.surfaces=Array.from(read().root.current?.querySelectorAll<HTMLElement>('[data-page-swipe-surface]')||[]).filter(element=>element.getClientRects().length>0);
   for(const element of g.surfaces){for(const animation of element.getAnimations())animation.cancel();element.style.willChange='transform';}
   read().root.current?.setAttribute('data-page-swipe-active','true');
  }
  if(!g.claimed)return;
  if(event.cancelable)event.preventDefault();
  const direction:SwipeDirection=dx<0?1:-1;g.offset=swipeOffset(dx,innerWidth,read().canSwipe(direction));
  for(const element of g.surfaces)element.style.transform=`translate3d(${g.offset}px,0,0)`;
 };
 const finish=(id:number,x:number,y:number)=>{
  const g=gesture;if(!g||g.id!==id)return;gesture=null;
  const direction=g.claimed?swipeIntent(x-g.x,y-g.y,performance.now()-g.time):null;
  const navigate=direction&&g.target.isConnected&&read().canSwipe(direction)&&!document.querySelector('[aria-modal="true"]')&&!blocked(g.target);
  if(g.claimed)suppress.current=performance.now()+500;
  resetMotion(g,!navigate);if(navigate&&direction)read().onSwipe(direction,g.offset);
 };
 const pointerDown=(event:PointerEvent)=>{
  if(event.button!==0||event.ctrlKey||event.metaKey||event.shiftKey)return;
  if(event.pointerType==='touch'&&gesture?.kind==='touch'){if(gesture.edge)event.stopPropagation();return;}
  if(begin(event.pointerId,event.pointerType==='touch'?'touch-pointer':event.pointerType,event.clientX,event.clientY,event.target))event.stopPropagation();
 };
 const pointerMove=(event:PointerEvent)=>{if(event.pointerType==='touch'&&gesture?.kind==='touch')return;if(gesture?.kind==='mouse'&&event.buttons!==1){cancel();return;}move(event.pointerId,event.clientX,event.clientY,event);};
 const pointerUp=(event:PointerEvent)=>{if(event.pointerType==='touch'&&gesture?.kind==='touch')return;if(gesture?.edge)event.stopPropagation();finish(event.pointerId,event.clientX,event.clientY);};
 const pointerCancel=(event:PointerEvent)=>{if(event.pointerType==='touch'&&gesture?.kind==='touch')return;if(gesture?.id===event.pointerId)cancel();};
 const touchStart=(event:TouchEvent)=>{if(event.touches.length!==1){cancel();return;}const touch=event.touches[0];if(begin(touch.identifier,'touch',touch.clientX,touch.clientY,event.target))event.stopPropagation();};
 const touchMove=(event:TouchEvent)=>{if(event.touches.length!==1){cancel();return;}const touch=event.touches[0];move(touch.identifier,touch.clientX,touch.clientY,event);};
 const touchEnd=(event:TouchEvent)=>{if(event.touches.length){cancel();return;}if(gesture?.edge)event.stopPropagation();const touch=Array.from(event.changedTouches).find(touch=>touch.identifier===gesture?.id);if(touch)finish(touch.identifier,touch.clientX,touch.clientY);};
 const touchCancel=()=>cancel(),blur=()=>cancel(false),preventNativeDrag=(event:DragEvent)=>{if(gesture)event.preventDefault();};
 window.addEventListener('pointerdown',pointerDown,true);window.addEventListener('pointermove',pointerMove,{passive:false,capture:true});window.addEventListener('pointerup',pointerUp,true);window.addEventListener('pointercancel',pointerCancel,true);
 window.addEventListener('touchstart',touchStart,{passive:true,capture:true});window.addEventListener('touchmove',touchMove,{passive:false,capture:true});window.addEventListener('touchend',touchEnd,true);window.addEventListener('touchcancel',touchCancel,true);
 window.addEventListener('blur',blur);document.addEventListener('dragstart',preventNativeDrag,true);
 return()=>{blur();window.removeEventListener('pointerdown',pointerDown,true);window.removeEventListener('pointermove',pointerMove,true);window.removeEventListener('pointerup',pointerUp,true);window.removeEventListener('pointercancel',pointerCancel,true);window.removeEventListener('touchstart',touchStart,true);window.removeEventListener('touchmove',touchMove,true);window.removeEventListener('touchend',touchEnd,true);window.removeEventListener('touchcancel',touchCancel,true);window.removeEventListener('blur',blur);document.removeEventListener('dragstart',preventNativeDrag,true);};
}

/** One finger pages the screen, while maps, carousels and edit modes own gestures. */
export function usePageSwipe(enabled:boolean,onSwipe:(direction:SwipeDirection,offset:number)=>void,options:Options){
 const live=useRef<Live>({onSwipe,...options}),suppress=useRef(0);live.current={onSwipe,...options};
 useEffect(()=>{
  const stopClick=(event:MouseEvent)=>{if(event.detail>0&&performance.now()<suppress.current&&event.target instanceof Element&&(event.target.closest('.un-app')||event.target.closest('.un-navigation'))){event.preventDefault();event.stopImmediatePropagation();}};
  document.addEventListener('click',stopClick,true);return()=>document.removeEventListener('click',stopClick,true);
 },[]);
 useEffect(()=>enabled?bindPageSwipe(()=>live.current,suppress):undefined,[enabled]);
}
