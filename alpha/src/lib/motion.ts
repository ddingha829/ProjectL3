export type MotionPreference = 'auto' | 'on' | 'off';
export const MOTION_EVENT = 'l2-motion-change';

export function allowsMotion(): boolean {
  if (typeof window === 'undefined') return false;
  const preference = document.documentElement.dataset.motion;
  return preference === 'on' || preference !== 'off' && !matchMedia('(prefers-reduced-motion: reduce)').matches;
}
