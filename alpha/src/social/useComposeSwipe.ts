'use client';
import {useEffect,useRef} from 'react';

/** Swipe right towards the upper-left add action; map gestures keep ownership. */
export function useComposeSwipe(enabled:boolean,onCompose:()=>void){
 const callback=useRef(onCompose);callback.current=onCompose;
 const suppressUntil=useRef(0);
 useEffect(()=>{
  const click=(event:MouseEvent)=>{if(performance.now()<suppressUntil.current&&document.querySelector('.lab-story-dialog')&&event.target instanceof Element&&event.target.closest('.lab-app')){event.preventDefault();event.stopImmediatePropagation();}};
  document.addEventListener('click',click,true);return()=>document.removeEventListener('click',click,true);
 },[]);
 useEffect(()=>{
  if(!enabled)return;
  let start:{x:number;y:number;time:number;claimed:boolean}|null=null;
  const begin=(event:TouchEvent)=>{
   start=null;
   if(event.touches.length!==1){start=null;return;}const target=event.target instanceof Element?event.target:null;
   if(!target?.closest('.lab-app')||target.closest('.leaflet-container,.scratch-map,.lab-member-filters,.lab-nav-rail,.lab-segment,input,textarea,select,a,[data-dialog-overlay]'))return;
   const button=target.closest('button');if(button&&!button.classList.contains('lab-log-poster'))return;
   const touch=event.touches[0];if(touch.clientX<24||touch.clientX>innerWidth-24)return;
   start={x:touch.clientX,y:touch.clientY,time:performance.now(),claimed:false};
  };
  const move=(event:TouchEvent)=>{if(!start)return;if(event.touches.length!==1){start=null;return;}const dx=event.touches[0].clientX-start.x,dy=event.touches[0].clientY-start.y;if(!start.claimed&&Math.abs(dy)>18&&Math.abs(dy)>Math.abs(dx)*.7){start=null;return;}if(dx>22&&Math.abs(dx)>Math.abs(dy)*1.7){start.claimed=true;if(event.cancelable)event.preventDefault();}};
  const end=(event:TouchEvent)=>{const gesture=start;start=null;if(!gesture||!event.changedTouches[0])return;const dx=event.changedTouches[0].clientX-gesture.x,dy=event.changedTouches[0].clientY-gesture.y;if(gesture.claimed)suppressUntil.current=performance.now()+450;if(dx>(performance.now()-gesture.time<400?48:72)&&Math.abs(dx)>Math.abs(dy)*1.7){suppressUntil.current=performance.now()+450;callback.current();}};
  const cancel=()=>{start=null;};
  document.addEventListener('touchstart',begin,{passive:true});document.addEventListener('touchmove',move,{passive:false});document.addEventListener('touchend',end,{passive:true});document.addEventListener('touchcancel',cancel);
  return()=>{document.removeEventListener('touchstart',begin);document.removeEventListener('touchmove',move);document.removeEventListener('touchend',end);document.removeEventListener('touchcancel',cancel);};
 },[enabled]);
}
