'use client';
import {useEffect,useLayoutEffect,useRef,useState,type RefObject} from 'react';
import type {UnifiedLog} from './store';
export default function FeedArrivalNotice({logs,root,paused}:{logs:readonly UnifiedLog[];root:RefObject<HTMLElement|null>;paused:boolean}){
 const [since,setSince]=useState(()=>Date.now()),anchor=useRef<{id:string;offset:number}|undefined>(undefined);
 const ids=logs.map(l=>l.id).join('|');
 useEffect(()=>{const pane=root.current;if(!pane)return;const remember=()=>{if(paused||pane.scrollTop<30){if(!paused)anchor.current=undefined;return;}const top=pane.getBoundingClientRect().top;const card=Array.from(pane.querySelectorAll<HTMLElement>('[data-log-id]')).find(el=>el.getBoundingClientRect().bottom>top+65);if(card)anchor.current={id:card.dataset.logId!,offset:card.getBoundingClientRect().top-top};};pane.addEventListener('scroll',remember,{passive:true});return()=>pane.removeEventListener('scroll',remember);},[root,paused]);
 useLayoutEffect(()=>{const pane=root.current,a=anchor.current;if(!pane||!a||paused)return;const card=Array.from(pane.querySelectorAll<HTMLElement>('[data-log-id]')).find(el=>el.dataset.logId===a.id);if(card)pane.scrollTop+=card.getBoundingClientRect().top-pane.getBoundingClientRect().top-a.offset;},[ids,paused,root]);
 const count=logs.filter(l=>l.authorId!=='me'&&(l.serverPublishedAt??l.createdAt)>since).length;
 return count&&!paused?<button className="un-feed-arrival" onClick={()=>{anchor.current=undefined;setSince(Date.now());root.current?.scrollTo({top:0,behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth'});}}>새 티끌 {count}개 ↑</button>:null;
}
