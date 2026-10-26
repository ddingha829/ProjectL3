'use client';
import {useSyncExternalStore} from 'react';
const query='(prefers-reduced-motion: reduce)';
const subscribe=(change:()=>void)=>{const media=matchMedia(query);media.addEventListener('change',change);return()=>media.removeEventListener('change',change);};
/** React to preference changes while an icon is already moving. */
export function useMotionPreference(){return useSyncExternalStore(subscribe,()=>matchMedia(query).matches,()=>true);}
