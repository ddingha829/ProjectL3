'use client';
import {createContext,useCallback,useContext,useEffect,useMemo,useRef,useState,type ReactNode} from 'react';
import {createPortal} from 'react-dom';
import {AnimatePresence,motion} from 'motion/react';
import {Check,LoaderCircle} from 'lucide-react';
import {useMotionPreference} from '@/lib/useMotionPreference';
import {INTERACTION_SPRING,instantMotion} from '@/lib/surfaceMotion';
import LoadingWordmark from '@/components/LoadingWordmark';
import './AuthMotion.css';
import {isolateDialog} from '@/lib/dialogIsolation';

type Flight={signup:boolean;approved:boolean;origin:{left:number;top:number;width:number;height:number};target:{left:number;top:number;width:number}};
type MotionContext={active:boolean;begin:(signup:boolean,rect?:DOMRect)=>void;approve:()=>void;fail:()=>void;setHostReady:(ready:boolean)=>void};
const Context=createContext<MotionContext|null>(null);
export const useAuthMotion=()=>useContext(Context);

/** A body-level visual bridge survives session loading without transforming app chrome. */
export function AuthMotionProvider({children}:{children:ReactNode}){
 const reduced=useMotionPreference(),[flight,setFlight]=useState<Flight|null>(null),[hostReady,setHostReady]=useState(false),[slow,setSlow]=useState(false);
 const overlay=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(flight&&overlay.current)return isolateDialog(overlay.current);},[Boolean(flight)]);
 const complete=Boolean(flight?.approved&&hostReady);
 const begin=useCallback((signup:boolean,rect?:DOMRect)=>{
  const width=Math.min(352,innerWidth-48),left=(innerWidth-width)/2,top=Math.max(64,innerHeight*.44-48);
  setHostReady(false);setSlow(false);setFlight({signup,approved:false,target:{left,top,width},origin:{left:Math.max(12,Math.min(rect?.left??left,innerWidth-60)),top:Math.max(12,Math.min(rect?.top??top,innerHeight-64)),width:rect?.width||width,height:rect?.height||54}});
 },[]);
 const approve=useCallback(()=>setFlight(value=>value?{...value,approved:true}:null),[]);
 const fail=useCallback(()=>setFlight(null),[]);
 useEffect(()=>{if(!flight||complete)return;const timer=setTimeout(()=>setSlow(true),8000);return()=>clearTimeout(timer);},[Boolean(flight),complete]);
 useEffect(()=>{if(!complete)return;if(reduced){setFlight(null);return;}const timer=setTimeout(()=>setFlight(null),280);return()=>clearTimeout(timer);},[complete,reduced]);
 const value=useMemo(()=>({active:!!flight,begin,approve,fail,setHostReady}),[!!flight,begin,approve,fail]);
 return <Context.Provider value={value}>{children}{typeof document!=='undefined'&&createPortal(<AnimatePresence>{flight&&<motion.div key="auth-flight" ref={overlay} className="un-auth-flight-overlay" role="status" aria-live="polite" aria-label={complete?flight.signup?'회원가입 완료':'로그인 완료':flight.signup?'회원가입 처리 중':'로그인 처리 중'} initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={reduced?instantMotion:{duration:.2}}>
  <motion.div className="un-auth-flight-brand" initial={reduced?false:{y:10,opacity:0}} animate={{y:0,opacity:1}} transition={reduced?instantMotion:INTERACTION_SPRING}><LoadingWordmark/></motion.div>
  <motion.div className="un-auth-flight-card" initial={reduced?false:{...flight.origin,borderRadius:14,opacity:.75}} animate={{...flight.target,height:104,borderRadius:24,opacity:1}} exit={reduced?{opacity:0}:{y:-14,opacity:0,scale:.98}} transition={reduced?instantMotion:INTERACTION_SPRING}>
   <motion.span className={`un-auth-flight-icon${complete?' is-complete':''}`} animate={reduced?{}:{scale:complete?[.88,1.08,1]:1}} transition={reduced?instantMotion:INTERACTION_SPRING}>{complete?<Check size={24} strokeWidth={2.3}/>:<LoaderCircle size={23} className="lab-spin"/>}</motion.span>
   <span className="un-auth-flight-copy"><strong>{complete?flight.signup?'티끌에 오신 걸 환영해요':'내 티끌이 준비됐어요':flight.approved?flight.signup?'계정이 만들어졌어요':'로그인했어요':flight.signup?'계정을 만들고 있어요':'로그인하고 있어요'}</strong><span>{complete?flight.signup?'닉네임을 정하고 시작해요.':'이어서 기록을 만나보세요.':slow?'연결이 늦어지고 있어요. 처리 중이에요.':flight.approved?'내 티끌을 불러오고 있어요.':'잠시만 기다려주세요.'}</span></span>
  </motion.div>
 </motion.div>}</AnimatePresence>,document.body)}</Context.Provider>;
}
