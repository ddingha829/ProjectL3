import type {LabLog} from './model';
export type BentoKind='daily'|'dining'|'movie'|'book'|'music'|'note';
export const BENTO_RATIOS:Record<BentoKind,number>={daily:4/5,dining:4/5,movie:2/3,book:3/4,music:3/4,note:2};
export const BENTO_RATIO_LABELS:Record<BentoKind,string>={daily:'4:5',dining:'4:5',movie:'2:3',book:'3:4',music:'3:4',note:'2:1'};
export const bentoImage=(log:LabLog)=>log.image||log.work?.image||'';
export function bentoKind(log:LabLog):BentoKind{return log.category==='movie'?'movie':log.category==='book'?'book':log.category==='music'?'music':bentoImage(log)?log.category:'note';}
export const hasBentoFront=(log:LabLog)=>bentoKind(log)!=='note';
/** Text-only details retain enough space for the complete review and pagination. */
export const cardCanvasHeight=(log:LabLog)=>hasBentoFront(log)?420/BENTO_RATIOS[bentoKind(log)]:672;
/** Equal-width columns retain each topic's height ratio and DOM chronology.
 * Notes span both columns. Appending cannot resize or move existing cards. */
export function bentoLayout(kinds:readonly BentoKind[],width:number,gap=8.4){
 const tiles:{top:number;left:number;width:number;height:number}[]=[],bottoms=[0,0],columnWidth=Math.max(0,width-gap)/2;
 for(const kind of kinds){
  if(kind==='note'){
   const top=Math.max(...bottoms),height=width/BENTO_RATIOS.note;
   tiles.push({top,left:0,width,height});bottoms.fill(top+height+gap);
  }else{
   const column=bottoms[0]<=bottoms[1]?0:1,top=bottoms[column],height=columnWidth/BENTO_RATIOS[kind];
   tiles.push({top,left:column*(columnWidth+gap),width:columnWidth,height});bottoms[column]=top+height+gap;
  }
 }
 return {tiles,height:kinds.length?Math.max(...bottoms)-gap:0};
}
