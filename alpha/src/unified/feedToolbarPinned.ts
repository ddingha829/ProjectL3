/** Track the toolbar's real scroll owner, including the initial app-shell layout. */
export function watchFeedToolbarPinned(marker:HTMLElement,bar:HTMLElement,onChange:(pinned:boolean)=>void){
 const owner=bar.closest<HTMLElement>('[data-app-scroll]'),viewport=window.visualViewport;
 let frame=0,disposed=false;
 const update=()=>{
  frame=0;if(disposed)return;
  // Child effects can run before the app installs its header/safe-area layout.
  // A temporary sticky inset must never count as a user/content scroll.
  const offset=owner?owner.scrollTop:window.scrollY;
  if(offset<=1){onChange(false);return;}
  const edge=(parseFloat(getComputedStyle(bar).top)||0)+(owner?.getBoundingClientRect().top||0);
  onChange(marker.getBoundingClientRect().top<edge-.5);
 };
 const schedule=()=>{if(!disposed&&!frame)frame=requestAnimationFrame(update);};
 update();schedule();
 owner?.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('scroll',schedule,{passive:true});
 window.addEventListener('resize',schedule);window.addEventListener('pageshow',schedule);
 window.addEventListener('l2:app-frame-change',schedule);
 viewport?.addEventListener('resize',schedule);viewport?.addEventListener('scroll',schedule);
 const observer=new ResizeObserver(schedule);
 observer.observe(bar);if(owner)observer.observe(owner);
 return()=>{
  disposed=true;cancelAnimationFrame(frame);observer.disconnect();
  owner?.removeEventListener('scroll',schedule);window.removeEventListener('scroll',schedule);
  window.removeEventListener('resize',schedule);window.removeEventListener('pageshow',schedule);
  window.removeEventListener('l2:app-frame-change',schedule);
  viewport?.removeEventListener('resize',schedule);viewport?.removeEventListener('scroll',schedule);
 };
}
