'use client';
import {useSyncExternalStore} from 'react';
import {useMotionPreference} from '@/lib/useMotionPreference';
type Connection=EventTarget&{saveData?:boolean};
const connection=()=>(navigator as Navigator&{connection?:Connection}).connection;
const subscribe=(change:()=>void)=>{const value=connection();value?.addEventListener('change',change);return()=>value?.removeEventListener('change',change);};
export function useVideoAutoplay(){const reduced=useMotionPreference(),saveData=useSyncExternalStore(subscribe,()=>!!connection()?.saveData,()=>true);return !reduced&&!saveData;}
