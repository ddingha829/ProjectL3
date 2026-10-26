// Tween UI MCP sliding-tabs interaction, adapted to the app's existing Motion runtime.
// Source pattern: https://tween-ui.vercel.app/r/sliding-tabs.json
'use client';
import {useId} from 'react';
import {motion} from 'motion/react';
import {useMotionPreference} from '@/lib/useMotionPreference';
export default function SlidingChoice({items,value,onChange,label,className=''}:{items:{id:string;label:string}[];value:string;onChange:(value:string)=>void;label:string;className?:string}){
 const id=useId(),reduced=useMotionPreference();
 return <div role="group" aria-label={label} className={`sr-choices ${className}`}>{items.map((item,index)=><button type="button" key={item.id} aria-pressed={value===item.id} onClick={()=>onChange(item.id)} onKeyDown={e=>{const delta=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(!delta)return;e.preventDefault();const next=(index+delta+items.length)%items.length;onChange(items[next].id);const buttons=e.currentTarget.parentElement?.querySelectorAll('button');buttons?.[next]?.focus();}}>{value===item.id&&(reduced?<span className="sr-choice-indicator" aria-hidden="true"/>:<motion.span className="sr-choice-indicator" aria-hidden="true" layoutId={`sr-choice-${id}`} transition={{type:'spring',stiffness:520,damping:38}}/>)}<span className="sr-choice-label">{item.label}</span></button>)}</div>;
}
