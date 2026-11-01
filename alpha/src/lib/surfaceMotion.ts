/** Shared springs only animate visual feedback, never the app viewport geometry. */
export const INTERACTION_SPRING={type:'spring' as const,stiffness:400,damping:30};
export const OVERLAY_SPRING={type:'spring' as const,stiffness:300,damping:28};
export const instantMotion={duration:0};
