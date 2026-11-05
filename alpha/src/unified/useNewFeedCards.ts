'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {NEW_CARD_LIMIT,newCardIds} from './feedNewness';
import './NewFeedCards.css';
const clearHighlights=(active:Map<string,HTMLElement>)=>{for(const element of active.values())delete element.dataset.newArrival;active.clear();};
/** Highlight IDs live in memory for this app visit; only visit timestamps are persisted. */
export default function useNewFeedCards(owner:string,enabled:boolean,items:readonly {id:string;createdAt:number}[],root:RefObject<HTMLElement|null>,context:string,renderKey?:number){
 const visit=useRef({owner:'',since:0,openedAt:0,seen:new Set<string>()}),active=useRef(new Map<string,HTMLElement>()),[revision,setRevision]=useState(0);
 const latest=useRef(items);latest.current=items;
 const signature=items.map(item=>`${item.id}:${item.createdAt}`).join('|');
 useEffect(()=>{
  if(!owner){visit.current={owner:'',since:0,openedAt:0,seen:new Set()};return;}
  const key=`ticgle:feed-visit:v1:${owner}`;
  const stamp=()=>{try{localStorage.setItem(key,String(Date.now()));}catch{/* Private browsing can disable storage. */}};
  const begin=()=>{let since=0;try{since=Number(localStorage.getItem(key))||0;}catch{}clearHighlights(active.current);visit.current={owner,since,openedAt:Date.now(),seen:new Set()};stamp();setRevision(n=>n+1);};
  if(visit.current.owner!==owner)begin();
  // Switching apps is still the same visit. A fresh mount reads the last timestamp.
  const visibility=()=>{if(document.visibilityState==='hidden')stamp();else setRevision(n=>n+1);};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',stamp);
  return()=>{stamp();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',stamp);};
 },[owner]);
 // Remove detached DOM decorations, but retain selected IDs across menus and overlays.
 useEffect(()=>()=>clearHighlights(active.current),[owner,enabled,context,revision]);
 useEffect(()=>{
  const current=visit.current,container=root.current;
  if(!owner||current.owner!==owner||!enabled||!container||document.visibilityState==='hidden'||!('IntersectionObserver' in window))return;
  const nodes=Array.from(container.querySelectorAll<HTMLElement>('.un-grid [data-log-id],.un-log-list [data-log-id]')),mounted=new Set(nodes.map(node=>node.dataset.logId));
  for(const [id,element] of active.current){if(!nodes.includes(element)){delete element.dataset.newArrival;active.current.delete(id);}}
  for(const node of nodes){const id=node.dataset.logId;if(id&&current.seen.has(id)){active.current.set(id,node);node.dataset.newArrival='true';}}
  const ids=new Set(newCardIds(latest.current.filter(item=>mounted.has(item.id)),current.since||current.openedAt,Date.now(),current.seen,NEW_CARD_LIMIT-current.seen.size));
  if(!ids.size)return;
  let disposed=false;
  const observer=new IntersectionObserver(entries=>{
   if(disposed||visit.current!==current||document.visibilityState!=='visible')return;
   for(const entry of entries){
    const element=entry.target as HTMLElement,id=element.dataset.logId;
    if(!entry.isIntersecting||entry.intersectionRatio<.35||!id||current.seen.has(id)||current.seen.size>=NEW_CARD_LIMIT)continue;
    current.seen.add(id);observer.unobserve(element);element.dataset.newArrival='true';
    active.current.set(id,element);
   }
  },{root:container,threshold:.35});
  nodes.forEach(element=>{if(ids.has(element.dataset.logId||''))observer.observe(element);});
  return()=>{disposed=true;observer.disconnect();};
 },[owner,enabled,signature,revision,root,context,renderKey]);
}
