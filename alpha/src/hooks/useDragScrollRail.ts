'use client';
import { useEffect, useRef, type PointerEvent, type MouseEvent, type RefObject } from 'react';
import { allowsMotion } from '@/lib/motion';

/** Native touch/trackpad scrolling plus mouse/pen dragging, independent of tab swipes. */
export function useDragScrollRail(ref: RefObject<HTMLDivElement | null>) {
  const gesture=useRef<{pointer:number;x:number;y:number;left:number;lastX:number;time:number;velocity:number;dragged:boolean}|null>(null);
  const suppressClick=useRef(false),frame=useRef(0);
  const stop=()=>{cancelAnimationFrame(frame.current);ref.current?.classList.remove('is-dragging','is-coasting');};
  useEffect(()=>()=>{cancelAnimationFrame(frame.current);},[]);
  const onPointerDown=(event:PointerEvent<HTMLDivElement>)=>{
    event.stopPropagation();stop();suppressClick.current=false;gesture.current=null;
    if(event.pointerType==='touch'||event.button!==0||!event.isPrimary)return;
    const node=ref.current;if(!node||node.scrollWidth<=node.clientWidth+2)return;
    gesture.current={pointer:event.pointerId,x:event.clientX,y:event.clientY,left:node.scrollLeft,lastX:event.clientX,time:performance.now(),velocity:0,dragged:false};
  };
  const onPointerMove=(event:PointerEvent<HTMLDivElement>)=>{
    const g=gesture.current,node=ref.current;if(!g||!node||g.pointer!==event.pointerId)return;
    const dx=event.clientX-g.x,dy=event.clientY-g.y;
    if(!g.dragged){if(Math.abs(dx)<6||Math.abs(dx)<Math.abs(dy))return;g.dragged=true;suppressClick.current=true;node.classList.add('is-dragging');node.setPointerCapture(event.pointerId);}
    event.preventDefault();event.stopPropagation();
    const now=performance.now(),dt=Math.max(8,now-g.time);g.velocity=g.velocity*.3+(g.lastX-event.clientX)/dt*.7;g.lastX=event.clientX;g.time=now;
    node.scrollLeft=g.left-dx;
  };
  const finish=(event:PointerEvent<HTMLDivElement>,cancel=false)=>{
    const g=gesture.current,node=ref.current;gesture.current=null;if(!g||!node||g.pointer!==event.pointerId)return;
    if(node.hasPointerCapture(event.pointerId))node.releasePointerCapture(event.pointerId);
    node.classList.remove('is-dragging');if(!g.dragged||cancel||!allowsMotion())return;
    let velocity=performance.now()-g.time>90?0:Math.max(-2.5,Math.min(2.5,g.velocity)),previous=performance.now();
    if(Math.abs(velocity)<.03)return;node.classList.add('is-coasting');
    const step=(now:number)=>{if(!ref.current)return;const dt=Math.min(32,now-previous),before=node.scrollLeft;previous=now;node.scrollLeft+=velocity*dt;velocity*=Math.pow(.9,dt/16);if(Math.abs(velocity)<.03||Math.abs(node.scrollLeft-before)<.2){stop();return;}frame.current=requestAnimationFrame(step);};
    frame.current=requestAnimationFrame(step);
  };
  const onClickCapture=(event:MouseEvent<HTMLDivElement>)=>{if(suppressClick.current&&event.detail>0){event.preventDefault();event.stopPropagation();suppressClick.current=false;}};
  return {onPointerDown,onPointerMove,onPointerUp:(event:PointerEvent<HTMLDivElement>)=>finish(event),onPointerCancel:(event:PointerEvent<HTMLDivElement>)=>finish(event,true),onClickCapture};
}
