import type {LabLog,LabState} from './model';
import {canRead} from './model';
export type Work={id:string;kind:'movie'|'book';title:string;image:string;creator?:string;year?:string;mediaType?:'movie'|'tv'|'book';overview?:string;referenceRating?:number;url?:string};
export type TasteIntent={actorId:string;work:Work;sourceLogId?:string;createdAt:number};
export const WORKS:Work[]=[
 {id:'demo:movie:afternoon',kind:'movie',title:'오후의 장면',image:'/images/cinema.jpg',creator:'가상 작품',year:'2026'},
 {id:'demo:movie:season',kind:'movie',title:'우리가 걷던 계절',image:'/images/editorial_cinema_png_1792129493283.jpg',creator:'가상 드라마',year:'2026'},
 {id:'demo:book:heart',kind:'book',title:'천천히 모은 마음',image:'',creator:'가상 작가',year:'2026'},
 {id:'demo:book:today',kind:'book',title:'아무튼, 오늘',image:'',creator:'가상 작가',year:'2026'},
];
export const isWork=(value:unknown):value is Work=>{const w=value as Work;return Boolean(w&&typeof w.id==='string'&&w.id.length<=150&&['movie','book'].includes(w.kind)&&typeof w.title==='string'&&w.title.length<=150&&typeof w.image==='string'&&w.image.length<=500000&&(w.creator===undefined||typeof w.creator==='string')&&(w.year===undefined||typeof w.year==='string')&&(w.mediaType===undefined||['movie','tv','book'].includes(w.mediaType))&&(w.overview===undefined||typeof w.overview==='string'&&w.overview.length<=2000)&&(w.referenceRating===undefined||Number.isFinite(w.referenceRating)&&w.referenceRating>=0&&w.referenceRating<=10)&&(w.url===undefined||typeof w.url==='string'&&w.url.length<=2000&&/^https:\/\//.test(w.url)));};
export function workOf(log:LabLog):Work|undefined{return log.work;}
export function groupWorks(logs:LabLog[]){const groups=new Map<string,{work:Work;logs:LabLog[]}>();for(const log of logs){const work=workOf(log);if(!work)continue;const group=groups.get(work.id)||{work,logs:[]};group.logs.push(log);groups.set(work.id,group);}return [...groups.values()].sort((a,b)=>b.logs[0].createdAt-a.logs[0].createdAt);}
export function toggleIntent(state:LabState,actorId:string,logId:string,now=Date.now()):LabState{
 const log=state.logs.find(l=>l.id===logId);if(!log||!canRead(log,actorId,state)||!log.work)throw Error('지금 볼 수 있는 작품 로그에서 담아주세요.');
 const intents=state.intents||[],exists=intents.some(i=>i.actorId===actorId&&i.work.id===log.work!.id);
 return {...state,intents:exists?intents.filter(i=>!(i.actorId===actorId&&i.work.id===log.work!.id)):[...intents,{actorId,work:{...log.work},sourceLogId:log.id,createdAt:now}]};
}
export function monthKey(time:number){const d=new Date(time);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
export function monthWorks(logs:LabLog[],actorId:string,month:string){return groupWorks(logs.filter(l=>l.authorId===actorId&&monthKey(l.createdAt)===month));}
