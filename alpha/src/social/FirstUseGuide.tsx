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
 mosaic:[{targets:['.mosaic-frame','.mosaic-tray'],title:'취향을 원하는 칸에',body:'작품을 연결한 로그만 타일로 보여요. 하단 플로팅 트레이를 옆으로 넘겨 내 타일을 찾고, 위로 끌어 빈 칸(+)에 놓아요. 타일 선택 후 빈 칸을 눌러도 돼요. 채운 타일을 누르면 양면 카드를 볼 수 있고, 위치 이동에서 자리를 바꿀 수 있어요. 모임 보드에서는 내 타일만 빈 칸으로 옮길 수 있어요. 보드 위 좌우 스와이프는 앱 메뉴를 넘기고, 판은 아래 이전·다음 버튼으로 골라요.'}],
 studio:[{targets:['.un-studio-tools'],title:'내 스타일을 프리셋으로',body:'카드를 보면서 앞면·뒷면·색상·질감 탭에서 꾸며요. 이름과 기본 적용은 이름·기본 설정에서 바꾸고, 프리셋 저장을 한 번 누르면 모두 저장돼요. 기존 로그는 바뀌지 않아요.'}],
 today:[
  {targets:['.lab-main [data-log-id]:first-child .lab-poster-art','.lab-main .lab-empty'],title:'로그는 카드로 모여요',body:'카드를 누르면 크게 펼쳐져요. 펼친 카드를 한 번 더 누르면 뒤집혀 감상을 읽을 수 있어요. 카드 안쪽 아래에 작성자 이름이 보여요. 카드 어디를 눌러도 상세 화면이 열려요.'},
   {targets:['.flc-search-slot','.flc-shell'],title:'찾고 싶은 순간을 바로',body:'전체 드롭다운에서 카테고리·정렬·사진 필터를 한 번에 골라요. 돋보기는 검색, 옆의 보기 아이콘은 카드·리스트·캘린더 선택을 펼쳐요. 더보기에서는 보관함과 취향 선반을 열어요. 다른 곳을 누르면 검색창은 접히고 검색어는 유지돼요. 도구 모음은 스크롤해도 위에 남아요.'},
  {targets:['.un-header-v2','.un-navigation .lab-nav-rail'],title:'남기고, 찾아보고',body:'로고 옆 드롭다운에서 마이로그나 모임을 골라요. 모임을 만들면 초대 코드가 나오고, 받은 6자리 코드로 바로 참여할 수 있어요. 아래 메뉴를 누르거나 화면을 좌우로 밀어 피드·지도·타일·스튜디오를 오가요. 카드·목록·타일 위에서도 바로 넘길 수 있어요. 지도 안에서는 한 손가락으로 이동하고 두 손가락으로 확대·축소해요. ＋로 기록을 남겨요.'},
 ],
 library:[{targets:['.flc-shell'],title:'내 기록을 다시 찾는 곳',body:'내 로그·모임 로그·담아둔 로그를 나눠 보고, 검색으로 찾아보세요. 오른쪽 보관함에서 로그를 선택해 묶거나 취향 선반을 열 수 있어요.'}],
  map:[{targets:['.lab-map-panel'],title:'기록할수록 채워지는 지도',body:'위치를 허용하면 내 주변부터 열려요. 확대하면 동네, 축소하면 시·군·구·시·도·국가로 색칠 범위가 넓어져요. 동네 수준에서는 화면 안의 로그가 지도 아래에도 보여요. 흰 점을 누르면 카드가 펼쳐지고 한 번 더 누르면 크게 열려요. 지도 안에서는 한 손가락으로 자유롭게 이동하고 두 손가락으로 확대·축소해요. 다른 메뉴는 아래 버튼이나 지도 바깥 영역의 좌우 스와이프로 열어요.'}],
 compose:[
  {targets:['.un-entry-options','.lab-story-stage','.lab-write-surface'],title:'지금의 순간을 담아요',body:'촬영하기·작품 등록하기·글만 쓰기 중에서 골라요. 사진을 찍거나 선택하면 작성창이 올라오고, 작품은 검색 후 고르면 표지가 배경에 보여요. 글만 쓰면 노트 배경으로 시작해요.'},
  {targets:['.un-entry-options','.un-sheet-header','.lab-submit'],title:'글만 남겨도 좋아요',body:'상단 위치에서 근처 장소나 표시할 이름을 고르고, 오른쪽에서 날씨를 확인해요. 아래 별을 밀어 평점을 고르거나 비워둘 수 있어요. 작품에는 위치를 읽지 않아요. 로그 등록을 누른 뒤 함께 나눌 모임을 여러 개 골라요. 마이로그에는 항상 남아요. 작성창 위 손잡이를 누르면 접혀요.'},
 ],
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
 const detail:Step[]=[{targets:['.un-detail-card'],title:'한 장에 집중해요',body:'크게 펼친 사진 카드를 다시 누르면 뒷면이 보여요. 사진이 없는 로그는 감상 면만 보여요. 왼쪽 위 화살표를 누르거나 카드를 오른쪽으로 밀면 이전 화면으로 돌아가요. 아래에는 반응·공유 버튼과 장소가 항상 보여요. 작성자와 댓글 수가 있는 부분을 누르거나 위로 밀면 댓글만 펼쳐져요.'},{targets:['.un-viewer-toggle','.un-viewer-action-bar'],title:'필요한 메뉴만 꺼내요',body:owned?'하트·책갈피·공유 아이콘을 바로 사용해요. 더보기에서 내용 수정·카드 꾸미기·프리셋을 골라요. 손잡이를 다시 누르거나 아래로 밀면 댓글이 접혀요.':'하트·책갈피·공유 아이콘을 바로 사용하고 한마디를 남겨요. 책·영화는 더보기에서 나도 보기에 담을 수 있어요. 손잡이를 다시 누르거나 아래로 밀면 댓글이 접혀요.'}];
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
   <div className="lab-guide-meta"><span>QUICK GUIDE</span><span aria-label={`${steps.length}단계 중 ${index+1}단계`}>{String(index+1).padStart(2,'0')} / {String(steps.length).padStart(2,'0')}</span></div>
   <div key={index} className="lab-guide-copy" aria-live="polite"><h2 id={titleId}>{steps[index].title}</h2><p id={bodyId}>{steps[index].body}</p></div>
   <div className="lab-guide-actions"><button className="lab-guide-skip" onClick={onSkip}>안내 끄기</button><div>{index>0&&<button className="lab-guide-back" aria-label="이전 안내" onClick={()=>setIndex(index-1)}><ArrowLeft size={18}/></button>}<button ref={next} className="lab-guide-next" onClick={advance}>{index===steps.length-1?'알겠어요':'다음'}{index===steps.length-1?<Check size={17}/>:<ArrowRight size={17}/>}</button></div></div>
  </div>
 </div>,document.body);
}
