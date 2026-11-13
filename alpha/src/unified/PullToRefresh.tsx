'use client';
import {useEffect,useRef,useState,type ReactNode} from 'react';
import {ArrowDown,LoaderCircle} from 'lucide-react';
import {motion,useMotionValue,animate} from 'motion/react';
import {useMotionPreference} from '@/lib/useMotionPreference';
import './PullToRefresh.css';
export const pullDistance=(dy:number)=>Math.min(112,Math.max(0,dy)*.44);
export default function PullToRefresh({enabled,blocked=false,onRefresh,children}:{enabled:boolean;blocked?:boolean;onRefresh:()=>Promise<unknown>;children:ReactNode}){
 const host=useRef<HTMLDivElement>(null),y=useMotionValue(0),reduced=useMotionPreference(),[phase,setPhase]=useState<'idle'|'pull'|'ready'|'loading'>('idle'),busy=useRef(false),latest=useRef(onRefresh);latest.current=onRefresh;const blockedRef=useRef(blocked);blockedRef.current=blocked;
 useEffect(()=>{
  const node=host.current,root=node?.closest<HTMLElement>('[data-app-scroll]');if(!node||!root||!enabled)return;
  let gesture:{x:number;y:number;claimed:boolean;armed:boolean}|null=null,disposed=false,suppressUntil=0;let animation:ReturnType<typeof animate>|undefined;root.setAttribute('data-pull-refresh-enabled','true');
  const spring=(value:number)=>{animation?.stop();animation=animate(y,value,reduced?{duration:0}:{type:'spring',stiffness:340,damping:27,mass:.8});};
  const reset=()=>{gesture=null;spring(0);if(!busy.current)setPhase('idle');};
  const start=(e:TouchEvent)=>{if(busy.current||blockedRef.current||e.touches.length!==1||root.scrollTop>1||document.querySelector('[aria-modal=true]'))return;const target=e.target as Element;if(target.closest('input,textarea,select,[contenteditable=true],[data-no-pull-refresh]'))return;for(let p=target.parentElement;p&&p!==root;p=p.parentElement)if(p.scrollHeight>p.clientHeight+1&&/auto|scroll/.test(getComputedStyle(p).overflowY))return;animation?.stop();gesture={x:e.touches[0].clientX,y:e.touches[0].clientY,claimed:false,armed:false};};
  const move=(e:TouchEvent)=>{const g=gesture;if(!g)return;if(e.touches.length!==1||root.scrollTop>1||document.querySelector('[aria-modal=true]')){reset();return;}const dx=e.touches[0].clientX-g.x,dy=e.touches[0].clientY-g.y;if(!g.claimed){if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)||dy< -4){gesture=null;return;}if(dy<8||dy<Math.abs(dx)*1.2)return;g.claimed=true;suppressUntil=performance.now()+450;}suppressUntil=performance.now()+450;if(e.cancelable)e.preventDefault();const distance=pullDistance(dy);g.armed=distance>=70;y.set(reduced?Math.min(distance,55):distance);setPhase(distance>=70?'ready':'pull');};
  const finish=()=>{if(!gesture)return;const should=gesture.claimed&&gesture.armed;if(gesture.claimed)suppressUntil=performance.now()+450;gesture=null;if(!should){reset();return;}busy.current=true;setPhase('loading');spring(reduced?0:48);void Promise.resolve().then(()=>latest.current()).catch(()=>{}).finally(()=>{busy.current=false;if(!disposed){setPhase('idle');spring(0);}});};
  const click=(e:MouseEvent)=>{if(performance.now()<suppressUntil){suppressUntil=0;e.preventDefault();e.stopPropagation();}};
  node.addEventListener('touchstart',start,{passive:true});node.addEventListener('touchmove',move,{passive:false});node.addEventListener('touchend',finish);node.addEventListener('touchcancel',reset);node.addEventListener('click',click,true);
  return()=>{disposed=true;animation?.stop();root.removeAttribute('data-pull-refresh-enabled');node.removeEventListener('touchstart',start);node.removeEventListener('touchmove',move);node.removeEventListener('touchend',finish);node.removeEventListener('touchcancel',reset);node.removeEventListener('click',click,true);y.set(0);setPhase('idle');};
 },[enabled,reduced,y]);
 return <div className="un-pull-refresh" ref={host} data-pull-phase={phase} data-no-page-swipe={phase!=='idle'||undefined}><div className="un-pull-status" role="status" aria-live="polite">{phase!=='idle'&&<><span>{phase==='loading'?<LoaderCircle className={reduced?'':'lab-spin'} size={18}/>:<ArrowDown size={18} style={{transform:phase==='ready'?'rotate(180deg)':undefined}}/>}</span><small>{phase==='loading'?'새 티끌을 확인하고 있어요':phase==='ready'?'놓으면 새로고침':'당겨서 새로고침'}</small></>}</div><motion.div style={{y}}>{children}</motion.div></div>;
}
