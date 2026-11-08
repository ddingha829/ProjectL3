import type {UnifiedLog} from './store';
import type {Person} from '@/social/model';

export const KINGDOM_KINDS=['movie','book','music'] as const;
export type KingdomKind=typeof KINGDOM_KINDS[number];
export type KingdomArea=KingdomKind|'castle';
export const KINGDOM_NAMES={castle:'티끌 왕성',movie:'시네마 마을',book:'서고 마을',music:'음유 마을'};
export const KINGDOM_MAX_LEVEL=7;
export type KingdomRecord={id:string;authorId:string;kind:KingdomKind;workId:string;title:string;image:string;createdAt:number;earned:boolean};
export type KingdomMonth={month:string;members:number;counts:Record<KingdomArea,number>;people:Pick<Person,'id'|'name'|'color'>[];records:KingdomRecord[];sealedAt?:string};
/** Calendar boundaries are identical on every member's device: Asia/Seoul. */
export function kingdomMonth(time=Date.now()){return new Date(time+9*3600000).toISOString().slice(0,7);}
export function kingdomLevel(count:number,members:number,area:KingdomArea='movie'){
 const step=Math.max(1,Math.trunc(members)||1)*(area==='castle'?2:1),total=Math.max(0,Math.trunc(count)||0),level=Math.min(7,1+Math.floor(total/step));
 return {level,step,xp:level===7?step:total%step,total,max:step*6,progress:level===7?1:(total%step)/step};
}
export function collectKingdom(logs:readonly UnifiedLog[],month:string,members:number,people:KingdomMonth['people'],now=Date.now()):KingdomMonth{
 const seen=new Set<string>(),counts={castle:0,movie:0,book:0,music:0};
 const records:KingdomRecord[]=logs.filter(l=>l.work&&KINGDOM_KINDS.includes(l.work.kind)&&kingdomMonth(l.serverPublishedAt||l.createdAt)===month&&(l.serverPublishedAt||l.createdAt)<=now)
 .sort((a,b)=>(a.serverPublishedAt||a.createdAt)-(b.serverPublishedAt||b.createdAt)||a.id.localeCompare(b.id)).map(l=>{
  const w=l.work!,key=JSON.stringify([l.authorId,w.kind,w.id]),earned=!seen.has(key);seen.add(key);
  if(earned){counts[w.kind]++;counts.castle++;}
  return {id:l.id,authorId:l.authorId,kind:w.kind,workId:w.id,title:w.title,image:w.image||l.image,createdAt:l.serverPublishedAt||l.createdAt,earned};
 }).reverse();
 return {month,members:Math.max(1,members),counts,people,records};
}
export function kingdomContributions(data:KingdomMonth,area:KingdomArea){
 const totals=new Map<string,number>();
 for(const r of data.records)if(r.earned&&(area==='castle'||r.kind===area))totals.set(r.authorId,(totals.get(r.authorId)||0)+1);
 const ids=new Set([...data.people.map(p=>p.id),...totals.keys()]);
 return [...ids].map(id=>({id,name:data.people.find(p=>p.id===id)?.name||'이전 모임원',color:data.people.find(p=>p.id===id)?.color||'#8c7963',count:totals.get(id)||0,byKind:Object.fromEntries(KINGDOM_KINDS.map(kind=>[kind,data.records.filter(r=>r.earned&&r.authorId===id&&r.kind===kind).length])) as Record<KingdomKind,number>})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,'ko'));
}
