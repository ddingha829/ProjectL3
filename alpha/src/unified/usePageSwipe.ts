'use client';
import {useEffect,useRef} from 'react';
import {swipeIntent,type SwipeDirection} from './pageSwipe';
type Gesture={x:number;y:number;time:number;claimed:boolean};
/** Local controls own map, board, form and scrolling gestures; page swipes use the rest. */
export function usePageSwipe(enabled:boolean,onSwipe:(direction:SwipeDirection)=>void){
 const callback=useRef(onSwipe),suppress=useRef(0);callback.current=onSwipe;
 useEffect(()=>{const stopClick=(event:MouseEvent)=>{if(performance.now()<suppress.current&&event.target instanceof Element&&event.target.closest('.un-app')){event.preventDefault();event.stopImmediatePropagation();}};document.addEventListener('click',stopClick,true);return()=>document.removeEventListener('click',stopClick,true);},[]);
 useEffect(()=>{
  if(!enabled)return;
  let touch:Gesture|null=null,mouse:Gesture|null=null;
  const begin=(target:EventTarget|null,x:number,y:number):Gesture|null=>{
   if(!(target instanceof Element)||!target.closest('.un-app')||x<24||x>innerWidth-24||document.querySelector('[aria-modal="true"]'))return null;
   if(target.closest('.leaflet-container,.scratch-map,.mosaic-frame,.mosaic-tray,[data-no-swipe],[data-ec-scroll],input,textarea,select,a,[contenteditable="true"]'))return null;
   const button=target.closest('button');if(button&&!button.matches('.un-feed-card-open')&&!button.closest('.lab-nav-rail'))return null;
   for(let node=target;node&&!node.matches('.un-app');node=node.parentElement!){const overflow=getComputedStyle(node).overflowX;if(node.scrollWidth>node.clientWidth+2&&(overflow==='auto'||overflow==='scroll'))return null;}
   return{x,y,time:performance.now(),claimed:false};
  };
  const move=(g:Gesture|null,x:number,y:number,event:Event):Gesture|null=>{
   if(!g)return null;const dx=x-g.x,dy=y-g.y;
   if(!g.claimed&&Math.abs(dy)>14&&Math.abs(dy)>Math.abs(dx)*.9)return null;
   if(Math.abs(dx)>20&&Math.abs(dx)>Math.abs(dy)*1.7)g.claimed=true;
   if(g.claimed&&event.cancelable)event.preventDefault();return g;
  };
  const finish=(g:Gesture|null,x:number,y:number)=>{if(!g)return;const direction=swipeIntent(x-g.x,y-g.y,performance.now()-g.time);if(g.claimed||direction)suppress.current=performance.now()+500;if(direction&&!document.querySelector('[aria-modal="true"]'))callback.current(direction);};
  const touchStart=(event:TouchEvent)=>{touch=event.touches.length===1?begin(event.target,event.touches[0].clientX,event.touches[0].clientY):null;};
  const touchMove=(event:TouchEvent)=>{touch=event.touches.length===1?move(touch,event.touches[0].clientX,event.touches[0].clientY,event):null;};
  const touchEnd=(event:TouchEvent)=>{const g=touch;touch=null;if(event.touches.length||!event.changedTouches[0])return;finish(g,event.changedTouches[0].clientX,event.changedTouches[0].clientY);};
  const pointerDown=(event:PointerEvent)=>{if(event.pointerType==='mouse'&&event.button===0)mouse=begin(event.target,event.clientX,event.clientY);};
  const pointerMove=(event:PointerEvent)=>{if(event.pointerType==='mouse')mouse=event.buttons===1?move(mouse,event.clientX,event.clientY,event):null;};
  const pointerUp=(event:PointerEvent)=>{if(event.pointerType!=='mouse')return;const g=mouse;mouse=null;finish(g,event.clientX,event.clientY);};
  const cancel=()=>{touch=null;mouse=null;};
  const preventNativeDrag=(event:DragEvent)=>{if(mouse)event.preventDefault();};
  document.addEventListener('touchstart',touchStart,{passive:true});document.addEventListener('touchmove',touchMove,{passive:false});document.addEventListener('touchend',touchEnd,{passive:true});document.addEventListener('touchcancel',cancel);
  window.addEventListener('pointerdown',pointerDown,true);window.addEventListener('pointermove',pointerMove,{passive:false,capture:true});window.addEventListener('pointerup',pointerUp,true);window.addEventListener('pointercancel',cancel,true);document.addEventListener('dragstart',preventNativeDrag,true);window.addEventListener('blur',cancel);
  return()=>{document.removeEventListener('touchstart',touchStart);document.removeEventListener('touchmove',touchMove);document.removeEventListener('touchend',touchEnd);document.removeEventListener('touchcancel',cancel);window.removeEventListener('pointerdown',pointerDown,true);window.removeEventListener('pointermove',pointerMove,true);window.removeEventListener('pointerup',pointerUp,true);window.removeEventListener('pointercancel',cancel,true);document.removeEventListener('dragstart',preventNativeDrag,true);window.removeEventListener('blur',cancel);};
 },[enabled]);
}
