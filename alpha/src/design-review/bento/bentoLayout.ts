export type BentoKind='daily'|'dining'|'movie'|'book'|'music'|'note';
export const BENTO_RATIOS:Record<BentoKind,number>={daily:4/5,dining:4/5,movie:2/3,book:3/4,music:1,note:2};
export const BENTO_RATIO_LABELS:Record<BentoKind,string>={daily:'4:5',dining:'4:5',movie:'2:3',book:'3:4',music:'1:1',note:'2:1'};

/** Share a row height by varying widths, preserving every card's topic ratio.
 * A note or an unpaired card occupies a full row at its own unchanged ratio. */
export function bentoLayout(kinds:readonly BentoKind[],width:number,gap=12){
 const tiles:{top:number;left:number;width:number;height:number}[]=[];
 let top=0;
 for(let index=0;index<kinds.length;){
  const kind=kinds[index],next=kinds[index+1];
  if(kind==='note'||!next||next==='note'){
   const height=width/BENTO_RATIOS[kind];tiles.push({top,left:0,width,height});top+=height+gap;index++;continue;
  }
  const height=Math.max(0,width-gap)/(BENTO_RATIOS[kind]+BENTO_RATIOS[next]);
  const firstWidth=height*BENTO_RATIOS[kind],secondWidth=height*BENTO_RATIOS[next];
  tiles.push({top,left:0,width:firstWidth,height},{top,left:firstWidth+gap,width:secondWidth,height});
  top+=height+gap;index+=2;
 }
 return {tiles,height:kinds.length?top-gap:0};
}
