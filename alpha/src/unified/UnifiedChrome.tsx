'use client';
import {useEffect,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';

/** One top-anchored visual-viewport frame for both pieces of app chrome. */
export default function UnifiedChrome({children}:{children:ReactNode}){
 const [mounted,setMounted]=useState(false);
 useEffect(()=>setMounted(true),[]);
 return mounted?createPortal(<div className="un-viewport-chrome" data-app-chrome>{children}</div>,document.body):null;
}
