'use client';
import {useEffect,useRef} from 'react';
import {createPortal} from 'react-dom';
import {useMotionPreference} from '@/lib/useMotionPreference';
import {TicgleDots} from './BrandDetails';
import type {UnifiedLog} from './store';

/** Shown only after local registration or confirmed cloud persistence. */
export default function SaveMoment({log,onDone}:{log:UnifiedLog;author:string;onDone:()=>void}){
 const done=useRef(onDone);done.current=onDone;const reduced=useMotionPreference();
 useEffect(()=>{const timer=setTimeout(()=>done.current(),1800);return()=>clearTimeout(timer);},[log.id]);
 return createPortal(<div className="un-save-moment un-save-moment-quiet" role="status" aria-live="polite" data-reduced={reduced}><div className="un-save-moment-caption"><TicgleDots/><span>티끌을 남겼어요</span></div></div>,document.body);
}
