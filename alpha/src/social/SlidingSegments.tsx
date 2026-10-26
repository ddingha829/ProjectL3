'use client';
import {useLayoutEffect,useRef,useState,type CSSProperties} from 'react';
import './InteractionPolish.css';

/** Sliding Tabs pattern, using the existing CSS stack instead of another runtime. */
export default function SlidingSegments<T extends string>({value,options,onChange,label,className=''}:{value:T;options:readonly {id:T;label:string}[];onChange:(value:T)=>void;label:string;className?:string}){
 const root=useRef<HTMLDivElement>(null),[indicator,setIndicator]=useState<{left:number;width:number}|null>(null),seen=useRef(false);
 useLayoutEffect(()=>{const node=root.current;if(!node)return;let active=true;
  const measure=()=>{const selected=node.querySelector<HTMLButtonElement>('[aria-pressed=true]');if(!selected)return;const next={left:selected.offsetLeft,width:selected.offsetWidth};setIndicator(previous=>previous?.left===next.left&&previous.width===next.width?previous:next);};
  measure();const observer=new ResizeObserver(measure);observer.observe(node);node.querySelectorAll('button').forEach(button=>observer.observe(button));document.fonts.ready.then(()=>{if(active)measure();});
  return()=>{active=false;observer.disconnect();};
 },[value,options.length]);
 useLayoutEffect(()=>{if(indicator)seen.current=true;},[indicator]);
 return <div ref={root} role="group" aria-label={label} className={`lab-segment lab-sliding-segments ${className}`} data-indicator-ready={Boolean(indicator)} onKeyDown={event=>{
  if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)||!(event.target instanceof HTMLButtonElement))return;event.preventDefault();const index=options.findIndex(option=>option.id===value),next=event.key==='Home'?0:event.key==='End'?options.length-1:(index+(event.key==='ArrowRight'?1:-1)+options.length)%options.length;onChange(options[next].id);root.current?.querySelectorAll('button')[next]?.focus();
 }}>
  {indicator&&<span className={`lab-sliding-indicator ${seen.current?'is-set':''}`} aria-hidden="true" style={{transform:`translate3d(${indicator.left}px,0,0)`,width:indicator.width} as CSSProperties}/>}
  {options.map(option=><button key={option.id} type="button" aria-pressed={value===option.id} onClick={()=>onChange(option.id)}>{option.label}</button>)}
 </div>;
}
