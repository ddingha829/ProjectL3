export type BentoKind='daily'|'dining'|'movie'|'book'|'music'|'note';
export const BENTO_RATIOS:Record<BentoKind,number>={daily:4/5,dining:4/5,movie:2/3,book:2/3,music:4/5,note:2};

/** Consecutive cards share a row height. Artwork keeps its own aspect ratio.
 * An unpaired card becomes a wide feature instead of leaving an empty half-row. */
export function bentoLayout(kinds:readonly BentoKind[],width:number,gap=12){
 const column=Math.max(0,(width-gap)/2),tiles:{top:number;left:number;width:number;height:number}[]=[];
 let top=0;
 for(let index=0;index<kinds.length;){
  const kind=kinds[index],next=kinds[index+1];
  if(kind==='note'||!next||next==='note'){
   const height=width/2;tiles.push({top,left:0,width,height});top+=height+gap;index++;continue;
  }
  const height=column/Math.min(BENTO_RATIOS[kind],BENTO_RATIOS[next]);
  tiles.push({top,left:0,width:column,height},{top,left:column+gap,width:column,height});
  top+=height+gap;index+=2;
 }
 return {tiles,height:kinds.length?top-gap:0};
}
