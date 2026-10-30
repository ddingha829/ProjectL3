export const NEW_CARD_LIMIT=4;
export function newCardIds(items:readonly {id:string;createdAt:number}[],since:number,openedAt:number,seen:ReadonlySet<string>,remaining=NEW_CARD_LIMIT){
 if(!Number.isFinite(since)||since<=0||since>=openedAt||remaining<=0)return [];
 return [...items].filter(item=>Number.isFinite(item.createdAt)&&item.createdAt>since&&item.createdAt<=openedAt&&!seen.has(item.id))
  .sort((a,b)=>b.createdAt-a.createdAt||b.id.localeCompare(a.id)).filter((item,index,array)=>array.findIndex(v=>v.id===item.id)===index)
  .slice(0,Math.min(NEW_CARD_LIMIT,remaining)).map(item=>item.id);
}
