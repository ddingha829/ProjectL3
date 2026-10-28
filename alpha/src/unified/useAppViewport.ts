'use client';
import {useEffect} from 'react';

export default function useAppViewport(active:boolean,installedIos:boolean){
 useEffect(()=>{
  const root=document.documentElement,viewport=window.visualViewport;
  const update=()=>{
   const visibleHeight=viewport?.height||innerHeight,layoutHeight=Math.max(innerHeight,root.clientHeight||0),keyboard=layoutHeight-visibleHeight>120;
   root.style.setProperty('--lab-vvh',`${viewport?.height||innerHeight}px`);
   root.style.setProperty('--lab-vvtop',`${viewport?.offsetTop||0}px`);
   // Installed iOS can already exclude the home-indicator inset from its visual
   // viewport. Deduct that exclusion before applying CSS safe-area clearance.
   const consumedBottom=installedIos&&!keyboard&&(viewport?.scale||1)===1?Math.max(0,layoutHeight-visibleHeight-(viewport?.offsetTop||0)):0;
   root.style.setProperty('--un-bottom-inset-consumed',`${consumedBottom}px`);
   // Keep glyphs below the installed iOS status-bar compositor as well as the
   // hardware safe area. This is separate from CSS backdrop blur on our dock.
   root.style.setProperty('--un-edge-clearance',installedIos&&innerHeight>innerWidth?'12px':'0px');
   root.dataset.labKeyboard=keyboard?'open':'closed';
  };
  if(active)root.dataset.unifiedShell='true';else delete root.dataset.unifiedShell;
  update();
  viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);
  window.addEventListener('resize',update);window.addEventListener('pageshow',update);
  return()=>{viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);window.removeEventListener('resize',update);window.removeEventListener('pageshow',update);delete root.dataset.unifiedShell;};
 },[active,installedIos]);
}
