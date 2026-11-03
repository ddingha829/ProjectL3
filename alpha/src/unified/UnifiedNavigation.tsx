'use client';
import {useId,type CSSProperties} from 'react';
import {Grid2X2,GalleryVerticalEnd,Map,Palette,Plus} from 'lucide-react';
import {LayoutGroup,motion} from 'motion/react';
import {useMotionPreference} from '@/lib/useMotionPreference';
import {destinations,type Destination} from './store';
import {INTERACTION_SPRING,FEEDBACK_KEYFRAMES,instantMotion} from '@/lib/surfaceMotion';

const icons={logs:GalleryVerticalEnd,map:Map,mosaic:Grid2X2,studio:Palette};

export default function UnifiedNavigation({
  active,
  onChange,
  onCompose,
}:{
  active:Destination;
  onChange:(value:Destination)=>void;
  onCompose:()=>void;
}){
  const reduced=useMotionPreference(),groupId=useId();
  return (
    <nav className="lab-bottom-nav un-navigation" aria-label="주 메뉴" data-material="glass">
      <motion.button
        type="button"
        className="un-dock-add"
        aria-label="새 티끌 남기기"
        whileTap={reduced?undefined:{scale:0.9,rotate:-12}}
        whileHover={reduced?undefined:{scale:1.04}}
        transition={reduced?instantMotion:INTERACTION_SPRING}
        onClick={onCompose}
      >
        <Plus aria-hidden="true" size={27} strokeWidth={1.8}/>
      </motion.button>
      <LayoutGroup id={groupId}>
        <div
          className="lab-nav-rail"
          style={{'--active-index':destinations.findIndex(([id])=>id===active),'--nav-count':destinations.length} as CSSProperties}
        >
          {destinations.map(([id,label])=>{
            const Icon=icons[id];
            const isActive=active===id;
            return (
              <motion.button
                type="button"
                key={id}
                aria-current={isActive?'page':undefined}
                whileTap={reduced?undefined:{scale:0.94}}
                whileHover={reduced?undefined:{scale:1.02}}
                transition={reduced?instantMotion:INTERACTION_SPRING}
                onClick={()=>onChange(id)}
              >
                {isActive&&(
                  <motion.span
                    layout={reduced?false:"position"}
                    layoutId={reduced?undefined:"un-surface-bottom-nav-pill"}
                    className="un-surface-nav-active-pill"
                    style={{position:'absolute',inset:'2px 4px',pointerEvents:'none'}}
                    transition={reduced?instantMotion:INTERACTION_SPRING}
                    aria-hidden="true"
                  />
                )}
                <motion.span
                  className="un-nav-icon-bounce"
                  style={{display:'inline-grid',placeItems:'center'}}
                  animate={reduced||!isActive?{scale:1,y:0}:{scale:[0.86,1.16,1],y:[0,-2.5,0]}}
                  transition={reduced?instantMotion:FEEDBACK_KEYFRAMES}
                >
                  <Icon aria-hidden="true" size={22} strokeWidth={isActive?2.05:1.7}/>
                </motion.span>
                <span>{label}</span>
              </motion.button>
            );
          })}
        </div>
      </LayoutGroup>
    </nav>
  );
}
