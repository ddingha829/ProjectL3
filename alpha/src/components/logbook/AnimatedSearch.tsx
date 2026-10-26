// Adapted from AnimateIcons MCP, lu-search: https://animateicons.in/r/lu-search.json
'use client';
import {forwardRef,useEffect,useImperativeHandle} from 'react';
import {LazyMotion,domMin,m,useAnimation} from 'motion/react';
import {useMotionPreference} from '@/lib/useMotionPreference';
export interface AnimatedSearchHandle{startAnimation:()=>void;stopAnimation:()=>void}
export const AnimatedSearch=forwardRef<AnimatedSearchHandle,{size?:number;duration?:number}>(function AnimatedSearch({size=19,duration=.55},ref){
 const controls=useAnimation(),reduced=useMotionPreference();
 useImperativeHandle(ref,()=>({startAnimation:()=>{void controls.start(reduced?'normal':'animate');},stopAnimation:()=>{void controls.start('normal');}}),[controls,reduced]);
 useEffect(()=>{if(reduced)void controls.start('normal');},[reduced,controls]);
 return <LazyMotion features={domMin} strict><m.svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" initial="normal" animate={controls} aria-hidden="true"><m.g variants={{normal:{x:0,y:0,rotate:0},animate:{x:[0,2,-2,1,0],y:[0,-1,2,-1,0],rotate:[0,6,-6,4,0],transition:{duration,ease:'easeInOut'}}}}><m.circle cx="11" cy="11" r="8"/><path d="m21 21-4.34-4.34"/></m.g></m.svg></LazyMotion>;
});
