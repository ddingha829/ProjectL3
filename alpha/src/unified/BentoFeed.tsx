'use client';
import {useState} from 'react';
import {useVideoAutoplay} from '@/social/useVideoAutoplay';
import {Check,Pause,Play} from 'lucide-react';
import {motion} from 'motion/react';
import {useMotionPreference} from '@/lib/useMotionPreference';
import {INTERACTION_SPRING,instantMotion} from '@/lib/surfaceMotion';
import BentoFront,{bentoTitle} from '@/social/BentoFront';
import {BENTO_RATIOS,bentoKind,bentoRows} from '@/social/bentoLayout';
import type {LabLog,Person} from '@/social/model';
import './BentoFeed.css';

export default function BentoFeed({logs,people,scope,viewerId,selecting=false,picked=[],busy=false,onOpen}:{logs:readonly LabLog[];people:readonly Person[];scope?:string;viewerId?:string;selecting?:boolean;picked?:readonly string[];busy?:boolean;onOpen:(log:LabLog)=>void}){
 const [paused,setPaused]=useState<string[]>([]),autoplay=useVideoAutoplay();
 const reduced=useMotionPreference(),kinds=logs.map(bentoKind);
 return <div className="un-grid un-bento-grid" aria-label="티끌 피드" aria-busy={busy}>
  {bentoRows(kinds).map(row=>{const [first,second]=row;return <div key={logs[first].id} className="un-bento-row" data-bento-row={second===undefined?kinds[first]==='note'?'note':'single':'pair'} style={{gridTemplateColumns:second===undefined?'minmax(0,1fr)':`${BENTO_RATIOS[kinds[first]]}fr ${BENTO_RATIOS[kinds[second]]}fr`}}>
   {row.map(index=>{const log=logs[index],author=people.find(person=>person.id===log.authorId)?.name||'사용자',selected=picked.includes(log.id);return <article key={log.id} data-log-id={log.id} className={`un-bento-card ${selected?'is-picked':''}`}>
    <motion.div className="un-bento-card-surface" whileTap={reduced?undefined:{scale:.98}} transition={reduced?instantMotion:INTERACTION_SPRING}>
     <div aria-hidden="true" inert><BentoFront log={log} author={author} native hideAuthor={scope==='mine'} viewerId={viewerId} showReactions autoplayVideo={!selecting&&!paused.includes(log.id)}/></div>
     <button type="button" className="un-bento-open" aria-label={`${bentoTitle(log)}${log.likes.length?` · 좋아요 ${log.likes.length}개`:''}${log.comments.length?` · 댓글 ${log.comments.length}개`:''} ${selecting?'선택':'상세 보기'}`} aria-pressed={selecting?selected:undefined} onClick={()=>onOpen(log)}>{selecting&&<span className="un-bento-selection">{selected&&<Check size={17} aria-hidden="true"/>}</span>}</button>
     {log.video&&!selecting&&autoplay&&<button type="button" className="un-bento-playback-control" aria-label={paused.includes(log.id)?'카드 영상 자동 재생 켜기':'카드 영상 자동 재생 끄기'} aria-pressed={!paused.includes(log.id)} onClick={()=>setPaused(ids=>ids.includes(log.id)?ids.filter(id=>id!==log.id):[...ids,log.id])}>{paused.includes(log.id)?<Play size={15} aria-hidden="true"/>:<Pause size={15} aria-hidden="true"/>}</button>}
    </motion.div>
   </article>;})}
  </div>;})}
 </div>;
}
