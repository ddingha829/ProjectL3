/** Shared springs only animate visual feedback, never the app viewport geometry. */
export const INTERACTION_SPRING={type:'spring' as const,stiffness:400,damping:30};
export const OVERLAY_SPRING={type:'spring' as const,stiffness:300,damping:28};
// Multi-step icon feedback needs a tween; springs accept only two keyframes.
export const FEEDBACK_KEYFRAMES={type:'tween' as const,duration:.34,ease:'easeOut' as const};
export const instantMotion={duration:0};
