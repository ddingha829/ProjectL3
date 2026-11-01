'use client';
import {useEffect,useId,useRef,type ReactNode} from 'react';
import {AnimatePresence,motion} from 'motion/react';
import {useMotionPreference} from '@/lib/useMotionPreference';

export const INTERACTION_SPRING={type:'spring' as const,stiffness:400,damping:30};
export const OVERLAY_SPRING={type:'spring' as const,stiffness:300,damping:28};

export default function TactilePopover({
  label,
  open,
  onOpenChange,
  trigger,
  children,
  className='',
  active=false,
}:{
  label:string;
  open:boolean;
  onOpenChange:(open:boolean)=>void;
  trigger:ReactNode;
  children:(close:()=>void)=>ReactNode;
  className?:string;
  active?:boolean;
}){
  const id=useId(),anchor=useRef<HTMLDivElement>(null),button=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null);
  const reduced=useMotionPreference();
  const close=()=>{onOpenChange(false);button.current?.focus({preventScroll:true});};
  useEffect(()=>{
    if(!open)return;
    const frame=requestAnimationFrame(()=>panel.current?.querySelector<HTMLButtonElement>('[aria-pressed=true],button')?.focus({preventScroll:true}));
    const outside=(event:PointerEvent)=>{if(!anchor.current?.contains(event.target as Node))onOpenChange(false);};
    const keyboard=(event:KeyboardEvent)=>{
      if(event.key==='Escape'){
        event.preventDefault();
        onOpenChange(false);
        button.current?.focus({preventScroll:true});
      }
    };
    document.addEventListener('pointerdown',outside);
    document.addEventListener('keydown',keyboard);
    return()=>{
      cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown',outside);
      document.removeEventListener('keydown',keyboard);
    };
  },[open,onOpenChange]);

  return (
    <div className={`flc-popover ${className}`} ref={anchor}>
      <motion.button
        type="button"
        ref={button}
        className="flc-tool-trigger"
        aria-label={label}
        title={label}
        aria-expanded={open}
        aria-controls={open?id:undefined}
        data-active={active}
        whileTap={reduced?undefined:{scale:0.98}}
        whileHover={reduced?undefined:{scale:1.01}}
        transition={INTERACTION_SPRING}
        onClick={()=>onOpenChange(!open)}
      >
        {trigger}
      </motion.button>
      <AnimatePresence>
        {open&&(
          <motion.div
            key="popover-menu"
            className="flc-menu tactile-popover-menu"
            id={id}
            ref={panel}
            aria-label={label}
            initial={reduced?false:{opacity:0,scale:0.95,y:-6}}
            animate={reduced?undefined:{opacity:1,scale:1,y:0}}
            exit={reduced?undefined:{opacity:0,scale:0.96,y:-4}}
            transition={OVERLAY_SPRING}
            onKeyDown={e=>{
              if(e.key==='Tab'){
                const buttons=Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button')||[]),edge=e.shiftKey?buttons[0]:buttons.at(-1);
                if(document.activeElement===edge)onOpenChange(false);
              }
              const delta=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0;
              if(!delta)return;
              e.preventDefault();
              const buttons=Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button')||[]),index=buttons.indexOf(document.activeElement as HTMLButtonElement);
              buttons[(index+delta+buttons.length)%buttons.length]?.focus();
            }}
          >
            {children(close)}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
