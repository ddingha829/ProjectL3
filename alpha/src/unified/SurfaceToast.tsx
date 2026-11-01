'use client';
import {motion,useIsPresent} from 'motion/react';
import {Check} from 'lucide-react';
import {useMotionPreference} from '@/lib/useMotionPreference';
import {OVERLAY_SPRING,instantMotion} from '@/lib/surfaceMotion';

export default function SurfaceToast({message}:{message:string}){
 const reduced=useMotionPreference(),present=useIsPresent();
 // The anchor owns fixed positioning; Motion owns only the inner transform.
 return <div className="un-toast-anchor" aria-hidden={!present}>
  <motion.div className="lab-toast un-toast" role={present?'status':undefined} initial={reduced?false:{opacity:0,y:10,scale:.98}} animate={{opacity:1,y:0,scale:1}} exit={{opacity:0,y:6,scale:.98}} transition={reduced?instantMotion:OVERLAY_SPRING}>
   <Check size={16} aria-hidden="true"/>{message}
  </motion.div>
 </div>;
}
