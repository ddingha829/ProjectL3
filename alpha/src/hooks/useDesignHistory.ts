'use client';
import {useRef,useState} from 'react';
import {DesignHistory} from '@/lib/designHistory';
export function useDesignHistory<T>(key:string,current:T,restore:(value:T)=>void){
  const history=useRef({key,store:new DesignHistory<T>()});
  const [,render]=useState(0);
  if(history.current.key!==key)history.current={key,store:new DesignHistory<T>()};
  const store=history.current.store;
  return {canUndo:store.canUndo,canRedo:store.canRedo,
    record:(next:T,apply:()=>void,group='')=>{if(store.record(current,next,group)){apply();render(value=>value+1);}},
    undo:()=>{const value=store.undo(current);if(value){restore(value);render(value=>value+1);}},
    redo:()=>{const value=store.redo(current);if(value){restore(value);render(value=>value+1);}},
  };
}
