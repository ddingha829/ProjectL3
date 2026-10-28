'use client';
import {useEffect} from 'react';

export default function useAppViewport(active:boolean,installedIos:boolean){
 useEffect(()=>{
  const root=document.documentElement,viewport=window.visualViewport;
  const update=()=>{
   const visibleHeight=viewport?.height||innerHeight,layoutHeight=Math.max(innerHeight,root.clientHeight||0),focused=document.activeElement as HTMLElement|null;
   const typing=focused?.tagName==='TEXTAREA'||focused?.isContentEditable||focused?.tagName==='INPUT'&&!['checkbox','radio','range','file','button','submit'].includes((focused as HTMLInputElement).type);
   const keyboard=Boolean(typing)&&(viewport?.scale||1)===1&&layoutHeight-visibleHeight>120;
   const frame=active&&!keyboard?document.querySelector<HTMLElement>('[data-app-chrome]')?.getBoundingClientRect():null;
   // The reported installed iPhone has a 793px layout on an 852px screen:
   // native space already separates the CSS bottom from the physical bottom.
   // Consume that space only against the extra safe-area inset; never extend
   // the CSS frame outside its actual viewport or treat the keyboard as space.
   const screen=window.screen,gap=screen?screen.height-layoutHeight:0;
   const nativeBottomSpace=active&&installedIos&&!keyboard&&innerHeight>innerWidth&&(viewport?.scale||1)===1&&screen&&Math.abs(screen.width-innerWidth)<4&&gap>0&&gap<=100?gap:0;
   root.style.setProperty('--un-native-bottom-space',`${nativeBottomSpace}px`);
   root.style.setProperty('--lab-vvh',`${frame?.height||visibleHeight}px`);
   root.style.setProperty('--lab-vvtop',`${frame?frame.top:viewport?.offsetTop||0}px`);
   // Normal app geometry is CSS inset:0, not a potentially stale/short visual
   // viewport height. These measurements are only used while a keyboard is up.
   // Keep glyphs below the installed iOS status-bar compositor as well as the
   // hardware safe area. This is separate from CSS backdrop blur on our dock.
   root.style.setProperty('--un-edge-clearance',installedIos&&innerHeight>innerWidth?'12px':'0px');
   root.dataset.labKeyboard=keyboard?'open':'closed';
  };
  if(active)root.dataset.unifiedShell='true';else delete root.dataset.unifiedShell;
  update();
  viewport?.addEventListener('resize',update);viewport?.addEventListener('scroll',update);
  window.addEventListener('resize',update);window.addEventListener('pageshow',update);window.addEventListener('focusin',update);window.addEventListener('focusout',update);
  return()=>{viewport?.removeEventListener('resize',update);viewport?.removeEventListener('scroll',update);window.removeEventListener('resize',update);window.removeEventListener('pageshow',update);window.removeEventListener('focusin',update);window.removeEventListener('focusout',update);delete root.dataset.unifiedShell;};
 },[active,installedIos]);
}
