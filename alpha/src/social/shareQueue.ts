import type {LabRepository} from './repository';
import type {LabLog,LabState} from './model';
import type {PublicationGateway} from './shareTransport';
import {publicationDocument} from './shareTransport';
type Options={actorId:string;online:()=>boolean;paused?:boolean;onError?:(message:string)=>void;exclusive?:(job:()=>Promise<void>)=>Promise<void>};
const leaseMs=6000;
/** One durable job per log revision; callbacks cannot resurrect edited/withdrawn/deleted logs. */
export class ShareQueue{
 private stopped=false;private busy=false;private controller:AbortController|null=null;private timer:ReturnType<typeof setTimeout>|undefined;private unsubscribe:()=>void=()=>{};private active:{id:string;attemptId:string;operationId:string}|null=null;
 constructor(private repository:LabRepository,private gateway:PublicationGateway,private options:Options){}
 start(){this.unsubscribe=this.repository.subscribe(()=>this.wake());this.wake();}
 wake(){if(this.stopped||this.busy)return;clearTimeout(this.timer);this.timer=setTimeout(()=>void this.pump(),0);}
 private available(log:LabLog,now:number){const p=log.publication;return log.authorId===this.options.actorId&&Boolean(log.circleId)&&p&&(p.status==='queued'||p.status==='sending'&&(p.leaseUntil||0)<=now);}
 private async pump(){
  if(this.stopped||this.busy||this.options.paused||!this.options.online())return;this.busy=true;
  try{if(this.options.exclusive)await this.options.exclusive(()=>this.sendOne());else await this.sendOne();}catch(e){this.options.onError?.(e instanceof Error?e.message:'전송 상태를 저장하지 못했어요.');}
  finally{this.busy=false;if(!this.stopped){const waiting=this.repository.snapshot().logs.some(log=>log.authorId===this.options.actorId&&log.circleId&&(log.publication?.status==='queued'||log.publication?.status==='sending'));if(waiting)this.timer=setTimeout(()=>void this.pump(),500);}}
 }
 private async sendOne(){
  if(this.stopped)return;let job:LabLog|undefined;const attemptId=crypto.randomUUID();
  this.repository.update(state=>{
   const log=state.logs.find(row=>this.available(row,Date.now()));if(!log)return state;
   const allowed=state.circles.some(circle=>circle.id===log.circleId&&circle.members.includes(this.options.actorId));
   if(!allowed)return{...state,logs:state.logs.map(row=>row.id===log.id?{...row,publication:{...row.publication!,status:'failed',error:'현재 참여 중인 모임이 아니에요. 나만 보관으로 바꿔주세요.',updatedAt:Date.now(),leaseUntil:undefined}}:row)};
   job={...log,publication:{...log.publication!,status:'sending',attempts:log.publication!.attempts+1,attemptId,leaseUntil:Date.now()+leaseMs,error:undefined,updatedAt:Date.now()}};
   return{...state,logs:state.logs.map(row=>row.id===job!.id?job!:row)};
  });
  if(!job)return;const item:LabLog=job;this.active={id:item.id,attemptId,operationId:item.publication!.operationId};this.controller=new AbortController();
  const change=(update:(log:LabLog,state:LabState)=>LabLog)=>this.repository.update(state=>({...state,logs:state.logs.map(log=>log.id===item.id&&log.authorId===this.options.actorId&&log.circleId===item.circleId&&log.publication?.operationId===item.publication!.operationId&&log.publication?.attemptId===attemptId?update(log,state):log)}));
  try{
   const ack=await this.gateway.publish({operationId:item.publication!.operationId,actorId:this.options.actorId,log:publicationDocument(item)},this.controller.signal);
   if(this.stopped)return;
   if(ack.operationId!==item.publication!.operationId||!Number.isFinite(ack.sharedAt)||!['simulation','server'].includes(ack.mode))throw new Error('전송 응답을 확인하지 못했어요. 다시 시도해주세요.');
   change((log,state)=>state.circles.some(circle=>circle.id===log.circleId&&circle.members.includes(this.options.actorId))?{...log,publication:{...log.publication!,status:'confirmed',mode:ack.mode,sharedAt:ack.sharedAt,updatedAt:Date.now(),error:undefined,leaseUntil:undefined}}:{...log,publication:{...log.publication!,status:'failed',updatedAt:Date.now(),error:'모임 참여 상태가 바뀌었어요. 나만 보관으로 바꿔주세요.',leaseUntil:undefined}});
  }catch(e){if(!this.stopped)change(log=>({...log,publication:{...log.publication!,status:'failed',updatedAt:Date.now(),error:e instanceof Error?e.message:'모의 전송에 실패했어요.',leaseUntil:undefined}}));}
  finally{this.active=null;this.controller=null;}
 }
 stop(){
  this.stopped=true;clearTimeout(this.timer);this.unsubscribe();this.controller?.abort();const job=this.active;
  if(job)try{this.repository.update((state:LabState)=>({...state,logs:state.logs.map(log=>log.id===job.id&&log.publication?.operationId===job.operationId&&log.publication?.attemptId===job.attemptId&&log.publication.status==='sending'?{...log,publication:{...log.publication,status:'queued',leaseUntil:undefined,attemptId:undefined,updatedAt:Date.now()}}:log)}));}catch{/* Persisted lease permits recovery after a crash or storage failure. */}
 }
}
