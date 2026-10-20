'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { allowsMotion, MOTION_EVENT } from '@/lib/motion';
import './CardDepth.css';

/** The depth plane is outside the capture node; exported cards stay flat and transparent. */
export default function CardDepth({ children }: { children: ReactNode }) {
  const ref=useRef<HTMLDivElement>(null),frame=useRef(0),animation=useRef<Animation|null>(null);
  const start=useRef<{x:number;y:number;time:number}|null>(null);
  const reset=()=>{const el=ref.current;if(!el)return;el.style.setProperty('--depth-x','0deg');el.style.setProperty('--depth-y','0deg');el.dataset.active='false';};
  const tap=()=>{
    const el=ref.current;if(!el||!allowsMotion())return;
    animation.current?.cancel();reset();el.dataset.active='true';
    animation.current=el.animate([{transform:'perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)'},{transform:'perspective(1200px) rotateX(-4deg) rotateY(6deg) scale(1.018)',offset:.24},{transform:'perspective(1200px) rotateX(2deg) rotateY(-2deg) scale(1.006)',offset:.64},{transform:'perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)'}],{duration:720,easing:'cubic-bezier(.2,.75,.2,1)'});
    animation.current.id='card-depth-tap';animation.current.onfinish=reset;
  };
  useEffect(()=>{const stop=()=>{if(!allowsMotion()){animation.current?.cancel();reset();}};window.addEventListener(MOTION_EVENT,stop);return()=>{window.removeEventListener(MOTION_EVENT,stop);cancelAnimationFrame(frame.current);animation.current?.cancel();};},[]);
  return <div ref={ref} className="card-depth" data-active="false" tabIndex={0} role="group" aria-label="카드 미리보기. 누르거나 Enter 키로 입체 효과 보기."
    onPointerDown={event=>{start.current={x:event.clientX,y:event.clientY,time:Date.now()};}}
    onPointerMove={event=>{
      if(event.pointerType!=='mouse'||!allowsMotion())return;
      const el=ref.current;if(!el||animation.current?.playState==='running')return;
      const r=el.getBoundingClientRect(),x=Math.max(-1,Math.min(1,(event.clientX-r.left)/r.width*2-1)),y=Math.max(-1,Math.min(1,(event.clientY-r.top)/r.height*2-1));
      cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(()=>{el.dataset.active='true';el.style.setProperty('--depth-x',`${-y*5}deg`);el.style.setProperty('--depth-y',`${x*6}deg`);el.style.setProperty('--depth-light-x',`${(x+1)*50}%`);el.style.setProperty('--depth-light-y',`${(y+1)*50}%`);});
    }}
    onPointerUp={event=>{const p=start.current;start.current=null;if(p&&Math.hypot(event.clientX-p.x,event.clientY-p.y)<12&&Date.now()-p.time<650)tap();}}
    onPointerLeave={()=>{start.current=null;cancelAnimationFrame(frame.current);if(animation.current?.playState!=='running')reset();}}
    onPointerCancel={()=>{start.current=null;reset();}}
    onKeyDown={event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();tap();}}}
    onBlur={reset}>
    {children}<span className="card-depth-light" aria-hidden="true"/>
  </div>;
}
