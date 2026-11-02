'use client';
import {useCallback,useEffect,useState} from 'react';

/** Only the first app entrance waits for the logo; data fetching runs alongside. */
export function useStartupAnimation(){
 const [complete,setComplete]=useState(false);
 const finish=useCallback(()=>setComplete(true),[]);
 useEffect(()=>{
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const check=()=>{if(media.matches||document.documentElement.dataset.motion==='off')finish();};
  check();media.addEventListener('change',check);
  // Recover if the end event preceded hydration or animation is disabled by CSS.
  const timer=setTimeout(finish,2200);
  return()=>{clearTimeout(timer);media.removeEventListener('change',check);};
 },[finish]);
 return {complete,finish};
}
