/** The unified app owns scrolling below its chrome; other pages use the window. */
export function pageScrollPosition(){
 const root=document.querySelector<HTMLElement>('[data-app-scroll]');
 return root?{top:root.scrollTop,left:root.scrollLeft}:{top:window.scrollY,left:window.scrollX};
}
export function scrollPageTo(options:ScrollToOptions){
 const root=document.querySelector<HTMLElement>('[data-app-scroll]');
 if(root)root.scrollTo(options);else window.scrollTo(options);
}
