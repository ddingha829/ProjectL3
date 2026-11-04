'use client';
import {useEffect,useId,useRef,useState,type CSSProperties,type PointerEvent,type ReactNode,type RefObject} from 'react';
import {Film,Play,LoaderCircle,ArrowUpRight,ChevronDown,MessageCircle,MoreHorizontal,Share2,Users} from 'lucide-react';
import {AnimatePresence,motion,useMotionTemplate,useMotionValue,useSpring} from 'motion/react';
import dynamic from 'next/dynamic';
import AccessibleDialog from '@/components/AccessibleDialog';
import {mediaFilter} from '@/social/mediaFilter';
import EditorialCard,{cardTitle} from '@/social/EditorialCard';
import {cardCanvasHeight,hasBentoFront} from '@/social/bentoLayout';
import type {EditorialStyle} from '@/social/editorialStyle';
import {useMotionPreference} from '@/lib/useMotionPreference';
import {INTERACTION_SPRING,instantMotion} from '@/lib/surfaceMotion';
import type {UnifiedLog} from './store';
import {useCardBackSwipe} from './useCardBackSwipe';
const CardImageActions=dynamic(()=>import('@/social/CardImageActions'),{loading:()=> <p role="status">공유 도구를 불러오고 있어요.</p>});
import './CardViewer.css';
import './LocationPreview.css';
const LocationPreview=dynamic(()=>import('./LocationPreview'));

const TILT_SPRING={stiffness:280,damping:24,mass:0.6};

type Props={log:UnifiedLog;author:string;authorColor?:string;authorInitial?:string;appearance:EditorialStyle;root:RefObject<HTMLDivElement|null>;onBack:()=>boolean;actions:ReactNode;place?:ReactNode;onShareToGroups?:()=>void;options?:(close:()=>void)=>ReactNode;children:ReactNode};
export default function CardViewer({log,author,authorColor,authorInitial,appearance,root,onBack,actions,place,onShareToGroups,options,children}:Props){
 const [locationOpen,setLocationOpen]=useState(false);
 const [expanded,setExpanded]=useState(false),[sharing,setSharing]=useState(false),[optionsOpen,setOptionsOpen]=useState(false),[draggingSheet,setDraggingSheet]=useState(false),[sheetOffset,setSheetOffset]=useState(0);
 const gesture=useRef<{x:number;y:number;lastY:number;lastT:number}|null>(null),skipClick=useRef(false),tools=useRef<HTMLDivElement>(null),toolsId=useId();
 const [videoOpen,setVideoOpen]=useState(false),[videoUrl,setVideoUrl]=useState(''),[videoError,setVideoError]=useState(''),videoRequest=useRef(0);
 useEffect(()=>()=>{videoRequest.current++;},[]);
 const playVideo=async()=>{if(!log.video)return;setVideoOpen(true);setVideoError('');const sequence=++videoRequest.current;try{const {configureCloud}=await import('./cloudRepository');const client=await configureCloud();if(!client)throw Error();const result=await client.storage.from('l2u-videos').createSignedUrl(log.video.path,300);if(result.error)throw result.error;if(sequence===videoRequest.current)setVideoUrl(result.data.signedUrl);}catch{if(sequence===videoRequest.current)setVideoError('영상을 불러오지 못했어요. 공유 권한이나 네트워크를 확인해주세요.');}};
 const reduced=useMotionPreference();
 const viewer=useRef<HTMLDivElement>(null);useCardBackSwipe(viewer,onBack,!sharing&&!optionsOpen&&!videoOpen&&!locationOpen);
 const rawRotateX=useMotionValue(0),rawRotateY=useMotionValue(0),rawGlareX=useMotionValue(50),rawGlareY=useMotionValue(50),rawGlareOpacity=useMotionValue(0);
 const rotateX=useSpring(rawRotateX,TILT_SPRING),rotateY=useSpring(rawRotateY,TILT_SPRING),glareX=useSpring(rawGlareX,TILT_SPRING),glareY=useSpring(rawGlareY,TILT_SPRING),glareOpacity=useSpring(rawGlareOpacity,TILT_SPRING);
 const glareBackground=useMotionTemplate`radial-gradient(circle at ${glareX}% ${glareY}%, rgba(255,255,255,0.42), rgba(255,255,255,0.08) 42%, transparent 72%)`;

 const resetTilt=()=>{rawRotateX.set(0);rawRotateY.set(0);rawGlareOpacity.set(0);};
 const handleCardMove=(event:PointerEvent<HTMLDivElement>)=>{
  if(reduced||sharing||optionsOpen||videoOpen)return;
  if(event.pointerType==='touch'&&event.clientX<32)return;
  const rect=event.currentTarget.getBoundingClientRect();
  if(!rect.width||!rect.height)return;
  const nx=Math.max(-1,Math.min(1,(event.clientX-(rect.left+rect.width/2))/(rect.width/2)));
  const ny=Math.max(-1,Math.min(1,(event.clientY-(rect.top+rect.height/2))/(rect.height/2)));
  rawRotateX.set(-ny*6.5);
  rawRotateY.set(nx*6.5);
  rawGlareX.set((nx+1)*50);
  rawGlareY.set((ny+1)*50);
  rawGlareOpacity.set(0.22);
 };

 const changeExpanded=(value:boolean)=>{if(!value&&tools.current?.contains(document.activeElement))document.getElementById(toolsId+'-toggle')?.focus({preventScroll:true});setExpanded(value);};
 const damp=(over:number)=>Math.sign(over)*Math.pow(Math.abs(over),0.72)*0.36;

 return <div ref={viewer} className={`un-card-viewer ${expanded?'is-expanded':''} ${draggingSheet?'is-sheet-dragging':''}`} style={{'--viewer-ratio':420/cardCanvasHeight(log),'--viewer-peek-content':'172px','--viewer-drag-y':`${sheetOffset}px`} as CSSProperties} data-viewer-state={expanded?'commenting':'viewing'}>
  <button type="button" className="un-viewer-typing-done" onPointerDown={event=>event.preventDefault()} onClick={()=>tools.current?.querySelector<HTMLInputElement>('input')?.blur()}><ChevronDown size={16} aria-hidden="true"/>입력 완료</button>
  <div className="un-viewer-stage" onPointerDown={event=>{if(event.pointerType==='mouse'&&event.button!==0)return;gesture.current={x:event.clientX,y:event.clientY,lastY:event.clientY,lastT:performance.now()};}} onPointerUp={event=>{const start=gesture.current;gesture.current=null;resetTilt();if(!start)return;const dx=event.clientX-start.x,dy=event.clientY-start.y;if(Math.abs(dy)>48&&Math.abs(dy)>Math.abs(dx)*1.4){const review=(event.target as HTMLElement).closest('[data-ec-scroll]');if(review&&review.scrollHeight>review.clientHeight)return;changeExpanded(dy<0);}}} onPointerCancel={()=>{gesture.current=null;resetTilt();}}>
   <motion.div
    className="un-detail-card-tilt"
    style={reduced?undefined:{rotateX,rotateY,transformPerspective:1100}}
    onPointerMove={handleCardMove}
    onPointerUp={resetTilt}
    onPointerLeave={resetTilt}
    onPointerCancel={resetTilt}
   >
    <div ref={root} className="un-detail-card"><EditorialCard key={log.id} log={log} author={author} appearance={appearance} hintStrength="strong"/></div>
    {!reduced&&<motion.span className="un-card-specular" aria-hidden="true" style={{opacity:glareOpacity,background:glareBackground}}/>}
   </motion.div>
   {log.video&&<button type="button" className="un-viewer-video-control" onClick={()=>{resetTilt();void playVideo();}}><Play size={16} aria-hidden="true"/>영상 재생 · 2초</button>}
  </div>
  <section className="un-viewer-drawer" aria-label="티끌 반응과 댓글">
   <div className="un-viewer-sheet-heading"><button id={toolsId+'-toggle'} className="un-viewer-toggle" aria-label={expanded?'댓글 접기':'댓글 펼치기'} aria-controls={toolsId} aria-expanded={expanded} onClick={event=>{if(skipClick.current&&event.detail>0){skipClick.current=false;return;}skipClick.current=false;changeExpanded(!expanded);}}
    onPointerDown={event=>{if(event.pointerType==='mouse'&&event.button!==0)return;skipClick.current=false;gesture.current={x:event.clientX,y:event.clientY,lastY:event.clientY,lastT:performance.now()};event.currentTarget.setPointerCapture(event.pointerId);}}
    onPointerMove={event=>{
     const start=gesture.current;if(!start||reduced)return;
     const dy=event.clientY-start.y,dx=event.clientX-start.x;
     if(!draggingSheet&&Math.abs(dy)>6&&Math.abs(dy)>Math.abs(dx)){setDraggingSheet(true);}
     start.lastY=event.clientY;start.lastT=performance.now();
     const pullUp=-dy;
     if(!expanded){
      setSheetOffset(pullUp>=0?Math.min(160,pullUp):damp(pullUp));
     }else{
      setSheetOffset(pullUp<=0?Math.max(-160,pullUp):damp(pullUp));
     }
    }}
    onPointerUp={event=>{
     const start=gesture.current;gesture.current=null;
     if(draggingSheet){setDraggingSheet(false);setSheetOffset(0);}
     if(!start)return;
     const dy=event.clientY-start.y,dx=event.clientX-start.x,dt=Math.max(1,performance.now()-start.lastT),vy=(event.clientY-start.lastY)/dt;
     if((Math.abs(dy)>22||Math.abs(vy)>0.42)&&Math.abs(dy)>Math.abs(dx)*1.2){skipClick.current=true;changeExpanded(vy<-0.38?true:vy>0.38?false:dy<0);}
    }}
    onPointerCancel={()=>{gesture.current=null;setDraggingSheet(false);setSheetOffset(0);}}>
    <span className="un-viewer-grab" aria-hidden="true"/>
    <span className="un-viewer-peek-row"><span className="un-viewer-author-mark" style={{'--author-color':authorColor||'var(--muted)'} as CSSProperties}>{authorInitial||author.slice(0,1)}</span><span className="un-viewer-author-copy"><strong>{author}</strong><small>{new Date(log.createdAt).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</small></span></span>
   </button>{place&&<button type="button" className="un-viewer-location-open" aria-label="기록한 장소 지도 보기" onClick={()=>{resetTilt();setLocationOpen(true);}}><span className="un-viewer-header-location">{place}</span></button>}</div>
   <div className="un-viewer-summary"><div className="un-viewer-action-bar"><div className="un-viewer-reactions">{actions}</div><motion.button whileTap={reduced?undefined:{scale:0.9}} whileHover={reduced?undefined:{scale:1.04}} transition={reduced?instantMotion:INTERACTION_SPRING} className="un-viewer-icon-action un-viewer-share" aria-label="공유하기" title="공유하기" onClick={()=>{resetTilt();setSharing(true);}}><Share2 size={18}/></motion.button>{options&&<motion.button whileTap={reduced?undefined:{scale:0.9}} whileHover={reduced?undefined:{scale:1.04}} transition={reduced?instantMotion:INTERACTION_SPRING} className="un-viewer-icon-action" aria-label="티끌 옵션" title="티끌 옵션" onClick={()=>{resetTilt();setOptionsOpen(true);}}><MoreHorizontal size={21}/></motion.button>}</div><button type="button" className="un-viewer-comment-entry" aria-label={`댓글 ${log.comments.length}개 ${expanded?'접기':'보기'}`} aria-controls={toolsId} aria-expanded={expanded} onClick={()=>changeExpanded(!expanded)}><MessageCircle size={19} aria-hidden="true"/><span>댓글</span><AnimatePresence mode="popLayout" initial={false}><motion.span className="un-viewer-comment-number" aria-hidden="true" key={log.comments.length} initial={reduced?false:{y:7,opacity:0}} animate={{y:0,opacity:1}} exit={reduced?undefined:{y:-7,opacity:0}} transition={reduced?instantMotion:INTERACTION_SPRING}>{log.comments.length}</motion.span></AnimatePresence><ChevronDown size={16} aria-hidden="true" style={{transform:expanded?'rotate(180deg)':undefined}}/></button></div>
   <div ref={tools} id={toolsId} className="un-detail-tools un-viewer-tools" hidden={!expanded} inert={!expanded}>{children}</div>
  </section>
  {locationOpen&&<LocationPreview place={log.place} label={log.locationLabel||log.place?.name||'기록한 장소'} onClose={()=>setLocationOpen(false)}/>}
  <AccessibleDialog open={videoOpen} title="움직이는 2초" closeLabel="영상 재생 닫기" onClose={()=>{videoRequest.current++;setVideoOpen(false);setVideoUrl('');}} panelClassName="lab-dialog un-video-picker">{videoError?<p className="lab-error" role="alert">{videoError}</p>:videoUrl?<video style={{filter:mediaFilter(log.photo)}} className="un-video-playback" src={videoUrl} poster={log.image} muted playsInline autoPlay controls preload="none"/>:<p role="status"><LoaderCircle size={18} className="lab-spin"/>영상을 불러오고 있어요</p>}<p className="un-video-note"><Film size={14}/>무음 2초 · 외부 공유는 정지 사진으로 보내요.</p></AccessibleDialog>
  <AccessibleDialog open={sharing} title="공유·이미지 저장" onClose={()=>setSharing(false)} panelClassName="lab-dialog un-export-dialog">{onShareToGroups&&<button type="button" className="un-share-to-groups" onClick={()=>{setSharing(false);onShareToGroups();}}><Users size={21} aria-hidden="true"/><span>모임에 공유<small>등록 후 48시간 안에 다른 모임에도 나눌 수 있어요.</small></span><ArrowUpRight size={18} aria-hidden="true"/></button>}<CardImageActions key={log.id+JSON.stringify(appearance)} root={root} title={cardTitle(log)} hasPhoto={hasBentoFront(log)}/></AccessibleDialog>
  <AccessibleDialog open={optionsOpen} title="티끌 옵션" onClose={()=>setOptionsOpen(false)} panelClassName="lab-dialog un-log-options"><div className="un-log-options-list">{options?.(()=>setOptionsOpen(false))}</div></AccessibleDialog>
 </div>;
}
