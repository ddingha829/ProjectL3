// Adapted from AnimateIcons lu-save: https://animateicons.in/r/lu-save.json
"use client";

import type { Variants } from "motion/react";
import {
 LazyMotion,
 domMin,
 m,
 useAnimation,
} from "motion/react";
import {
 forwardRef,
 useCallback,
 useImperativeHandle,
 useRef,
 useEffect,
 useSyncExternalStore,
 type HTMLAttributes,
} from "react";
const motionQuery = "(prefers-reduced-motion: reduce)";
const subscribeMotion = (change: () => void) => {
 const query = window.matchMedia(motionQuery);
 query.addEventListener("change", change);
 return () => query.removeEventListener("change", change);
};
const reducedSnapshot = () => window.matchMedia(motionQuery).matches;
export interface SaveIconHandle {
 startAnimation: () => void;
 stopAnimation: () => void;
}

interface SaveIconProps extends Omit<
 HTMLAttributes<HTMLSpanElement>,
 | "color"
 | "onDrag"
 | "onDragStart"
 | "onDragEnd"
 | "onAnimationStart"
 | "onAnimationEnd"
 | "onAnimationIteration"
> {
 size?: number;
 duration?: number;
 isAnimated?: boolean;
 color?: string;
}

const SaveIcon = forwardRef<SaveIconHandle, SaveIconProps>(
 (
  {
   onMouseEnter,
   onMouseLeave,
   className,
   size = 24,
   duration = 1,
   isAnimated = true,
   color,
   ...props
  },
  ref,
 ) => {
  const controls = useAnimation();
  const reduced = useSyncExternalStore(subscribeMotion, reducedSnapshot, () => true);
  const isControlled = useRef(false);
  useEffect(() => {
   if (reduced) { controls.stop(); controls.set("normal"); }
  }, [reduced, controls]);

  useImperativeHandle(ref, () => {
   isControlled.current = true;
   return {
    startAnimation: () => {
     if (reduced) { controls.stop(); controls.set("normal"); }
     else controls.start("animate");
    },
    stopAnimation: () => {
     if (reduced) { controls.stop(); controls.set("normal"); }
     else controls.start("normal");
    },
   };
  });

  const handleEnter = useCallback(
   (e?: React.MouseEvent<HTMLSpanElement>) => {
    if (!isAnimated || reduced) return;
    if (!isControlled.current) controls.start("animate");
    else onMouseEnter?.(e as any);
   },
   [controls, reduced, isAnimated, onMouseEnter],
  );

  const handleLeave = useCallback(
   (e?: React.MouseEvent<HTMLSpanElement>) => {
    if (!isControlled.current) controls.start("normal");
    else onMouseLeave?.(e as any);
   },
   [controls, onMouseLeave],
  );

  const shutterVariants: Variants = {
   normal: { x: 0 },
   animate: {
    x: [0, 2, -0.4, 0],
    transition: {
     duration: 0.6 * duration,
     ease: "easeInOut",
     times: [0, 0.35, 0.7, 1],
    },
   },
  };

  const labelVariants: Variants = {
   normal: { y: 0 },
   animate: {
    y: [0, -1, -0.2, 0],
    transition: {
     duration: 0.6 * duration,
     ease: "easeInOut",
     times: [0, 0.35, 0.7, 1],
    },
   },
  };

  return (
   <LazyMotion features={domMin} strict>
    <m.span
     className={["l2-save-icon", className].filter(Boolean).join(" ")}
     onMouseEnter={handleEnter}
     onMouseLeave={handleLeave}
     {...props}
     style={{ color, ...props.style }}
    >
     <m.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      animate={controls}
      initial="normal"
     >
      <path d="M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
      <m.path
       d="M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7"
       variants={labelVariants}
      />
      <m.path d="M7 3v4a1 1 0 0 0 1 1h7" variants={shutterVariants} />
     </m.svg>
    </m.span>
   </LazyMotion>
  );
 },
);

SaveIcon.displayName = "SaveIcon";
export { SaveIcon };
