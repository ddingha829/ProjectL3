'use client';
import {useCallback,useEffect,useRef,useState,type RefObject} from 'react';

/** Each side is a flat projected surface. Never depend on a nested 3D context:
 * WebKit can flatten those contexts when the card includes clipping or filters. */
export function useCardTurn(scene:RefObject<HTMLDivElement|null>,initialBack:boolean){
 const front=useRef<HTMLDivElement>(null),rear=useRef<HTMLDivElement>(null),angle=useRef(initialBack?180:0),frame=useRef(0),facing=useRef(initialBack),[visibleBack,setVisibleBack]=useState(initialBack);
 const paint=useCallback((degrees:number)=>{
  angle.current=degrees;const back=Math.cos(degrees*Math.PI/180)<0;
  for(const [element,rotation,visible] of [[front.current,degrees,!back],[rear.current,degrees-180,back]] as const){if(!element)continue;element.style.transform=`perspective(1400px) rotateY(${rotation}deg)`;element.style.visibility=visible?'visible':'hidden';element.style.pointerEvents=visible?'':'none';}
  if(scene.current){scene.current.dataset.renderedSide=back?'back':'front';scene.current.dataset.turnAngle=degrees.toFixed(3);}
  if(facing.current!==back){facing.current=back;setVisibleBack(back);}
 },[scene]);
 const cancel=useCallback(()=>cancelAnimationFrame(frame.current),[]);
 const reset=useCallback((back:boolean)=>{cancel();paint(back?180:0);},[cancel,paint]);
 const turn=useCallback((back:boolean)=>{
  cancel();const target=back?180:0,from=angle.current,distance=Math.abs(target-from);
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||distance<.01){paint(target);return;}
  const started=performance.now(),duration=650*Math.min(1,distance/180);
  const tick=(now:number)=>{const t=Math.min(1,(now-started)/duration);paint(from+(target-from)*(1-(1-t)**3));if(t<1)frame.current=requestAnimationFrame(tick);};
  frame.current=requestAnimationFrame(tick);
 },[cancel,paint]);
 const hint=useCallback((back:boolean,onDone:()=>void,strong=false)=>{
  cancel();const base=back?180:0,started=performance.now();
  if(matchMedia('(prefers-reduced-motion: reduce)').matches){paint(base);onDone();return;}
  const tick=(now:number)=>{const t=Math.min(1,(now-started)/(strong?850:500));paint(base+Math.sin(Math.PI*t)*(strong?24:10));if(t<1)frame.current=requestAnimationFrame(tick);else{paint(base);onDone();}};
  frame.current=requestAnimationFrame(tick);
 },[cancel,paint]);
 useEffect(()=>cancel,[cancel]);
 return {front,rear,visibleBack,reset,turn,hint};
}
