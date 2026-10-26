import {readState,seedState,STORAGE_KEY,type LabState} from './model';

/** Durable local cache. Network publication is a separate asynchronous port. */
export interface LabRepository{
 snapshot():LabState;
 update(change:(current:LabState)=>LabState):LabState;
 subscribe(listener:(state:LabState)=>void):()=>void;
 dispose():void;
}
export class RepositoryWriteError extends Error{}
const storageError=(error:unknown)=>new RepositoryWriteError(error instanceof DOMException&&error.name==='QuotaExceededError'?'기기에 저장할 공간이 부족해요. 사진이나 로그를 줄인 뒤 다시 시도해주세요.':error instanceof Error?error.message:'기기에 저장하지 못했어요. 다시 시도해주세요.');
export class BrowserLabRepository implements LabRepository{
 private current:LabState;
 private listeners=new Set<(state:LabState)=>void>();
 constructor(private storage:Pick<Storage,'getItem'|'setItem'>,private events?:Pick<Window,'addEventListener'|'removeEventListener'>){
  this.current=seedState();this.current=this.readLatest();events?.addEventListener('storage',this.onStorage as EventListener);
 }
 private readLatest(){const raw=this.storage.getItem(STORAGE_KEY);if(raw===null)return this.current;const state=readState(raw);if(!state)throw new Error('기기에 저장된 정보를 읽지 못했어요. 기존 데이터는 덮어쓰지 않았어요.');return state;}
 private emit(){this.listeners.forEach(listener=>listener(this.current));}
 private onStorage=(event:Event)=>{const e=event as StorageEvent;if(e.key!==STORAGE_KEY)return;const state=readState(e.newValue);if(state){this.current=state;this.emit();}};
 snapshot(){return this.current;}
 update(change:(current:LabState)=>LabState){
  let current:LabState;try{current=this.readLatest();}catch(e){throw storageError(e);}const next=change(current);if(next===current){this.current=current;return current;}
  try{const raw=JSON.stringify(next);if(!readState(raw)||new Set(next.logs.map(log=>log.id)).size!==next.logs.length)throw new Error('저장 가능한 로그 수나 데이터 형식을 확인해주세요. 기존 기록은 유지했어요.');this.storage.setItem(STORAGE_KEY,raw);}catch(e){throw storageError(e);}
  this.current=next;this.emit();return next;
 }
 subscribe(listener:(state:LabState)=>void){this.listeners.add(listener);return()=>{this.listeners.delete(listener);};}
 dispose(){this.events?.removeEventListener('storage',this.onStorage as EventListener);this.listeners.clear();}
}
