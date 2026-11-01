'use client';
import {useCallback,useEffect,useRef,useState} from 'react';

const keyFor=(owner:string)=>`ticgle_last_scope_v1:${owner}`;
type Selection={owner:string;scope:string};

/** A device preference, isolated by account. Explicit entry links take priority. */
export default function useRememberedScope(owner:string,ready:boolean,groups:string[]){
 const [selection,setSelection]=useState<Selection>({owner:'',scope:'mine'});
 const entryScope=useRef<string|null|undefined>(undefined);
 const membership=JSON.stringify(groups);
 const allowed=(scope:string)=>scope==='mine'||groups.includes(scope);
 useEffect(()=>{
  // Capture the entry URL before UnifiedApp mirrors its selection into history.
  if(entryScope.current===undefined)entryScope.current=new URLSearchParams(location.search).get('scope');
  if(!owner||!ready)return;
  if(selection.owner!==owner){
   let saved:string|null=null;try{saved=localStorage.getItem(keyFor(owner));}catch{/* Storage can be disabled. */}
   const requested=entryScope.current??saved??'mine',scope=allowed(requested)?requested:'mine';
   entryScope.current=null;
   // Save here too: a StrictMode effect replay must restore the same entry link.
   try{localStorage.setItem(keyFor(owner),scope);}catch{}
   setSelection({owner,scope});
  }else if(!allowed(selection.scope))setSelection({owner,scope:'mine'});
 },[owner,ready,membership,selection]);
 useEffect(()=>{
  if(!owner||!ready||selection.owner!==owner||!allowed(selection.scope))return;
  try{localStorage.setItem(keyFor(owner),selection.scope);}catch{}
 },[owner,ready,membership,selection]);
 const setScope=useCallback((scope:string)=>{if(owner)setSelection({owner,scope});},[owner]);
 return {scope:selection.owner===owner?selection.scope:'mine',setScope,scopeReady:!owner||ready&&selection.owner===owner};
}
