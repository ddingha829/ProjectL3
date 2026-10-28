'use client';
import {useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

/** One top-anchored visual-viewport frame for both pieces of app chrome. */
export default function UnifiedChrome({children}:{children:ReactNode}){
 const [mounted,setMounted]=useState(false),frame=useRef<HTMLDivElement>(null);
 useEffect(()=>setMounted(true),[]);
 useLayoutEffect(()=>{const element=frame.current;if(!mounted||!element)return;const measure=()=>{const root=document.documentElement;if(root.dataset.unifiedShell!=='true'||root.dataset.labKeyboard==='open')return;const rect=element.getBoundingClientRect();root.style.setProperty('--lab-vvh',`${rect.height}px`);root.style.setProperty('--lab-vvtop',`${rect.top}px`);};measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect();},[mounted]);
 return mounted?createPortal(<div ref={frame} className="un-viewport-chrome" data-app-chrome>{children}</div>,document.body):null;
}
