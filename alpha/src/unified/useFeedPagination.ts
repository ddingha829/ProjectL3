'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {FEED_PAGE_SIZE,type FeedCursor,type FeedQuery} from './feedRepository';
type Page={cursor?:FeedCursor;hasMore:boolean};
export default function useFeedPagination({enabled,remote,query,load,owner=''}:{enabled:boolean;remote:boolean;owner?:string;query:FeedQuery;load:(query:FeedQuery,cursor?:FeedCursor)=>Promise<Page>}){
 const [count,setCount]=useState(FEED_PAGE_SIZE),[loading,setLoading]=useState(false),[error,setError]=useState(''),[hasMore,setHasMore]=useState(true),[initial,setInitial]=useState(true);
 const cursor=useRef<FeedCursor|undefined>(undefined),epoch=useRef(0),lock=useRef(false),live=useRef({enabled,remote,query,load});live.current={enabled,remote,query,load};
 const [sentinel,setSentinel]=useState<HTMLDivElement|null>(null);
 const lastQuery=useRef(''),settled=useRef(false),queryKey=JSON.stringify([owner,query]);
 const key=JSON.stringify([enabled,remote,queryKey]),[activeKey,setActiveKey]=useState('');
 const request=useCallback(async(first=false)=>{
  const options=live.current;if(!options.enabled||lock.current)return;
  if(!options.remote){if(!first)setCount(n=>n+FEED_PAGE_SIZE);return;}
  const generation=epoch.current;lock.current=true;setLoading(true);setError('');
  try{const page=await options.load(options.query,first?undefined:cursor.current);if(generation!==epoch.current)return;cursor.current=page.cursor;settled.current=true;setHasMore(page.hasMore);setInitial(false);if(!first)setCount(n=>n+FEED_PAGE_SIZE);}
  catch{if(generation===epoch.current)setError('티끌을 불러오지 못했어요. 다시 시도해주세요.');}
  finally{if(generation===epoch.current){lock.current=false;setLoading(false);}}
 },[]);
 useEffect(()=>{setActiveKey(key);epoch.current++;lock.current=false;if(!enabled){setLoading(false);return()=>{epoch.current++;};}if(lastQuery.current===queryKey&&settled.current){setLoading(false);return()=>{epoch.current++;};}lastQuery.current=queryKey;settled.current=false;cursor.current=undefined;setCount(FEED_PAGE_SIZE);setHasMore(true);setInitial(true);setError('');setLoading(remote);if(!remote){settled.current=true;setLoading(false);setInitial(false);return()=>{epoch.current++;};}const timer=setTimeout(()=>void request(true),query.query.trim()?300:0);return()=>{clearTimeout(timer);epoch.current++;};},[enabled,remote,key,request]);
 const reload=useCallback(async()=>{if(lock.current)return;cursor.current=undefined;setCount(FEED_PAGE_SIZE);await request(true);},[request]);
 const more=useCallback(()=>void request(initial),[request,initial]);
 // Observe the mounted node itself: conditional/loading renders can replace it.
 // Failures stop automatic requests until an explicit retry.
 useEffect(()=>{
  const element=sentinel;if(!element||!enabled||loading||error||(remote&&!hasMore)||initial)return;
  const root=element.closest<HTMLElement>('[data-app-scroll]');let disposed=false;
  const next=()=>{if(!disposed)more();};
  if(typeof IntersectionObserver==='function'){const observer=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))next();},{root,rootMargin:'100px 0px'});observer.observe(element);return()=>{disposed=true;observer.disconnect();};}
  let frame=0;const check=()=>{frame=0;if(disposed)return;const bounds=element.getBoundingClientRect(),viewport=root?.getBoundingClientRect();if(bounds.top<=(viewport?.bottom??innerHeight)+100&&bounds.bottom>=(viewport?.top??0))next();};
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(check);};
  const scroll=root||window;scroll.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);schedule();
  return()=>{disposed=true;cancelAnimationFrame(frame);scroll.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
 },[sentinel,enabled,remote,loading,error,hasMore,initial,more,count]);
 return {count,loading:enabled&&remote&&(loading||activeKey!==key),error:activeKey===key?error:'',hasMore,more,reload,sentinel:setSentinel,initial};
}
