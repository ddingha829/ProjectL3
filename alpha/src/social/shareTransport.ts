import type {LabLog} from './model';

export type TransportMode='normal'|'fail'|'paused';
export const TRANSPORT_KEY='l2_social_lab_transport_v1';
export type PublicationDocument=Pick<LabLog,'id'|'circleId'|'title'|'body'|'image'|'category'|'place'|'work'|'card'|'rating'|'good'|'bad'|'note'|'weather'|'createdAt'|'updatedAt'|'revision'|'design'>;
export type PublishRequest={operationId:string;actorId:string;log:PublicationDocument};
export type PublishAck={operationId:string;sharedAt:number;mode:'simulation'|'server'};
export function publicationDocument(log:LabLog):PublicationDocument{const{id,circleId,title,body,image,category,place,work,card,rating,good,bad,note,weather,createdAt,updatedAt,revision,design}=log;return{id,circleId,title,body,image,category,place,work,card,rating,good,bad,note,weather,createdAt,updatedAt,revision,design};}
/** Future server adapter must authenticate, enforce membership and deduplicate operationId. */
export interface PublicationGateway{publish(request:PublishRequest,signal:AbortSignal):Promise<PublishAck>;}
export class SimulatedPublicationGateway implements PublicationGateway{
 private acknowledgements=new Map<string,PublishAck>();
 constructor(private mode:TransportMode,private delay=900){}
 async publish(request:PublishRequest,signal:AbortSignal):Promise<PublishAck>{
  await new Promise<void>((resolve,reject)=>{if(signal.aborted){reject(new DOMException('Cancelled','AbortError'));return;}const abort=()=>{clearTimeout(timer);reject(new DOMException('Cancelled','AbortError'));};const timer=setTimeout(()=>{signal.removeEventListener('abort',abort);resolve();},this.delay);signal.addEventListener('abort',abort,{once:true});});
  if(this.mode!=='normal')throw new Error('모의 전송에 실패했어요. 내용은 이 기기에 저장되어 있어요.');
  const previous=this.acknowledgements.get(request.operationId);if(previous)return previous;
  const ack:PublishAck={operationId:request.operationId,sharedAt:Date.now(),mode:'simulation'};this.acknowledgements.set(request.operationId,ack);return ack;
 }
}
