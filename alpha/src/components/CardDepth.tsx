'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { allowsMotion, MOTION_EVENT } from '@/lib/motion';
import './CardDepth.css';

/** The depth plane is outside the capture node; exported cards stay flat and transparent. */
export default function CardDepth({ children, onActivate, expanded }: { children: ReactNode; onActivate?: () => void; expanded?: boolean }) {
  const ref=useRef<HTMLDivElement>(null),frame=useRef(0),animation=useRef<Animation|null>(null);
  const start=useRef<{x:number;y:number;time:number}|null>(null);
  const clickReady=useRef(false);
  const reset=()=>{const el=ref.current;if(!el)return;el.style.setProperty('--depth-x','0deg');el.style.setProperty('--depth-y','0deg');el.dataset.active='false';};
  const tap=()=>{
    const el=ref.current;if(!el||!allowsMotion())return;
    animation.current?.cancel();reset();el.dataset.active='true';
    animation.current=el.animate([{transform:'perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)'},{transform:'perspective(1200px) rotateX(-4deg) rotateY(6deg) scale(1.018)',offset:.24},{transform:'perspective(1200px) rotateX(2deg) rotateY(-2deg) scale(1.006)',offset:.64},{transform:'perspective(1200px) rotateX(0deg) rotateY(0deg) scale(1)'}],{duration:720,easing:'cubic-bezier(.2,.75,.2,1)'});
    animation.current.id='card-depth-tap';animation.current.onfinish=reset;
  };
  const activate=()=>{tap();onActivate?.();};
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const stop=()=>{if(!allowsMotion()){animation.current?.cancel();reset();}if(ref.current)ref.current.dataset.paused=String(document.hidden);};
    stop();window.addEventListener(MOTION_EVENT,stop);media.addEventListener('change',stop);document.addEventListener('visibilitychange',stop);
    return()=>{window.removeEventListener(MOTION_EVENT,stop);media.removeEventListener('change',stop);document.removeEventListener('visibilitychange',stop);cancelAnimationFrame(frame.current);animation.current?.cancel();};
  },[]);
  return <div ref={ref} className="card-depth" data-active="false" tabIndex={0} role={onActivate?'button':'group'} aria-expanded={onActivate?expanded:undefined} aria-controls={onActivate?'record-design-panel':undefined} aria-label={onActivate?expanded?'카드 수정 메뉴 접기':'카드 수정 메뉴 열기':'천천히 움직이는 입체 카드 미리보기'}
    onPointerDown={event=>{clickReady.current=false;if(!event.isPrimary||event.button!==0){start.current=null;return;}start.current={x:event.clientX,y:event.clientY,time:Date.now()};event.currentTarget.dataset.pressed='true';}}
    onPointerMove={event=>{
      const p=start.current;if(p&&Math.hypot(event.clientX-p.x,event.clientY-p.y)>10)start.current=null;
      if(event.pointerType!=='mouse'||!allowsMotion())return;
      const el=ref.current;if(!el||animation.current?.playState==='running')return;
      const r=el.getBoundingClientRect(),x=Math.max(-1,Math.min(1,(event.clientX-r.left)/r.width*2-1)),y=Math.max(-1,Math.min(1,(event.clientY-r.top)/r.height*2-1));
      cancelAnimationFrame(frame.current);frame.current=requestAnimationFrame(()=>{el.dataset.active='true';el.style.setProperty('--depth-x',`${-y*5}deg`);el.style.setProperty('--depth-y',`${x*6}deg`);el.style.setProperty('--depth-light-x',`${(x+1)*50}%`);el.style.setProperty('--depth-light-y',`${(y+1)*50}%`);});
    }}
    onPointerUp={event=>{const p=start.current;start.current=null;event.currentTarget.dataset.pressed='false';clickReady.current=Boolean(event.isPrimary&&p&&Math.hypot(event.clientX-p.x,event.clientY-p.y)<10&&Date.now()-p.time<650);}}
    // Activate on the native click, after pointerup: resizing on pointerup can retarget
    // the compatibility click onto the drawer handle and immediately toggle it back.
    onClick={event=>{if(clickReady.current||event.detail===0){clickReady.current=false;activate();}}}
    onPointerLeave={event=>{start.current=null;event.currentTarget.dataset.pressed='false';cancelAnimationFrame(frame.current);if(animation.current?.playState!=='running')reset();}}
    onPointerCancel={event=>{start.current=null;clickReady.current=false;event.currentTarget.dataset.pressed='false';reset();}}
    onKeyDown={event=>{if((event.key==='Enter'||event.key===' ')&&!event.repeat){event.preventDefault();activate();}}}
    onBlur={reset}>
    <div className="card-depth-float">{children}<span className="card-depth-light" aria-hidden="true"/></div>
  </div>;
}
