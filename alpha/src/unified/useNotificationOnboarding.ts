'use client';
import {useEffect,useState} from 'react';

export const notificationGuideKey=(userId:string)=>'l2_notification_intro_v1:'+userId;
type Context={userId:string;ios:boolean;standalone:boolean;loaded:boolean;available:boolean;pushReady:boolean;permission:NotificationPermission|'unsupported';connected:boolean;seen:boolean};
export function shouldOfferNotificationGuide(c:Context){
 return !!c.userId&&c.ios&&c.standalone&&c.loaded&&c.available&&c.pushReady&&!c.seen&&!c.connected&&(c.permission==='default'||c.permission==='granted');
}

export default function useNotificationOnboarding(context:Omit<Context,'seen'>,blocked:boolean){
 const [visit,setVisit]=useState({userId:'',seen:true}),[activeUser,setActiveUser]=useState('');
 useEffect(()=>{
  let seen=false;
  try{seen=localStorage.getItem(notificationGuideKey(context.userId))==='1';}catch{/* The guide can still be dismissed for this visit. */}
  setVisit({userId:context.userId,seen});
 },[context.userId]);
 const eligible=visit.userId===context.userId&&shouldOfferNotificationGuide({...context,seen:visit.seen});
 useEffect(()=>{
  if(!eligible||blocked){setActiveUser('');return;}
  // Let the existing first-use tour and its focus isolation settle first.
  let frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>setActiveUser(context.userId));});
  return()=>cancelAnimationFrame(frame);
 },[eligible,blocked,context.userId]);
 const dismiss=()=>{
  if(!context.userId)return;
  try{localStorage.setItem(notificationGuideKey(context.userId),'1');}catch{}
  setVisit({userId:context.userId,seen:true});setActiveUser('');
 };
 return {open:eligible&&!blocked&&activeUser===context.userId,dismiss};
}
