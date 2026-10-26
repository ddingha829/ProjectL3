import {swipeAxis} from './pageSwipe';
const CARD_KEY='__l2_card_viewer';
export function cardHistoryId(state:unknown):string{
 const value=state&&typeof state==='object'?(state as Record<string,unknown>)[CARD_KEY]:undefined;
 return typeof value==='string'&&value.length>0&&value.length<=200?value:'';
}
export function cardHistoryState(state:unknown,id:string):Record<string,unknown>{
 const next=state&&typeof state==='object'&&!Array.isArray(state)?{...state}:{};
 if(id)(next as Record<string,unknown>)[CARD_KEY]=id;else delete (next as Record<string,unknown>)[CARD_KEY];
 return next;
}
export function isCardBackSwipe(dx:number,dy:number,duration:number,width:number):boolean{
 if(![dx,dy,duration,width].every(Number.isFinite)||duration<0||width<=0)return false;
 return dx>0&&swipeAxis(dx,dy)==='horizontal'&&dx>=(duration<350?48:Math.max(72,Math.min(120,width*.22)));
}
