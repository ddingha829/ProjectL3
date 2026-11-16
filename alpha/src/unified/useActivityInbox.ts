'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import {configureCloud} from './cloudRepository';
import {clearAppBadge,syncAppBadge} from './appBadge';
export type ActivityItem={id:string;kind:'post'|'comment'|'reply';logId:string;groupId:string;groupName:string;commentId:string|null;actorName:string;title:string;body:string;createdAt:number;unread:boolean};
export default function useActivityInbox(userId:string,ready:boolean,open:boolean,hint:string){
 const [data,setData]=useState<{owner:string;items:ActivityItem[];unreadCount:number}>({owner:'',items:[],unreadCount:0}),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const live=useRef({userId,ready,open}),running=useRef<number|null>(null),last=useRef(0),epoch=useRef(0),badgeOwner=useRef('');live.current={userId,ready,open};
 const load=useCallback(async function fetchInbox(force=false){
  const owner=live.current.userId;if(!owner||!live.current.ready||running.current===epoch.current||!force&&Date.now()-last.current<15000||document.visibilityState==='hidden')return;
  const generation=epoch.current,markRead=live.current.open;running.current=generation;last.current=Date.now();setBusy(true);setError('');
  try{const client=await configureCloud();if(!client)throw Error();const {data,error}=await client.rpc('l2u_activity_inbox',{p_mark_read:markRead});if(error)throw error;
   if(epoch.current!==generation||live.current.userId!==owner)return;
   const count=Number(data?.unreadCount)||0;setData({owner,items:Array.isArray(data?.items)?data.items:[],unreadCount:count});
   void syncAppBadge(owner,count,Number(data?.badgeUpdatedAt)||Date.now());
  }catch{if(epoch.current===generation)setError('알림을 불러오지 못했어요. 다시 시도해주세요.');}finally{if(running.current===generation)running.current=null;if(epoch.current===generation){setBusy(false);if(live.current.open&&!markRead)void fetchInbox(true);}}
 },[]);
 useEffect(()=>{if(badgeOwner.current&&badgeOwner.current!==userId)void clearAppBadge();badgeOwner.current=userId;epoch.current++;last.current=0;setData({owner:userId,items:[],unreadCount:0});setError('');if(ready)void load(true);return()=>{epoch.current++;};},[userId,ready,load]);
 useEffect(()=>{if(!ready)return;const refresh=()=>void load(),timer=setInterval(refresh,60000);document.addEventListener('visibilitychange',refresh);window.addEventListener('focus',refresh);return()=>{clearInterval(timer);document.removeEventListener('visibilitychange',refresh);window.removeEventListener('focus',refresh);};},[ready,load]);
 useEffect(()=>{if(ready)void load(open);},[open,ready,hint,load]);
 return {items:data.owner===userId?data.items:[],unreadCount:data.owner===userId?data.unreadCount:0,busy,error,reload:()=>load(true)};
}
