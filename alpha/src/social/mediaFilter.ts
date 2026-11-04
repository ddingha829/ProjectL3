import type {PhotoSettings} from '@/unified/store';
/** Render-time correction only: never creates or uploads another media file. */
export const mediaFilter=(photo?:PhotoSettings)=>photo?`saturate(${photo.saturation/100}) brightness(${photo.brightness/100}) contrast(${photo.contrast/100})`:undefined;
export const MEDIA_PRESETS=[
 {name:'원본',saturation:100,brightness:100,contrast:100},
 {name:'선명',saturation:120,brightness:103,contrast:112},
 {name:'부드럽게',saturation:90,brightness:108,contrast:90},
 {name:'시네마',saturation:80,brightness:96,contrast:118},
 {name:'흑백',saturation:0,brightness:103,contrast:110},
] as const;
