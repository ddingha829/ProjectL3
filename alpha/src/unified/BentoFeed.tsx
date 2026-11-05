'use client';
import {useLayoutEffect,useRef,useState} from 'react';
import {useVideoAutoplay} from '@/social/useVideoAutoplay';
import {Check,Pause,Play} from 'lucide-react';
import {motion} from 'motion/react';
import {useMotionPreference} from '@/lib/useMotionPreference';
import {INTERACTION_SPRING,instantMotion} from '@/lib/surfaceMotion';
import BentoFront,{bentoTitle} from '@/social/BentoFront';
import {bentoKind,bentoLayout} from '@/social/bentoLayout';
import type {LabLog,Person} from '@/social/model';
import './BentoFeed.css';

export default function BentoFeed({logs,people,scope,viewerId,selecting=false,picked=[],busy=false,onOpen}:{logs:readonly LabLog[];people:readonly Person[];scope?:string;viewerId?:string;selecting?:boolean;picked?:readonly string[];busy?:boolean;onOpen:(log:LabLog)=>void}){
 const [paused,setPaused]=useState<string[]>([]),autoplay=useVideoAutoplay();
 const reduced=useMotionPreference(),kinds=logs.map(bentoKind);
 const gridRef=useRef<HTMLDivElement>(null),[geometry,setGeometry]=useState({width:357,gap:8.4});
 useLayoutEffect(()=>{
  const grid=gridRef.current;if(!grid)return;
  const measure=()=>{const width=grid.getBoundingClientRect().width,gap=parseFloat(getComputedStyle(grid).getPropertyValue('--bento-gap'))||8.4;if(width>0)setGeometry(old=>Math.abs(old.width-width)<.1&&old.gap===gap?old:{width,gap});};
  measure();const observer=new ResizeObserver(measure);observer.observe(grid);return()=>observer.disconnect();
 },[]);
 const layout=bentoLayout(kinds,geometry.width,geometry.gap);
 return <div ref={gridRef} className="un-grid un-bento-grid" aria-label="티끌 피드" aria-busy={busy} style={{aspectRatio:layout.height?`${geometry.width} / ${layout.height}`:undefined}}>
   {logs.map((log,index)=>{const tile=layout.tiles[index],author=people.find(person=>person.id===log.authorId)?.name||'사용자',selected=picked.includes(log.id);return <article key={log.id} data-log-id={log.id} className={`un-bento-card ${selected?'is-picked':''}`} style={{left:`${tile.left/geometry.width*100}%`,top:`${tile.top/layout.height*100}%`,width:`${tile.width/geometry.width*100}%`}}>
    <motion.div className="un-bento-card-surface" whileTap={reduced?undefined:{scale:.98}} transition={reduced?instantMotion:INTERACTION_SPRING}>
     <div aria-hidden="true" inert><BentoFront log={log} author={author} native hideAuthor={scope==='mine'} viewerId={viewerId} showReactions autoplayVideo={!selecting&&!paused.includes(log.id)}/></div>
     <button type="button" className="un-bento-open" aria-label={`${bentoTitle(log)}${log.likes.length?` · 좋아요 ${log.likes.length}개`:''}${log.comments.length?` · 댓글 ${log.comments.length}개`:''} ${selecting?'선택':'상세 보기'}`} aria-pressed={selecting?selected:undefined} onClick={()=>onOpen(log)}>{selecting&&<span className="un-bento-selection">{selected&&<Check size={17} aria-hidden="true"/>}</span>}</button>
     {log.video&&!selecting&&autoplay&&<button type="button" className="un-bento-playback-control" aria-label={paused.includes(log.id)?'카드 영상 자동 재생 켜기':'카드 영상 자동 재생 끄기'} aria-pressed={!paused.includes(log.id)} onClick={()=>setPaused(ids=>ids.includes(log.id)?ids.filter(id=>id!==log.id):[...ids,log.id])}>{paused.includes(log.id)?<Play size={15} aria-hidden="true"/>:<Pause size={15} aria-hidden="true"/>}</button>}
    </motion.div>
   </article>;})}
 </div>;
}
