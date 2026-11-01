'use client';
import type {CSSProperties} from 'react';
import {Grid2X2,GalleryVerticalEnd,Map,Palette,Plus} from 'lucide-react';
import {LayoutGroup,motion} from 'motion/react';
import {useMotionPreference} from '@/lib/useMotionPreference';
import {destinations,type Destination} from '../store';
import {INTERACTION_SPRING} from './TactilePopover';

const icons={logs:GalleryVerticalEnd,map:Map,mosaic:Grid2X2,studio:Palette};

export default function TactileNavigation({
  active,
  onChange,
  onCompose,
}:{
  active:Destination;
  onChange:(value:Destination)=>void;
  onCompose:()=>void;
}){
  const reduced=useMotionPreference();
  return (
    <nav className="lab-bottom-nav un-navigation" aria-label="주 메뉴" data-material="glass">
      <motion.button
        type="button"
        className="un-dock-add"
        aria-label="새 티끌 남기기"
        whileTap={reduced?undefined:{scale:0.94}}
        whileHover={reduced?undefined:{scale:1.04}}
        transition={INTERACTION_SPRING}
        onClick={onCompose}
      >
        <Plus size={27} strokeWidth={1.8}/>
      </motion.button>
      <LayoutGroup id="tactile-bottom-nav">
        <div
          className="lab-nav-rail"
          style={{'--active-index':destinations.findIndex(([id])=>id===active),'--nav-count':destinations.length} as CSSProperties}
        >
          <span className="lab-nav-lens" aria-hidden="true"/>
          {destinations.map(([id,label])=>{
            const Icon=icons[id];
            const isActive=active===id;
            return (
              <motion.button
                type="button"
                key={id}
                aria-current={isActive?'page':undefined}
                whileTap={reduced?undefined:{scale:0.98}}
                whileHover={reduced?undefined:{scale:1.01}}
                transition={INTERACTION_SPRING}
                onClick={()=>onChange(id)}
              >
                {isActive&&(
                  <motion.span
                    layoutId="tactile-bottom-nav-pill"
                    className="tactile-nav-active-pill"
                    style={{position:'absolute',inset:'2px 4px',pointerEvents:'none'}}
                    transition={INTERACTION_SPRING}
                    aria-hidden="true"
                  />
                )}
                <Icon size={22} strokeWidth={1.7}/>
                <span>{label}</span>
              </motion.button>
            );
          })}
        </div>
      </LayoutGroup>
    </nav>
  );
}
