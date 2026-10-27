'use client';
import {useEffect,useState,type CSSProperties} from 'react';
import {createPortal} from 'react-dom';
import {Grid2X2,GalleryVerticalEnd,Map,Palette,Plus} from 'lucide-react';
import {destinations,type Destination} from './store';
const icons={logs:GalleryVerticalEnd,map:Map,mosaic:Grid2X2,studio:Palette};
export default function UnifiedNavigation({active,onChange,onCompose}:{active:Destination;onChange:(value:Destination)=>void;onCompose:()=>void}){
 const [mounted,setMounted]=useState(false);
 useEffect(()=>setMounted(true),[]);
 // The dock belongs to the viewport, outside each page's height and transforms.
 return mounted?createPortal(<nav className="lab-bottom-nav un-navigation" aria-label="주 메뉴" data-material="glass"><button type="button" className="un-dock-add" aria-label="새 로그 남기기" onClick={onCompose}><Plus size={27} strokeWidth={1.8}/></button><div className="lab-nav-rail" style={{'--active-index':destinations.findIndex(([id])=>id===active),'--nav-count':destinations.length} as CSSProperties}><span className="lab-nav-lens" aria-hidden="true"/>{destinations.map(([id,label])=>{const Icon=icons[id];return <button type="button" key={id} aria-current={active===id?'page':undefined} onClick={()=>onChange(id)}><Icon size={22} strokeWidth={1.7}/><span>{label}</span></button>;})}</div></nav>,document.body):null;
}
