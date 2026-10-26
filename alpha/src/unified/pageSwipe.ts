import {destinations,type Destination} from './store';
export type SwipeDirection=-1|1;
export function swipeIntent(dx:number,dy:number,duration:number):SwipeDirection|null{
 if(![dx,dy,duration].every(Number.isFinite)||duration<0)return null;
 if(Math.abs(dx)<(duration<400?48:72)||Math.abs(dx)<=Math.abs(dy)*1.7)return null;
 return dx<0?1:-1;
}
export function swipeDestination(current:Destination,direction:SwipeDirection):Destination|'compose'|null{
 const index=destinations.findIndex(([id])=>id===current),next=index+direction;
 if(next<0)return current==='logs'?'compose':null;
 return destinations[next]?.[0]||null;
}
