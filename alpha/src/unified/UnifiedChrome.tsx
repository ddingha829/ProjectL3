'use client';
import {useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

/** Shared document canvas for the header and transparent floating dock. */
export default function UnifiedChrome({children}:{children:ReactNode}){
 const [mounted,setMounted]=useState(false),frame=useRef<HTMLDivElement>(null);
 useEffect(()=>setMounted(true),[]);
 useLayoutEffect(()=>{const element=frame.current;if(!mounted||!element)return;const measure=()=>{const root=document.documentElement;if(root.dataset.unifiedShell!=='true'||root.dataset.labKeyboard==='open')return;window.dispatchEvent(new Event('l2:app-frame-change'));};measure();const observer=new ResizeObserver(measure);observer.observe(element);return()=>observer.disconnect();},[mounted]);
 return mounted?createPortal(<div ref={frame} className="un-viewport-chrome" data-app-chrome>{children}</div>,document.body):null;
}
