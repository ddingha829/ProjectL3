'use client';
import {Check} from 'lucide-react';
import {motion} from 'motion/react';
import {useMotionPreference} from '@/lib/useMotionPreference';
import {INTERACTION_SPRING,instantMotion} from '@/lib/surfaceMotion';
import BentoFront,{bentoTitle} from '@/social/BentoFront';
import {BENTO_RATIOS,bentoKind,bentoRows} from '@/social/bentoLayout';
import type {LabLog,Person} from '@/social/model';
import './BentoFeed.css';

export default function BentoFeed({logs,people,selecting=false,picked=[],busy=false,onOpen}:{logs:readonly LabLog[];people:readonly Person[];selecting?:boolean;picked?:readonly string[];busy?:boolean;onOpen:(log:LabLog)=>void}){
 const reduced=useMotionPreference(),kinds=logs.map(bentoKind);
 return <div className="un-grid un-bento-grid" aria-label="티끌 피드" aria-busy={busy}>
  {bentoRows(kinds).map(row=>{const [first,second]=row;return <div key={logs[first].id} className="un-bento-row" data-bento-row={second===undefined?kinds[first]==='note'?'note':'single':'pair'} style={{gridTemplateColumns:second===undefined?'minmax(0,1fr)':`${BENTO_RATIOS[kinds[first]]}fr ${BENTO_RATIOS[kinds[second]]}fr`}}>
   {row.map(index=>{const log=logs[index],author=people.find(person=>person.id===log.authorId)?.name||'사용자',selected=picked.includes(log.id);return <article key={log.id} data-log-id={log.id} className={`un-bento-card ${selected?'is-picked':''}`}>
    <motion.div className="un-bento-card-surface" whileTap={reduced?undefined:{scale:.98}} transition={reduced?instantMotion:INTERACTION_SPRING}>
     <div aria-hidden="true" inert><BentoFront log={log} author={author} native/></div>
     <button type="button" className="un-bento-open" aria-label={`${bentoTitle(log)} ${selecting?'선택':'상세 보기'}`} aria-pressed={selecting?selected:undefined} onClick={()=>onOpen(log)}>{selecting&&<span className="un-bento-selection">{selected&&<Check size={17} aria-hidden="true"/>}</span>}</button>
    </motion.div>
   </article>;})}
  </div>;})}
 </div>;
}
