// Adapted from AnimateIcons MCP lu-sliders-horizontal, using the existing Motion runtime.
'use client';
import {forwardRef,useEffect,useImperativeHandle} from 'react';
import {LazyMotion,domMin,m,useAnimation,type Variants} from 'motion/react';
import {useMotionPreference} from '@/lib/useMotionPreference';
import type {AnimatedSearchHandle} from './AnimatedSearch';
export const AnimatedSliders=forwardRef<AnimatedSearchHandle,{size?:number}>(function AnimatedSliders({size=18},ref){
 const controls=useAnimation(),reduced=useMotionPreference();
 useImperativeHandle(ref,()=>({startAnimation:()=>{void controls.start(reduced?'normal':'animate');},stopAnimation:()=>{void controls.start('normal');}}),[controls,reduced]);
 useEffect(()=>{if(reduced)void controls.start('normal');},[reduced,controls]);
 const track:Variants={normal:{opacity:1},animate:{opacity:[1,.65,1],transition:{duration:.42,ease:'easeInOut'}}};
 const knob:Variants={normal:{x:0},animate:(direction:number)=>({x:[0,direction*3,0],transition:{duration:.45,ease:'easeInOut'}})};
 return <LazyMotion features={domMin} strict><m.svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" initial="normal" animate={controls} aria-hidden="true"><m.path d="M10 5H3 M21 5h-7 M12 19H3 M21 19h-5 M21 12h-9 M8 12H3" variants={track}/><m.path d="M14 3v4" variants={knob} custom={1}/><m.path d="M16 17v4" variants={knob} custom={-1}/><m.path d="M8 10v4" variants={knob} custom={1}/></m.svg></LazyMotion>;
});
