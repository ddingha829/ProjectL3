export type BentoKind='daily'|'dining'|'movie'|'book'|'music'|'note';
export const BENTO_RATIOS:Record<BentoKind,number>={daily:4/5,dining:4/5,movie:2/3,book:3/4,music:1,note:2};

/** Place source order into the next available column, without backfilling/reordering.
 * A wide note starts below both columns and provides a quiet visual break. */
export function bentoLayout(kinds:readonly BentoKind[],width:number,gap=12){
 const column=Math.max(0,(width-gap)/2),bottoms=[0,0];
 const tiles=kinds.map(kind=>{
  const wide=kind==='note',slot=bottoms[0]<=bottoms[1]?0:1;
  const top=wide?Math.max(...bottoms):bottoms[slot];
  const tileWidth=wide?width:column,height=tileWidth/BENTO_RATIOS[kind];
  const tile={top,left:wide?0:slot*(column+gap),width:tileWidth,height};
  if(wide)bottoms.fill(top+height+gap);else bottoms[slot]=top+height+gap;
  return tile;
 });
 return {tiles,height:kinds.length?Math.max(...bottoms)-gap:0};
}
