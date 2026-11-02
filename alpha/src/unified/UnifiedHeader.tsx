'use client';
import {useCallback,useId,useState} from 'react';
import {Check,ChevronDown,KeyRound,Lock,Settings,Users} from 'lucide-react';
import {AnimatePresence,LayoutGroup,motion} from 'motion/react';
import {useMotionPreference} from '@/lib/useMotionPreference';
import type {Circle,Person} from '@/social/model';
import type {PwaState} from '@/components/PwaInstallControl';
import HeaderInstallControl from './HeaderInstallControl';
import TicgleWordmark from '@/components/TicgleBrand';
import CompactPopover from '@/components/logbook/CompactPopover';
import {INTERACTION_SPRING,instantMotion} from '@/lib/surfaceMotion';
import './UnifiedHeader.css';

export default function UnifiedHeader({
  scope,
  circles,
  people=[],
  onScope,
  onHome,
  onSettings,
  onGroups,
  pwa,
}:{
  scope:string;
  circles:Circle[];
  people?:Person[];
  onScope:(id:string)=>void;
  onHome:()=>void;
  onSettings:()=>void;
  onGroups:()=>void;
  pwa:PwaState;
}){
  const [scopeOpen,setScopeOpen]=useState(false);
  const reduced=useMotionPreference(),scopeGroupId=useId();
  const scopeChanged=useCallback((value:boolean)=>setScopeOpen(value),[]);
  const badge=(c:Circle)=><span className="un-group-emblem" aria-hidden="true">{Array.from(c.name.trim())[0]||'•'}<i/></span>;
  const selectedCircle=circles.find(c=>c.id===scope),ScopeIcon=selectedCircle?Users:Lock;

  return (
    <header className="un-header un-header-v2 un-header-centered" data-install-visible={pwa.ready&&!pwa.isStandalone}>
      <motion.button
        type="button"
        className="un-brand"
        aria-label="티끌 피드 화면"
        whileTap={reduced?undefined:{scale:0.95}}
        whileHover={reduced?undefined:{scale:1.01}}
        transition={reduced?instantMotion:INTERACTION_SPRING}
        onClick={onHome}
      >
        <TicgleWordmark/>
      </motion.button>
      <CompactPopover
        label="티끌 범위 선택"
        open={scopeOpen}
        onOpenChange={scopeChanged}
        className={`un-scope-picker ${selectedCircle?'has-group':''}`}
        trigger={
          <>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={scope}
                className="un-scope-pill-morph"
                initial={reduced?false:{opacity:0,y:5,filter:'blur(3px)'}}
                animate={{opacity:1,y:0,filter:'blur(0px)'}}
                exit={reduced?undefined:{opacity:0,y:-5,filter:'blur(3px)'}}
                transition={reduced?instantMotion:INTERACTION_SPRING}
              >
                {selectedCircle?badge(selectedCircle):<ScopeIcon size={14} className="un-scope-type" aria-hidden="true"/>}
                <span className="un-scope-name">{selectedCircle?.name||'내 티끌'}</span>
              </motion.span>
            </AnimatePresence>
            <motion.span
              className="un-scope-chevron"
              aria-hidden="true"
              style={{display:'inline-flex'}}
              animate={{rotate:scopeOpen?180:0}}
              transition={reduced?instantMotion:INTERACTION_SPRING}
            >
              <ChevronDown aria-hidden="true" size={12}/>
            </motion.span>
          </>
        }
      >
        {close=>(
          <LayoutGroup id={scopeGroupId}>
            <motion.button
              type="button"
              className="un-scope-option"
              aria-pressed={scope==='mine'}
              whileTap={reduced?undefined:{scale:0.97}}
              whileHover={reduced?undefined:{scale:1.01}}
              transition={reduced?instantMotion:INTERACTION_SPRING}
              onClick={()=>{onScope('mine');close();}}
            >
              {scope==='mine'&&<motion.span layoutId={reduced?undefined:"un-surface-scope-pill"} className="un-surface-scope-active-bg" transition={reduced?instantMotion:INTERACTION_SPRING} aria-hidden="true"/>}
              <Lock size={15} aria-hidden="true"/>
              <span className="un-scope-option-name">내 티끌</span>
              <span className="un-scope-check" aria-hidden="true">{scope==='mine'&&<Check aria-hidden="true" size={14}/>}</span>
            </motion.button>
            {circles.map(c=>(
              <motion.button
                type="button"
                key={c.id}
                className="un-scope-option"
                aria-pressed={scope===c.id}
                whileTap={reduced?undefined:{scale:0.97}}
                whileHover={reduced?undefined:{scale:1.01}}
                transition={reduced?instantMotion:INTERACTION_SPRING}
                onClick={()=>{onScope(c.id);close();}}
              >
                {scope===c.id&&<motion.span layoutId={reduced?undefined:"un-surface-scope-pill"} className="un-surface-scope-active-bg" transition={reduced?instantMotion:INTERACTION_SPRING} aria-hidden="true"/>}
                {badge(c)}
                <span className="un-scope-option-name"><strong>{c.name}</strong><span className="un-group-avatars" aria-hidden="true">{c.members.slice(0,3).map(id=>{const person=people.find(p=>p.id===id);return <i key={id} style={{background:person?.color||'var(--accent)'}} title={person?.name}>{person?.initial||'•'}</i>;})}</span></span>
                <small className="un-scope-member-count">{c.members.length}명</small>
                <span className="un-scope-check" aria-hidden="true">{scope===c.id&&<Check aria-hidden="true" size={14}/>}</span>
              </motion.button>
            ))}
            <motion.button
              type="button"
              className="un-scope-manage"
              whileTap={reduced?undefined:{scale:0.97}}
              whileHover={reduced?undefined:{scale:1.01}}
              transition={reduced?instantMotion:INTERACTION_SPRING}
              onClick={()=>{close();onGroups();}}
            >
              <KeyRound aria-hidden="true" size={15}/>
              <span>코드로 참여 · 모임 만들기</span>
            </motion.button>
          </LayoutGroup>
        )}
      </CompactPopover>
      <div className="un-header-actions">
        <HeaderInstallControl pwa={pwa}/>
        <motion.button
          type="button"
          className="un-header-action"
          aria-label="설정 열기"
          whileTap={reduced?undefined:{scale:0.9,rotate:-15}}
          whileHover={reduced?undefined:{scale:1.04}}
          transition={reduced?instantMotion:INTERACTION_SPRING}
          onClick={onSettings}
        >
          <Settings aria-hidden="true" size={21} strokeWidth={1.65}/>
        </motion.button>
      </div>
    </header>
  );
}
