import type {LabLog} from './model';
export type BentoKind='daily'|'dining'|'movie'|'book'|'music'|'note';
export const BENTO_RATIOS:Record<BentoKind,number>={daily:4/5,dining:4/5,movie:2/3,book:3/4,music:1,note:2};
export const BENTO_RATIO_LABELS:Record<BentoKind,string>={daily:'4:5',dining:'4:5',movie:'2:3',book:'3:4',music:'1:1',note:'2:1'};
export const bentoImage=(log:LabLog)=>log.image||log.work?.image||'';
export function bentoKind(log:LabLog):BentoKind{return log.category==='movie'?'movie':log.category==='book'?'book':bentoImage(log)?log.category:'note';}
export const hasBentoFront=(log:LabLog)=>bentoKind(log)!=='note';
/** Text-only details retain enough space for the complete review and pagination. */
export const cardCanvasHeight=(log:LabLog)=>hasBentoFront(log)?420/BENTO_RATIOS[bentoKind(log)]:672;
export function bentoRows(kinds:readonly BentoKind[]):number[][]{
 const rows:number[][]=[];
 for(let index=0;index<kinds.length;){
  if(kinds[index]==='note'||!kinds[index+1]||kinds[index+1]==='note'){rows.push([index]);index++;}
  else{rows.push([index,index+1]);index+=2;}
 }
 return rows;
}
/** Justified pairs preserve ratios, chronological order and aligned bottoms.
 * A note or an orphan fills its row, without an empty second column. */
export function bentoLayout(kinds:readonly BentoKind[],width:number,gap=12){
 const tiles:{top:number;left:number;width:number;height:number}[]=[];let top=0;
 for(const row of bentoRows(kinds)){
  const [first,second]=row,kind=kinds[first];
  if(second===undefined){const height=width/BENTO_RATIOS[kind];tiles.push({top,left:0,width,height});top+=height+gap;}
  else{const height=Math.max(0,width-gap)/(BENTO_RATIOS[kind]+BENTO_RATIOS[kinds[second]]),firstWidth=height*BENTO_RATIOS[kind];tiles.push({top,left:0,width:firstWidth,height},{top,left:firstWidth+gap,width:height*BENTO_RATIOS[kinds[second]],height});top+=height+gap;}
 }
 return {tiles,height:kinds.length?top-gap:0};
}
