'use client';
import {useEffect,useRef,useState,type RefObject} from 'react';
import {NEW_CARD_LIMIT,newCardIds} from './feedNewness';
import './NewFeedCards.css';

/** Local visit timestamps only. Never fetch extra pages just to decorate cards. */
export default function useNewFeedCards(owner:string,enabled:boolean,items:readonly {id:string;createdAt:number}[],root:RefObject<HTMLElement|null>,context:string){
 const visit=useRef({owner:'',since:0,openedAt:0,seen:new Set<string>()}),[revision,setRevision]=useState(0);
 const latest=useRef(items);latest.current=items;
 const signature=items.map(item=>`${item.id}:${item.createdAt}`).join('|');
 useEffect(()=>{
  if(!owner){visit.current={owner:'',since:0,openedAt:0,seen:new Set()};return;}
  const key=`ticgle:feed-visit:v1:${owner}`;
  const stamp=()=>{try{localStorage.setItem(key,String(Date.now()));}catch{/* Private browsing can disable storage. */}};
  const begin=()=>{
   let since=0;try{since=Number(localStorage.getItem(key))||0;}catch{}
   visit.current={owner,since,openedAt:Date.now(),seen:new Set()};stamp();setRevision(n=>n+1);
  };
  if(visit.current.owner!==owner)begin();
  const visibility=()=>{if(document.visibilityState==='hidden')stamp();else begin();};
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',stamp);
  return()=>{stamp();document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',stamp);};
 },[owner]);
 useEffect(()=>{
  const current=visit.current,container=root.current;
  if(!owner||current.owner!==owner||!enabled||!container||document.visibilityState==='hidden'||!('IntersectionObserver' in window))return;
  const ids=new Set(newCardIds(latest.current,current.since,current.openedAt,current.seen,NEW_CARD_LIMIT-current.seen.size));
  if(!ids.size)return;
  const timers=new Map<HTMLElement,ReturnType<typeof setTimeout>>();
  const observer=new IntersectionObserver(entries=>{
   if(visit.current!==current||document.visibilityState!=='visible')return;
   for(const entry of entries){
    const element=entry.target as HTMLElement,id=element.dataset.logId;
    if(!entry.isIntersecting||entry.intersectionRatio<.35||!id||current.seen.has(id)||current.seen.size>=NEW_CARD_LIMIT)continue;
    current.seen.add(id);observer.unobserve(element);element.dataset.newArrival='true';
    timers.set(element,setTimeout(()=>{delete element.dataset.newArrival;timers.delete(element);},5500));
   }
  },{root:container,threshold:.35});
  container.querySelectorAll<HTMLElement>('.un-grid [data-log-id],.un-log-list [data-log-id]').forEach(element=>{if(ids.has(element.dataset.logId||''))observer.observe(element);});
  return()=>{observer.disconnect();for(const [element,timer] of timers){clearTimeout(timer);delete element.dataset.newArrival;}};
 },[owner,enabled,signature,revision,root,context]);
}
