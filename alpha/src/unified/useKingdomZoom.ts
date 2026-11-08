'use client';
import {useRef,useState,type PointerEvent} from 'react';
export default function useKingdomZoom(){
 const root=useRef<HTMLDivElement>(null),[view,setView]=useState({scale:1,x:0,y:0}),live=useRef(view),points=useRef(new Map<number,{x:number;y:number}>()),start=useRef<{distance:number;cx:number;cy:number;scale:number;x:number;y:number}|null>(null),suppress=useRef(0);
 const apply=(scale:number,x:number,y:number)=>{const r=root.current?.getBoundingClientRect();scale=Math.max(1,Math.min(2.8,scale));const bx=(r?.width||0)*(scale-1)/2,by=(r?.height||0)*(scale-1)/2;const next={scale,x:Math.max(-bx,Math.min(bx,x)),y:Math.max(-by,Math.min(by,y))};live.current=next;setView(next);};
 const baseline=()=>{const p=[...points.current.values()];if(!p.length){start.current=null;return;}const a=p[0],b=p[1]||a;start.current={distance:Math.hypot(a.x-b.x,a.y-b.y),cx:(a.x+b.x)/2,cy:(a.y+b.y)/2,...live.current};};
 const down=(e:PointerEvent<HTMLDivElement>)=>{if(e.button!==0||(e.target as Element).closest('.kg-zoom-controls'))return;points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});baseline();};
 const move=(e:PointerEvent<HTMLDivElement>)=>{if(!points.current.has(e.pointerId)||!start.current)return;points.current.set(e.pointerId,{x:e.clientX,y:e.clientY});const p=[...points.current.values()],a=p[0],b=p[1]||a,s=start.current,cx=(a.x+b.x)/2,cy=(a.y+b.y)/2,dx=cx-s.cx,dy=cy-s.cy;
 if(p.length<2&&s.scale===1)return;if(p.length<2&&Math.hypot(dx,dy)<6)return;
 suppress.current=performance.now()+450;e.currentTarget.setPointerCapture(e.pointerId);
 const scale=p.length>1&&s.distance>0?Math.max(1,Math.min(2.8,s.scale*Math.hypot(a.x-b.x,a.y-b.y)/s.distance)):s.scale,r=root.current!.getBoundingClientRect(),ox=s.cx-r.left-r.width/2,oy=s.cy-r.top-r.height/2,ratio=scale/s.scale;
 apply(scale,s.x*ratio+ox*(1-ratio)+dx,s.y*ratio+oy*(1-ratio)+dy);
 };
 const end=(e:PointerEvent<HTMLDivElement>)=>{points.current.delete(e.pointerId);baseline();};
 return {root,view,zoom:(delta:number)=>{const s=live.current;apply(s.scale+delta,s.x,s.y);},reset:()=>apply(1,0,0),handlers:{onPointerDown:down,onPointerMove:move,onPointerUp:end,onPointerCancel:end,onLostPointerCapture:end,onClickCapture:(e:React.MouseEvent)=>{if(performance.now()<suppress.current){e.preventDefault();e.stopPropagation();}}}};
}
