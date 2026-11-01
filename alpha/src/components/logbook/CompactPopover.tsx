'use client';
import {useEffect,useId,useRef,type KeyboardEvent,type ReactNode,type RefObject} from 'react';
import {AnimatePresence,motion,useIsPresent} from 'motion/react';
import {useMotionPreference} from '@/lib/useMotionPreference';
import {INTERACTION_SPRING,OVERLAY_SPRING,instantMotion} from '@/lib/surfaceMotion';
import {leavePopover,popoverItems} from './popoverFocus';

function PopoverSurface({id,label,panel,onKeyDown,children}:{id:string;label:string;panel:RefObject<HTMLDivElement|null>;onKeyDown:(event:KeyboardEvent<HTMLDivElement>)=>void;children:ReactNode}){
 const present=useIsPresent(),reduced=useMotionPreference();
 return <motion.div id={id} ref={panel} role="group" aria-label={label} aria-hidden={!present} inert={!present} data-motion-popover className="flc-menu"
  initial={reduced?false:{opacity:0,scale:.97,y:-4}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:.98,y:-3}}
  transition={reduced?instantMotion:OVERLAY_SPRING} onKeyDown={onKeyDown}>{children}</motion.div>;
}

export default function CompactPopover({label,open,onOpenChange,trigger,children,className='',active=false}:{label:string;open:boolean;onOpenChange:(open:boolean)=>void;trigger:ReactNode;children:(close:()=>void)=>ReactNode;className?:string;active?:boolean}){
 const id=useId(),anchor=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null),entry=useRef<'first'|'last'|'selected'>('selected');
 const reduced=useMotionPreference();
 const close=()=>{onOpenChange(false);button.current?.focus({preventScroll:true});};
 useEffect(()=>{
  if(!open)return;
  const frame=requestAnimationFrame(()=>{
   const items=popoverItems(panel.current),selected=items.find(item=>item.getAttribute('aria-pressed')==='true'||item.getAttribute('aria-checked')==='true');
   (entry.current==='last'?items.at(-1):entry.current==='first'?items[0]:selected||items[0])?.focus({preventScroll:true});entry.current='selected';
  });
  const outside=(event:PointerEvent)=>{if(!anchor.current?.contains(event.target as Node))onOpenChange(false);};
  const focusOutside=(event:FocusEvent)=>{if(!anchor.current?.contains(event.target as Node))onOpenChange(false);};
  document.addEventListener('pointerdown',outside);document.addEventListener('focusin',focusOutside);
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('pointerdown',outside);document.removeEventListener('focusin',focusOutside);};
 },[open,onOpenChange]);
 const keyboard=(event:KeyboardEvent<HTMLDivElement>)=>{
  if(event.key==='Escape'){event.preventDefault();event.stopPropagation();close();return;}
  const items=popoverItems(panel.current),index=items.indexOf(document.activeElement as HTMLElement);
  if(event.key==='Tab'){
   if(index===(event.shiftKey?0:items.length-1)){
    event.preventDefault();leavePopover(panel.current,button.current,event.shiftKey);onOpenChange(false);
   }
   return;
  }
  const delta=event.key==='ArrowDown'?1:event.key==='ArrowUp'?-1:0;
  if(!delta&&event.key!=='Home'&&event.key!=='End')return;
  event.preventDefault();
  items[event.key==='Home'?0:event.key==='End'?items.length-1:(index+delta+items.length)%items.length]?.focus({preventScroll:true});
 };
 return <div className={`flc-popover ${className}`} ref={anchor}>
  <motion.button type="button" ref={button} className="flc-tool-trigger" aria-label={label} title={label} aria-expanded={open} aria-controls={open?id:undefined} data-active={active}
   whileTap={reduced?undefined:{scale:.98}} whileHover={reduced?undefined:{scale:1.01}} transition={reduced?instantMotion:INTERACTION_SPRING}
   onClick={()=>onOpenChange(!open)} onKeyDown={event=>{
    if(event.key==='Escape'&&open){event.preventDefault();event.stopPropagation();close();return;}
    if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;
    event.preventDefault();entry.current=event.key==='ArrowUp'?'last':'first';
    if(open){const items=popoverItems(panel.current);(entry.current==='last'?items.at(-1):items[0])?.focus({preventScroll:true});}else onOpenChange(true);
   }}>{trigger}</motion.button>
  <AnimatePresence initial={false}>{open&&<PopoverSurface key="menu" id={id} label={label} panel={panel} onKeyDown={keyboard}>{children(close)}</PopoverSurface>}</AnimatePresence>
 </div>;
}
