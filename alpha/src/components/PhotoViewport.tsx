'use client';
import {useRef, type CSSProperties, type ReactNode, type RefObject} from 'react';
import {photoCrop,movePhoto,clampZoom,type PhotoCrop,type PhotoFit} from '@/lib/photoCrop';
interface Props {
 src:string;alt:string;crop:PhotoCrop;defaultFit?:PhotoFit;editing?:boolean;disabled?:boolean;
 className?:string;style?:CSSProperties;hidden?:boolean;children?:ReactNode;
 imageFilter?:string;
 viewportRef?:RefObject<HTMLDivElement|null>;onChange?:(crop:PhotoCrop)=>void;
}
export default function PhotoViewport(p:Props){
 const ownRef=useRef<HTMLDivElement>(null),imageRef=useRef<HTMLImageElement>(null);
 const gesture=useRef<{id:number;x:number;y:number;crop:PhotoCrop}|null>(null);
 const crop=photoCrop(p.crop),fit=crop.photoFit||p.defaultFit||'cover',editable=p.editing&&!p.disabled&&Boolean(p.onChange);
 const move=(initial:PhotoCrop,dx:number,dy:number)=>{const image=imageRef.current,box=(p.viewportRef||ownRef).current?.getBoundingClientRect();if(!image?.naturalWidth||!box)return initial;return movePhoto(initial,box,{width:image.naturalWidth,height:image.naturalHeight},fit,dx,dy);};
 const end=(event:React.PointerEvent<HTMLDivElement>,cancel=false)=>{const drag=gesture.current;if(!drag||drag.id!==event.pointerId)return;gesture.current=null;if(event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.releasePointerCapture(event.pointerId);if(cancel)p.onChange?.(drag.crop);};
 return <div ref={p.viewportRef||ownRef} hidden={p.hidden} className={p.className} style={{...p.style,...(editable?{touchAction:'none',cursor:'grab'}:{})}} data-crop-interactive={editable?'true':undefined} role={editable?'group':undefined} aria-label={editable?'사진 위치 조정. 드래그하거나 방향키를 사용하세요.':undefined} tabIndex={editable?0:undefined}
 onClick={event=>{if(editable)event.stopPropagation();}}
 onPointerDown={event=>{if(!editable||!event.isPrimary||event.button!==0||(event.target as HTMLElement).closest('button,input'))return;event.preventDefault();event.stopPropagation();event.currentTarget.focus({preventScroll:true});gesture.current={id:event.pointerId,x:event.clientX,y:event.clientY,crop};event.currentTarget.setPointerCapture(event.pointerId);}}
 onPointerMove={event=>{const drag=gesture.current;if(!drag||drag.id!==event.pointerId)return;event.preventDefault();event.stopPropagation();p.onChange?.(move(drag.crop,event.clientX-drag.x,event.clientY-drag.y));}}
 onPointerUp={event=>end(event)} onPointerCancel={event=>end(event,true)} onLostPointerCapture={event=>{if(gesture.current?.id===event.pointerId)end(event,true);}}
 onKeyDown={event=>{if(!editable||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;event.preventDefault();event.stopPropagation();const step=event.shiftKey?15:4;p.onChange?.(move(crop,event.key==='ArrowLeft'?-step:event.key==='ArrowRight'?step:0,event.key==='ArrowUp'?-step:event.key==='ArrowDown'?step:0));}}>
 {p.src&&<img ref={imageRef} src={p.src} alt={p.alt} draggable={false} style={{filter:p.imageFilter,objectFit:fit,objectPosition:`${crop.cropX}% ${crop.cropY}%`,transform:`scale(${clampZoom(crop.cropZoom)})`,transformOrigin:`${crop.cropX}% ${crop.cropY}%`,pointerEvents:'none'}}/>}{p.children}
 </div>;
}
