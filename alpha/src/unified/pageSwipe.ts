import {destinations,type Destination} from './store';
export type SwipeDirection=-1|1;
export function swipeAxis(dx:number,dy:number):'horizontal'|'vertical'|'pending'{
 if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)*1.1)return 'vertical';
 if(Math.abs(dx)>12&&Math.abs(dx)>Math.abs(dy)*1.45)return 'horizontal';
 return 'pending';
}
export function swipeOffset(dx:number,width:number,canMove:boolean):number{
 const limit=Math.max(1,width)*.9;
 return canMove?Math.sign(dx)*Math.min(Math.abs(dx),limit):dx*.18;
}
export function swipeIntent(dx:number,dy:number,duration:number):SwipeDirection|null{
 if(![dx,dy,duration].every(Number.isFinite)||duration<0)return null;
 if(Math.abs(dx)<(duration<400?48:64)||Math.abs(dx)<=Math.abs(dy)*1.45)return null;
 return dx<0?1:-1;
}
export function swipeDestination(current:Destination,direction:SwipeDirection):Destination|'compose'|null{
 const index=destinations.findIndex(([id])=>id===current),next=index+direction;
 if(next<0)return current==='logs'?'compose':null;
 return destinations[next]?.[0]||null;
}
