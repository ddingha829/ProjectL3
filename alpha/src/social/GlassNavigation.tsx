'use client';
import type {CSSProperties} from 'react';
import {Grid2X2,BookOpen,Map} from 'lucide-react';

const destinations=[['today','오늘',Grid2X2],['library','로그북',BookOpen],['map','지도',Map]] as const;
type Screen=typeof destinations[number][0];
export default function GlassNavigation({screen,onNavigate,onCompose,desktop=false}:{screen:Screen;onNavigate:(screen:Screen)=>void;onCompose:()=>void;desktop?:boolean}){
 const index=destinations.findIndex(([key])=>key===screen);
 return <nav className={desktop?'lab-desktop-nav':'lab-bottom-nav'} aria-label={desktop?'주 메뉴':'모바일 주 메뉴'} data-material="glass">
  <div className="lab-nav-rail" style={{'--active-index':index} as CSSProperties}>
   <span className="lab-nav-lens" aria-hidden="true"/>
   {destinations.map(([key,label,Icon])=><button type="button" key={key} aria-current={screen===key?'page':undefined} onClick={()=>onNavigate(key)}><Icon size={23} strokeWidth={1.8}/><span>{label}</span></button>)}
  </div>
 </nav>;
}
