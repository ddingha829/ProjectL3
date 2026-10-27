'use client';
import {useEffect,useId,useLayoutEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {isolateDialog} from '@/lib/dialogIsolation';
import {ArrowLeft,ArrowRight,Check} from 'lucide-react';
import './FirstUseGuide.css';

export type GuideContext='today'|'library'|'map'|'studio'|'compose'|'detail'|'own-detail'|'mosaic';
export const GUIDE_KEY='l2_unified_ui_guides_v1';
type Seen=Partial<Record<GuideContext|'all',boolean>>;
type Step={targets:string[];title:string;body:string};
type Rect={left:number;top:number;width:number;height:number};
const copy:Record<Exclude<GuideContext,'detail'|'own-detail'>,Step[]>={
 mosaic:[{targets:['.mosaic-frame','.mosaic-tray'],title:'취향을 한 칸씩',body:'아래 작품 타일을 골라 빈 칸에 놓아보세요. 위로 끌어 놓아도 좋아요.'}],
 studio:[{targets:['.un-studio-tools'],title:'내 카드의 분위기',body:'카드를 보며 디자인과 색을 골라요. 마음에 들면 프리셋으로 저장하세요.'}],
 today:[{targets:['.un-navigation .lab-nav-rail'],title:'가볍게 남겨보세요',body:'＋로 순간을 기록하고, 카드를 눌러 다시 꺼내봐요. 로고 옆에서 마이로그와 모임을 바꿀 수 있어요.'}],
 library:[{targets:['.flc-shell'],title:'다시 찾고 싶은 기록',body:'검색과 필터로 기록을 찾아요. 보기 버튼으로 카드·목록·캘린더를 바꿔보세요.'}],
 map:[{targets:['.lab-map-panel'],title:'기록이 동네의 색으로',body:'장소를 남기면 지도가 컬러로 채워져요. 흰 점을 눌러 그곳의 로그를 만나보세요.'}],
 compose:[{targets:['.un-entry-options','.lab-story-stage','.lab-write-surface'],title:'오늘은 어떻게 남길까요?',body:'사진·작품·글 중 편한 방식으로 남겨요. 등록할 때 함께 나눌 모임을 고를 수 있어요.'}],
};
function readSeen():Seen{try{const value=JSON.parse(localStorage.getItem(GUIDE_KEY)||'{}'),seen:Seen={};for(const key of ['today','library','map','studio','compose','detail','own-detail','mosaic','all'] as const)if(value?.[key]===true)seen[key]=true;return seen;}catch{return {};}}

export default function FirstUseGuide({context,replay,owned,shared,pending=false,onActiveChange}:{context:GuideContext|null;replay:number;owned:boolean;shared:boolean;pending?:boolean;onActiveChange:(active:boolean)=>void}){
 const [seen,setSeen]=useState<Seen>({}),[ready,setReady]=useState(false),[settledContext,setSettledContext]=useState<GuideContext|null>(null),previousReplay=useRef(replay);
 useEffect(()=>{setSeen(readSeen());setReady(true);},[]);
 // Let the underlying modal finish its focus/inert setup before placing a tour above it.
 useEffect(()=>{let frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>setSettledContext(context));});return()=>cancelAnimationFrame(frame);},[context]);
 useEffect(()=>{if(previousReplay.current===replay)return;previousReplay.current=replay;setSeen({});try{localStorage.removeItem(GUIDE_KEY);}catch{}},[replay]);
 const active=Boolean(ready&&context&&settledContext===context&&!seen.all&&!seen[context]);
 useEffect(()=>{onActiveChange(active);return()=>onActiveChange(false);},[active,onActiveChange]);
 const finish=(all=false)=>{if(!context)return;const next={...seen,[all?'all':context]:true,...(!all&&context==='own-detail'?{detail:true}:{})};setSeen(next);try{localStorage.setItem(GUIDE_KEY,JSON.stringify(next));}catch{}};
 const detail:Step[]=[{targets:['.un-detail-card','.un-viewer-action-bar'],title:'한 장을 더 깊이',body:owned?'사진 카드를 다시 누르면 뒷면이 보여요. 아래에서 댓글·공유를, 더보기에서 수정을 할 수 있어요.':'사진 카드를 다시 누르면 뒷면이 보여요. 아래에서 공감하거나 한마디를 남겨보세요.'}];
 return active&&context?<GuideOverlay key={`${replay}:${context}`} steps={context==='detail'||context==='own-detail'?detail:copy[context]} onDone={()=>finish()} onSkip={()=>finish(true)}/>:null;
}

function GuideOverlay({steps,onDone,onSkip}:{steps:Step[];onDone:()=>void;onSkip:()=>void}){
 const [index,setIndex]=useState(0),[geometry,setGeometry]=useState<{rects:Rect[];left:number;top:number;width:number;maxHeight:number}|null>(null);
 const overlay=useRef<HTMLDivElement>(null),panel=useRef<HTMLDivElement>(null),next=useRef<HTMLButtonElement>(null),titleId=useId(),bodyId=useId(),actions=useRef({onSkip,onDone,index});actions.current={onSkip,onDone,index};
 const advance=()=>index===steps.length-1?onDone():setIndex(index+1);
 useEffect(()=>{
  const previous=document.activeElement instanceof HTMLElement?document.activeElement:null,top=scrollY,left=scrollX;
  const positions=Array.from(document.querySelectorAll<HTMLElement>('.lab-detail-dialog,.lab-compose-dialog')).map(el=>({el,top:el.scrollTop}));
  const releaseIsolation=overlay.current?isolateDialog(overlay.current):()=>{};next.current?.focus({preventScroll:true});
  const keyboard=(e:KeyboardEvent)=>{
   if(e.key==='Escape'){e.preventDefault();e.stopImmediatePropagation();actions.current.onSkip();return;}
   if(e.key==='Tab'){
    const buttons=Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button:not([disabled])')||[]),first=buttons[0],last=buttons.at(-1);
    if(e.shiftKey&&(document.activeElement===first||!panel.current?.contains(document.activeElement))){e.preventDefault();last?.focus();}
    else if(!e.shiftKey&&(document.activeElement===last||!panel.current?.contains(document.activeElement))){e.preventDefault();first?.focus();}
   }
  };
  document.addEventListener('keydown',keyboard,true);
  return()=>{document.removeEventListener('keydown',keyboard,true);releaseIsolation();positions.forEach(({el,top})=>{if(el.isConnected)el.scrollTop=top;});window.scrollTo({top,left,behavior:'instant'});queueMicrotask(()=>{if(previous?.isConnected&&!previous.closest('[inert]'))previous.focus({preventScroll:true});});};
 },[]);
 useLayoutEffect(()=>{
  let frame=0,tries=0,scrolled=false,observer:ResizeObserver|undefined;
  const measure=()=>{
   const visible=steps[index].targets.flatMap(selector=>Array.from(document.querySelectorAll<HTMLElement>(selector))).filter(el=>el.getClientRects().length&&el.getBoundingClientRect().width>0);
   if(!visible.length&&tries++<60){frame=requestAnimationFrame(measure);return;}
   const viewport=window.visualViewport,vLeft=viewport?.offsetLeft||0,vTop=viewport?.offsetTop||0,w=viewport?.width||innerWidth,h=viewport?.height||innerHeight;
   if(!scrolled){scrolled=true;const first=visible[0];if(first){const r=first.getBoundingClientRect();if(r.top<vTop+8||r.top>vTop+h-60)first.scrollIntoView({block:'nearest',behavior:'instant'});}}
   const rects=visible.map(el=>{const r=el.getBoundingClientRect(),left=Math.max(vLeft+6,r.left-5),top=Math.max(vTop+6,r.top-5),right=Math.min(vLeft+w-6,r.right+5),bottom=Math.min(vTop+h-6,r.bottom+5);return{left,top,width:Math.max(0,right-left),height:Math.max(0,bottom-top)};}).filter(r=>r.width>0&&r.height>0);
   const width=Math.min(350,w-24),maxHeight=h-24,pHeight=Math.min(panel.current?.scrollHeight||230,maxHeight),bounds=rects[0];
   let top=vTop+h-pHeight-12,left=vLeft+(w-width)/2;
   if(bounds){left=Math.max(vLeft+12,Math.min(bounds.left+(bounds.width-width)/2,vLeft+w-width-12));const below=bounds.top+bounds.height+16,above=bounds.top-pHeight-16;if(below+pHeight<vTop+h-12)top=below;else if(above>vTop+12)top=above;}
   setGeometry({rects,left,top:Math.max(vTop+12,Math.min(top,vTop+h-pHeight-12)),width,maxHeight});
  };
  frame=requestAnimationFrame(measure);observer=new ResizeObserver(()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);});if(panel.current)observer.observe(panel.current);
  const update=()=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(measure);};window.addEventListener('resize',update);document.addEventListener('scroll',update,true);window.visualViewport?.addEventListener('resize',update);window.visualViewport?.addEventListener('scroll',update);
  return()=>{cancelAnimationFrame(frame);observer?.disconnect();window.removeEventListener('resize',update);document.removeEventListener('scroll',update,true);window.visualViewport?.removeEventListener('resize',update);window.visualViewport?.removeEventListener('scroll',update);};
 },[index,steps]);
 return createPortal(<div ref={overlay} className="lab-guide-overlay" data-lab-guide onClick={e=>{if(e.target===e.currentTarget)advance();}}>
  <svg className="lab-guide-dim" aria-hidden="true" onClick={advance} width="100%" height="100%"><defs><mask id={`${titleId}-mask`}><rect width="100%" height="100%" fill="white"/>{geometry?.rects.map((r,i)=><rect key={i} {...r} x={r.left} y={r.top} rx="16" fill="black"/>)}</mask></defs><rect width="100%" height="100%" fill="black" fillOpacity=".46" mask={`url(#${titleId}-mask)`}/></svg>
  {geometry?.rects.map((r,i)=><div className="lab-guide-highlight" key={i} style={r} aria-hidden="true"/>)}
  <div ref={panel} role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={bodyId} className="lab-guide-card" style={geometry?{left:geometry.left,top:geometry.top,width:geometry.width,maxHeight:geometry.maxHeight}:{visibility:'hidden',width:350}}>
   <div className="lab-guide-meta"><span>간단 안내</span>{steps.length>1&&<span aria-label={`${steps.length}단계 중 ${index+1}단계`}>{String(index+1).padStart(2,'0')} / {String(steps.length).padStart(2,'0')}</span>}</div>
   <div key={index} className="lab-guide-copy" aria-live="polite"><h2 id={titleId}>{steps[index].title}</h2><p id={bodyId}>{steps[index].body}</p></div>
   <div className="lab-guide-actions"><button className="lab-guide-skip" onClick={onSkip}>안내 끄기</button><div>{index>0&&<button className="lab-guide-back" aria-label="이전 안내" onClick={()=>setIndex(index-1)}><ArrowLeft size={18}/></button>}<button ref={next} className="lab-guide-next" onClick={advance}>{index===steps.length-1?'알겠어요':'다음'}{index===steps.length-1?<Check size={17}/>:<ArrowRight size={17}/>}</button></div></div>
  </div>
 </div>,document.body);
}
