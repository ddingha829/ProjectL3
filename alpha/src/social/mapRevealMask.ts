import {mapRegionMask} from './mapRegions';
export type MaskRect={x:number;y:number;width:number;height:number};
export const containsMaskViewport=(frame:MaskRect,view:MaskRect)=>view.x>=frame.x&&view.y>=frame.y&&view.x+view.width<=frame.x+frame.width&&view.y+view.height<=frame.y+frame.height;
export const paddedMaskFrame=(view:MaskRect):MaskRect=>({x:view.x-256,y:view.y-256,width:view.width+512,height:view.height+512});
/** Keep a decoded, overscanned mask stationary in Leaflet layer coordinates.
 * Ordinary dragging moves the pane; it must not replace the CSS image URL.
 * A replacement is decoded before committing its image and frame together. */
export function createMapRevealMask(pane:HTMLElement){
 const window=document.createElement('div');window.className='scratch-reveal-window';Object.assign(window.style,{position:'absolute',visibility:'hidden',maskSize:'100% 100%',maskRepeat:'no-repeat'});pane.append(window);
 let active:{key:string;rect:MaskRect}|undefined,pending:{key:string;rect:MaskRect;image:HTMLImageElement}|undefined,disposed=false,commits=0;
 const align=()=>{if(!active)return;for(const child of Array.from(window.children) as HTMLElement[])Object.assign(child.style,{left:`${-active.rect.x}px`,top:`${-active.rect.y}px`});};
 const cancel=()=>{if(pending){pending.image.onload=null;pending.image.onerror=null;pending.image.removeAttribute('src');pending=undefined;}};
 return {
  update(key:string,view:MaskRect,path:()=>string){
   if(disposed)return;
   for(const child of Array.from(pane.children))if(child!==window)window.append(child);align();
   if(active?.key===key&&containsMaskViewport(active.rect,view)){if(pending)cancel();return;}
   if(pending?.key===key&&containsMaskViewport(pending.rect,view))return;
   cancel();const rect=paddedMaskFrame(view),geometry=path(),mask=mapRegionMask(geometry,rect.x,rect.y,rect.width,rect.height),image=new Image(),request={key,rect,image};pending=request;
   const commit=(feather:boolean)=>{
    if(disposed||pending!==request||!pane.isConnected)return;
    // The old image/frame remain untouched until this replacement is ready.
    active={key,rect};Object.assign(window.style,{left:`${rect.x}px`,top:`${rect.y}px`,width:`${rect.width}px`,height:`${rect.height}px`});align();
    window.style.maskImage=feather?mask:'none';window.style.setProperty('-webkit-mask-image',feather?mask:'none');pane.style.clipPath=feather?'none':`path("${geometry||'M 0 0'}")`;window.style.visibility='visible';window.dataset.maskCommits=String(++commits);
    image.onload=null;image.onerror=null;pending=undefined;
   };
   image.onload=()=>commit(true);image.onerror=()=>commit(false);image.src=mask.slice(5,-2);
  },
  dispose(){disposed=true;cancel();window.remove();},
 };
}
