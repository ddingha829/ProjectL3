'use client';
import {useCallback,useEffect,useRef,useState} from 'react';
import type {LabLog} from '@/social/model';
import {EMPTY_NOTIFICATION_PREFERENCES,nearbyCandidate,notificationTarget,NEARBY_COOLDOWN_MS,type NotificationPreferences,type NotificationTarget} from './notificationRules';
import {notificationRequest,webPushApplicationKey} from './notificationClient';

type Options={userId:string;ready:boolean;logs:LabLog[];refresh:()=>Promise<void>;onOpen:(target:NotificationTarget)=>boolean;onNotice:(text:string)=>void};
type Health={available:boolean;pushReady:boolean;publicKey:string|null};
type Device={nearby:boolean;connected:boolean;lastNearbyAt?:number;seen?:string[]};
const deviceKey=(id:string)=>'l2_notification_device_v1:'+id;
function readDevice(id:string):Device{try{const d=JSON.parse(localStorage.getItem(deviceKey(id))||'{}');return {nearby:d.nearby===true,connected:d.connected===true,lastNearbyAt:typeof d.lastNearbyAt==='number'?d.lastNearbyAt:undefined,seen:Array.isArray(d.seen)?d.seen.filter((id:unknown)=>typeof id==='string'):[]};}catch{return {nearby:false,connected:false};}}
const writeDevice=(id:string,value:Device)=>localStorage.setItem(deviceKey(id),JSON.stringify(value));
export default function useNotifications(options:Options){
 const live=useRef(options);live.current=options;
 const [health,setHealth]=useState<Health>({available:false,pushReady:false,publicKey:null}),[prefs,setPrefs]=useState<NotificationPreferences>(EMPTY_NOTIFICATION_PREFERENCES),[loaded,setLoaded]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState(''),[permission,setPermission]=useState<NotificationPermission|'unsupported'>('unsupported'),[needsInstall,setNeedsInstall]=useState(false),[device,setDevice]=useState<Device>({nearby:false,connected:false}),[visible,setVisible]=useState(true),[pending,setPending]=useState<NotificationTarget|null>(null);
 const owner=options.ready?options.userId:'',prefsRef=useRef(prefs),deviceRef=useRef(device),registrationRef=useRef<ServiceWorkerRegistration|null>(null),requesting=useRef(false),claiming=useRef(false),handledUrl=useRef(''),localBlocked=useRef(new Set<string>()),nearbyAttemptAt=useRef(0);
 prefsRef.current=prefs;deviceRef.current=device;
 const load=useCallback(async()=>{
  const id=live.current.userId;if(!id||!live.current.ready)return;
  const result=await notificationRequest('settings');if(live.current.userId!==id)return;
  setHealth({available:result.available===true,pushReady:result.pushReady===true,publicKey:result.publicKey||null});
  if(result.preferences)setPrefs(result.preferences);setLoaded(true);
 },[]);
 useEffect(()=>{let active=true;setLoaded(false);setPrefs(EMPTY_NOTIFICATION_PREFERENCES);setHealth({available:false,pushReady:false,publicKey:null});setMessage('');localBlocked.current.clear();nearbyAttemptAt.current=0;
  if(!owner)return;setDevice(readDevice(owner));
  void load().catch(()=>{if(active){setLoaded(true);setMessage('알림 설정을 불러오지 못했어요. 다시 확인해주세요.');}});
  return()=>{active=false;};
 },[owner,load]);
 useEffect(()=>{const check=()=>{setVisible(document.visibilityState==='visible');setPermission('Notification' in window?Notification.permission:'unsupported');const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1;setNeedsInstall(ios&&!matchMedia('(display-mode: standalone)').matches&&!(navigator as Navigator&{standalone?:boolean}).standalone);};check();document.addEventListener('visibilitychange',check);window.addEventListener('focus',check);return()=>{document.removeEventListener('visibilitychange',check);window.removeEventListener('focus',check);};},[]);
 useEffect(()=>{if(!owner||!('serviceWorker' in navigator))return;let active=true;
  void navigator.serviceWorker.getRegistration('/').then(reg=>{if(!active||!reg)return;registrationRef.current=reg;reg.active?.postMessage({type:'L2_NOTIFICATION_ACCOUNT',ownerId:owner});});
  return()=>{active=false;};
 },[owner]);
 const receive=useCallback(async(target:NotificationTarget)=>{try{await live.current.refresh();}finally{setPending(target);}},[]);
 useEffect(()=>{if(!owner||!('serviceWorker' in navigator))return;
  const message=(event:MessageEvent)=>{if(event.data?.type!=='L2_NOTIFICATION_OPEN'||event.data.ownerId!==live.current.userId)return;const target=notificationTarget(event.data.url);if(target)void receive(target);};
  navigator.serviceWorker.addEventListener('message',message);
  const target=notificationTarget('/'+location.search);if(target&&handledUrl.current!==location.search){handledUrl.current=location.search;void receive(target);}
  return()=>navigator.serviceWorker.removeEventListener('message',message);
 },[owner,receive]);
 useEffect(()=>{if(!pending||!owner)return;const opened=live.current.onOpen(pending);setPending(null);if(!opened)live.current.onNotice('공유가 해제됐거나 더 이상 볼 수 없는 기록이에요.');const url=new URL(location.href);url.searchParams.delete('focus');url.searchParams.delete('log');history.replaceState(history.state,'',url);},[pending,owner]);
 const save=useCallback(async(next:Pick<NotificationPreferences,'newLogs'|'nearby'>)=>{
  if(requesting.current)return;requesting.current=true;setBusy(true);setMessage('');const id=live.current.userId;
  try{
   const previous=prefsRef.current,turningOff=(!next.newLogs&&previous.newLogs||!next.nearby&&previous.nearby)&&(!next.newLogs||previous.newLogs)&&(!next.nearby||previous.nearby);
   let permissionGranted=false;
   if(!id||!health.available)throw Error('알림 기능을 준비 중이에요.');
   if(!turningOff&&next.newLogs&&!health.pushReady)throw Error('새 티끌 알림 연결을 준비 중이에요.');
   if(!turningOff&&(next.newLogs||next.nearby)&&needsInstall)throw Error('홈 화면에 설치한 웹앱에서 알림을 켜주세요.');
   let reg=registrationRef.current,subscription:PushSubscription|undefined;
   if(!turningOff&&(next.newLogs||next.nearby)){
    if(!('Notification' in window)||!('serviceWorker' in navigator))throw Error('이 브라우저에서는 휴대폰 알림을 지원하지 않아요.');
    // Safari requires the permission request directly inside the user's click.
    const allowed=Notification.permission==='granted'?'granted':await Notification.requestPermission();setPermission(allowed);
    if(allowed!=='granted')throw Error('기기 설정에서 이 웹앱의 알림을 허용해주세요.');
    permissionGranted=true;
    reg=await navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'});reg=await navigator.serviceWorker.ready;registrationRef.current=reg;
    reg.active?.postMessage({type:'L2_NOTIFICATION_ACCOUNT',ownerId:id});
    if(next.nearby&&!deviceRef.current.nearby)await new Promise<void>((resolve,reject)=>{if(!navigator.geolocation){reject(Error('이 기기에서 위치를 확인할 수 없어요.'));return;}navigator.geolocation.getCurrentPosition(()=>resolve(),()=>reject(Error('근처 알림을 켜려면 위치 권한을 허용해주세요.')),{enableHighAccuracy:false,timeout:15000,maximumAge:60000});});
    if(next.newLogs){if(!health.publicKey||!reg.pushManager)throw Error('이 기기의 푸시 알림 연결을 확인해주세요.');subscription=await reg.pushManager.getSubscription()||await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:webPushApplicationKey(health.publicKey)});}
   }
   if(live.current.userId!==id||!live.current.ready)return;
   const result=await notificationRequest('settings',{action:'save',...next,...(subscription?{subscription:subscription.toJSON()}:{})});if(live.current.userId!==id)return;
   setPrefs(result.preferences);const d={...deviceRef.current,connected:(next.newLogs||next.nearby)&&(permissionGranted||deviceRef.current.connected),nearby:next.nearby&&(permissionGranted||deviceRef.current.nearby)};writeDevice(id,d);setDevice(d);
   if(!next.newLogs&&reg?.pushManager){const old=await reg.pushManager.getSubscription();if(old){try{await notificationRequest('settings',{action:'unsubscribe',endpoint:old.endpoint});}finally{await old.unsubscribe();}}}
   setMessage('알림 설정을 저장했어요.');
  }catch(error){setMessage(error instanceof Error?error.message:'알림을 연결하지 못했어요.');}finally{requesting.current=false;setBusy(false);}
 },[health,needsInstall]);
 useEffect(()=>{
  if(!owner||!visible||!health.available||!prefs.nearby||!device.nearby||permission!=='granted'||!navigator.geolocation)return;
  const last=Math.max(prefs.lastNearbyAt||0,device.lastNearbyAt||0);if(last&&Date.now()-last<NEARBY_COOLDOWN_MS){const timer=setTimeout(()=>void load().catch(()=>{}),Math.min(NEARBY_COOLDOWN_MS,Math.max(1000,last+NEARBY_COOLDOWN_MS-Date.now())));return()=>clearTimeout(timer);}
  if(!options.logs.some(l=>l.authorId!=='me'&&l.place&&!prefs.seenLogIds.includes(l.id)))return;
  let active=true;
  const watch=navigator.geolocation.watchPosition(position=>{if(!active||claiming.current||Date.now()-nearbyAttemptAt.current<30000||Date.now()-position.timestamp>60000)return;
   const current=prefsRef.current,d=deviceRef.current,merged={...current,lastNearbyAt:Math.max(current.lastNearbyAt||0,d.lastNearbyAt||0)||null,seenLogIds:[...current.seenLogIds,...(d.seen||[]),...localBlocked.current]};
   const candidate=nearbyCandidate(live.current.logs,{lat:position.coords.latitude,lng:position.coords.longitude,accuracy:position.coords.accuracy},merged);if(!candidate)return;
   nearbyAttemptAt.current=Date.now();claiming.current=true;
   void(async()=>{let token:string|undefined,delivered=false;try{
    const response=await notificationRequest('nearby',{action:'reserve',logId:candidate.id});const note=response.notification;
    if(!note){localBlocked.current.add(candidate.id);return;}token=note.token;
    if(!active||live.current.userId!==owner||document.visibilityState!=='visible')return;
    const reg=registrationRef.current||await navigator.serviceWorker.getRegistration('/');if(!reg)throw Error();
    if(!active||live.current.userId!==owner||!prefsRef.current.nearby||document.visibilityState!=='visible')return;
    await reg.showNotification(note.title,{body:note.body,icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',tag:'l2-nearby-'+candidate.id,data:{url:note.url,ownerId:owner,kind:'nearby'}});delivered=true;
    const updated={...deviceRef.current,lastNearbyAt:Date.now(),seen:[...(deviceRef.current.seen||[]),candidate.id]};writeDevice(owner,updated);setDevice(updated);
   }catch{if(active)setMessage('근처 알림 연결을 확인해주세요.');}
   finally{if(token)try{await notificationRequest('nearby',{action:'complete',token,delivered});}catch{/* Device receipt prevents repeat display if the network drops after showing. */}claiming.current=false;if(delivered)void load().catch(()=>{});}
   })();
  },error=>{if(active&&error.code===1)setMessage('근처 알림의 위치 권한을 다시 허용해주세요.');},{enableHighAccuracy:false,maximumAge:30000,timeout:20000});
  return()=>{active=false;navigator.geolocation.clearWatch(watch);};
 },[owner,visible,health.available,prefs.nearby,prefs.lastNearbyAt,prefs.seenLogIds,device.nearby,device.lastNearbyAt,permission,options.logs,load]);
 return {loaded,health,prefs,busy,message,permission,needsInstall,connected:device.connected,save,reload:load};
}
