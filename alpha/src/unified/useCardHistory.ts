'use client';
import {useCallback,useEffect,useRef} from 'react';
import {cardHistoryId,cardHistoryState} from './cardNavigation';
type Options={id:string;canLeave:()=>boolean;onChange:(id:string)=>void};
/** A card is one same-URL history entry, so browser/OS back returns to its source view. */
export function useCardHistory(options:Options){
 const live=useRef(options),pending=useRef(false),approved=useRef(false);live.current=options;
 useEffect(()=>{
  const pop=(event:PopStateEvent)=>{
   const next=cardHistoryId(event.state),previous=live.current.id,alreadyApproved=approved.current;
   approved.current=false;pending.current=false;
   if(next===previous)return;
   if(previous&&!alreadyApproved&&!live.current.canLeave()){
    history.pushState(cardHistoryState(history.state,previous),'');return;
   }
   live.current.onChange(next);
  };
  window.addEventListener('popstate',pop);return()=>window.removeEventListener('popstate',pop);
 },[]);
 useEffect(()=>{if(!options.id&&!pending.current&&cardHistoryId(history.state))history.replaceState(cardHistoryState(history.state,''),'');},[options.id]);
 const open=useCallback((id:string)=>{
  if(cardHistoryId(history.state)!==id)history.pushState(cardHistoryState(history.state,id),'');
  pending.current=false;approved.current=false;live.current.onChange(id);
 },[]);
 const back=useCallback(()=>{
  if(pending.current)return true;
  if(!live.current.canLeave())return false;
  if(live.current.id&&cardHistoryId(history.state)===live.current.id){pending.current=true;approved.current=true;history.back();}
  else live.current.onChange('');
  return true;
 },[]);
 return {open,back};
}
