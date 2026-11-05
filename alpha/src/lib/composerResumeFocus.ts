/** Drop only the composer's editable focus when leaving and returning to the app. */
export function watchComposerResumeFocus(root:()=>HTMLElement|null){
 let background=false,frame=0;
 const blur=()=>{const element=document.activeElement;if(element instanceof HTMLElement&&element.matches('input,textarea,[contenteditable=true]')&&root()?.contains(element))element.blur();};
 const leave=()=>{background=true;blur();};
 const resume=()=>{if(!background||document.visibilityState==='hidden')return;background=false;blur();cancelAnimationFrame(frame);frame=requestAnimationFrame(blur);};
 const visibility=()=>document.visibilityState==='hidden'?leave():resume();
 document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',leave);window.addEventListener('pageshow',resume);window.addEventListener('focus',resume);
 return()=>{cancelAnimationFrame(frame);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',leave);window.removeEventListener('pageshow',resume);window.removeEventListener('focus',resume);};
}
