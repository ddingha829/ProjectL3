import type {CardAppearance} from '@/types/l2';
import type {PhotoCrop} from '@/lib/photoCrop';
export interface CardDesignSnapshot {appearance:CardAppearance;photo:PhotoCrop}
/** Session-only history. Repeated slider events form one undoable gesture. */
export class DesignHistory<T> {
  private past:T[]=[];
  private future:T[]=[];
  private group='';
  private changedAt=0;
  get canUndo(){return this.past.length>0;}
  get canRedo(){return this.future.length>0;}
  record(before:T,after:T,group='',now=Date.now()){
    if(JSON.stringify(before)===JSON.stringify(after))return false;
    const coalescing=Boolean(group&&group===this.group&&now-this.changedAt<=600&&!this.future.length);
    if(!coalescing){this.past.push(structuredClone(before));if(this.past.length>40)this.past.shift();}
    else if(JSON.stringify(this.past.at(-1))===JSON.stringify(after)){this.past.pop();group='';}
    this.future=[];this.group=group;this.changedAt=now;return true;
  }
  undo(current:T){if(!this.canUndo)return null;this.future.push(structuredClone(current));this.group='';return structuredClone(this.past.pop()!);}
  redo(current:T){if(!this.canRedo)return null;this.past.push(structuredClone(current));this.group='';return structuredClone(this.future.pop()!);}
}
