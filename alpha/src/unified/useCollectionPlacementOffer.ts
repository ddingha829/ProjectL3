'use client';
import {useCallback,useEffect,useState} from 'react';
import {mosaicWork} from './mosaic';
import type {UnifiedLog} from './store';

type Ticket={owner:string;id:string};
/** A save must settle successfully before it can invite the author to place it.
 * Eligibility comes from the log itself; this does not upload or place a copy. */
export default function useCollectionPlacementOffer({owner,logs,personalBoard,sync}:{owner:string;logs:UnifiedLog[];personalBoard:Record<number,string>;sync:'idle'|'saving'|'failed'}){
 const [pending,setPending]=useState<Ticket|null>(null),[offered,setOffered]=useState<Ticket|null>(null);
 useEffect(()=>{setPending(null);setOffered(null);},[owner]);
 const request=useCallback((id:string)=>{if(owner){setOffered(null);setPending({owner,id});}},[owner]);
 const dismiss=useCallback(()=>{setPending(null);setOffered(null);},[]);
 useEffect(()=>{
  if(!pending||pending.owner!==owner||sync!=='idle')return;
  const log=logs.find(row=>row.id===pending.id);
  setPending(null);
  if(log?.authorId==='me'&&mosaicWork(log)&&!Object.values(personalBoard).includes(log.id))setOffered(pending);
 },[pending,owner,sync,logs,personalBoard]);
 const log=offered?.owner===owner?logs.find(row=>row.id===offered.id&&row.authorId==='me'&&mosaicWork(row)&&!Object.values(personalBoard).includes(row.id)):undefined;
 return {log,request,dismiss};
}
