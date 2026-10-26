import type {LabLog,LabState} from './model';

export type Publication={operationId:string;status:'queued'|'sending'|'failed'|'confirmed';mode:'simulation'|'server';attempts:number;updatedAt:number;sharedAt?:number;error?:string;attemptId?:string;leaseUntil?:number};
export const isPublished=(log:LabLog)=>Boolean(log.circleId&&(!log.publication||log.publication.status==='confirmed'));
export function enqueuePublication(log:LabLog,now=Date.now()):LabLog{
 if(!log.circleId){const {publication:_publication,...privateLog}=log;return privateLog;}
 return{...log,publication:{operationId:crypto.randomUUID(),status:'queued',mode:'simulation',attempts:0,updatedAt:now}};
}
export const isOutstanding=(log:LabLog)=>Boolean(log.circleId&&log.publication&&log.publication.status!=='confirmed');
export function retryPublication(state:LabState,id:string,actor:string,now=Date.now()):LabState{
 const log=state.logs.find(log=>log.id===id);if(!log||log.authorId!==actor||!isOutstanding(log)||log.publication?.status==='sending')return state;
 if(!state.circles.some(circle=>circle.id===log.circleId&&circle.members.includes(actor)))throw new Error('현재 참여 중인 모임에만 공유할 수 있어요. 나만 보관으로 바꿀 수 있어요.');
 return{...state,logs:state.logs.map(row=>row.id===id?{...row,publication:{...row.publication!,status:'queued',error:undefined,attemptId:undefined,leaseUntil:undefined,updatedAt:now}}:row)};
}
export const publicationLabel=(log:LabLog)=>!log.publication?'':({queued:'공유 대기',sending:log.publication.mode==='simulation'?'모의 전송 중':'공유 중',failed:'공유 실패',confirmed:log.publication.mode==='simulation'?'모의 공유 완료':'공유 완료'}[log.publication.status]);
