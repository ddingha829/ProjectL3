import type {UnifiedState,UnifiedLog} from './store';
import {audienceIds} from './store';
import {isWork} from '@/social/taste';
export const mosaicWork=(log:UnifiedLog)=>isWork(log.work);
export type MosaicPlacement={logId:string;slotIndex:number;placedBy:string;placedAt:number};
export type MosaicBoardState={personalBoard:Record<number,string>;groupBoards:Record<string,Record<number,MosaicPlacement>>};
export const emptyMosaic=():MosaicBoardState=>({personalBoard:{},groupBoards:{}});
export const MOSAIC_PAGE_SIZE=25,MAX_MOSAIC_SLOTS=500;
const slot=(value:string)=>/^(0|[1-9]\d*)$/.test(value)&&Number(value)>=0&&Number(value)<MAX_MOSAIC_SLOTS;
export function validMosaic(value:unknown):value is MosaicBoardState{
 if(!value||typeof value!=='object')return false;const b=value as MosaicBoardState;
 if(!b.personalBoard||Array.isArray(b.personalBoard)||typeof b.personalBoard!=='object'||!b.groupBoards||Array.isArray(b.groupBoards)||typeof b.groupBoards!=='object'||Object.keys(b.groupBoards).length>100)return false;
 if(Object.entries(b.personalBoard).some(([i,id])=>!slot(i)||typeof id!=='string')||new Set(Object.values(b.personalBoard)).size!==Object.values(b.personalBoard).length)return false;
 return Object.entries(b.groupBoards).every(([id,rows])=>id.length<=100&&rows&&typeof rows==='object'&&!Array.isArray(rows)&&Object.entries(rows).every(([i,p])=>slot(i)&&p&&typeof p.logId==='string'&&p.slotIndex===Number(i)&&typeof p.placedBy==='string'&&Number.isFinite(p.placedAt))&&new Set(Object.values(rows).map(p=>p.logId)).size===Object.values(rows).length);
}
export const boardRows=(state:UnifiedState,scope:string):Record<number,MosaicPlacement>=>scope==='mine'?Object.fromEntries(Object.entries(state.mosaic.personalBoard).map(([index,logId])=>[index,{logId,slotIndex:Number(index),placedBy:state.logs.find(l=>l.id===logId)?.authorId||'me',placedAt:0}])):state.mosaic.groupBoards[scope]||{};
const eligible=(state:UnifiedState,scope:string,actorId:string,log:UnifiedLog)=>mosaicWork(log)&&(scope==='mine'?log.authorId===actorId:state.circles.some(c=>c.id===scope&&c.members.includes(actorId))&&audienceIds(log).includes(scope));
/** Placement is independent of log content; every mutation rechecks scope and ownership. */
export function placeMosaic(state:UnifiedState,scope:string,actorId:string,logId:string,target:number):UnifiedState{
 if(!Number.isInteger(target)||target<0||target>=MAX_MOSAIC_SLOTS)throw Error('이 칸에는 놓을 수 없어요.');
 const log=state.logs.find(l=>l.id===logId);if(!log||!eligible(state,scope,actorId,log)||log.authorId!==actorId)throw Error('내가 남긴 로그만 옮길 수 있어요.');
 const rows=Object.fromEntries(Object.entries(boardRows(state,scope)).filter(([,p])=>{const l=state.logs.find(l=>l.id===p.logId);return l&&eligible(state,scope,actorId,l);}));
 const old=Object.entries(rows).find(([,p])=>p.logId===logId),occupied=rows[target];
 if(occupied?.logId===logId)return state;
 if(occupied&&(scope!=='mine'||!old))throw Error('이미 채워진 칸이에요. 빈 칸을 골라주세요.');
 if(old){delete rows[old[0]];if(occupied)rows[old[0]]={...occupied,slotIndex:Number(old[0])};}
 rows[target]={logId,slotIndex:target,placedBy:actorId,placedAt:Date.now()};
 return {...state,mosaic:scope==='mine'?{...state.mosaic,personalBoard:Object.fromEntries(Object.entries(rows).map(([i,p])=>[i,p.logId]))}:{...state.mosaic,groupBoards:{...state.mosaic.groupBoards,[scope]:rows}}};
}
export function removeMosaic(state:UnifiedState,scope:string,actorId:string,logId:string):UnifiedState{
 const log=state.logs.find(l=>l.id===logId);if(!log||log.authorId!==actorId)throw Error('내 타일만 보드에서 뺄 수 있어요.');
 if(scope==='mine')return{...state,mosaic:{...state.mosaic,personalBoard:Object.fromEntries(Object.entries(state.mosaic.personalBoard).filter(([,id])=>id!==logId))}};
 if(!state.circles.some(c=>c.id===scope&&c.members.includes(actorId)))throw Error('이 모임에 접근할 수 없어요.');
 return{...state,mosaic:{...state.mosaic,groupBoards:{...state.mosaic.groupBoards,[scope]:Object.fromEntries(Object.entries(state.mosaic.groupBoards[scope]||{}).filter(([,p])=>p.logId!==logId))}}};
}
