'use client';
import {useEffect,useRef} from 'react';
import {getDialogSurface} from '@/lib/dialogIsolation';
const KEY='ticgleComposerBack';
/** One temporary same-document entry keeps Android Back inside the writer.
 * Each Back closes the top child sheet; the writer's own discard flow is retained. */
export function useComposerBackHistory(active:boolean,onClose:()=>void){
 const close=useRef(onClose);close.current=onClose;
 useEffect(()=>{
  if(!active)return;
  let disposed=false,armed=false,frame=0;const id=crypto.randomUUID();
  const arm=()=>{if(disposed||armed)return;history.pushState({...history.state,[KEY]:id},'');armed=true;};
  const pop=(event:PopStateEvent)=>{
   if(!armed||event.state?.[KEY]===id)return;
   event.stopImmediatePropagation();armed=false;
   const surface=getDialogSurface(),button=surface?.querySelector<HTMLButtonElement>(':scope > .quick-dialog-header > button');
   if(button)button.click();else close.current();
   frame=requestAnimationFrame(arm);
  };
  // Avoid history mutations during React StrictMode's discarded effect pass.
  frame=requestAnimationFrame(arm);window.addEventListener('popstate',pop,true);
  return()=>{disposed=true;cancelAnimationFrame(frame);window.removeEventListener('popstate',pop,true);if(armed&&history.state?.[KEY]===id)history.back();};
 },[active]);
}
