'use client';
import {configureCloud} from './cloudRepository';
export async function notificationRequest(path:string,body?:unknown){
 const client=await configureCloud(),session=await client?.auth.getSession(),token=session?.data.session?.access_token;
 if(!token)throw Error('로그인한 뒤 알림을 설정해주세요.');
 const response=await fetch('/api/notifications/'+path+'/',{method:body===undefined?'GET':'POST',cache:'no-store',headers:{Authorization:`Bearer ${token}`,'X-L2-Request':'1',...(body===undefined?{}:{'Content-Type':'application/json'})},body:body===undefined?undefined:JSON.stringify(body),signal:AbortSignal.timeout(12000)});
 const value=await response.json();if(!response.ok)throw Error(value.error||'알림 연결을 확인해주세요.');return value;
}
export async function disconnectNotificationDevice(){
 if(!('serviceWorker' in navigator))return;
 const registration=await navigator.serviceWorker.getRegistration('/');if(!registration)return;
 registration.active?.postMessage({type:'L2_NOTIFICATION_ACCOUNT',ownerId:null});
 const subscription=await registration.pushManager?.getSubscription();
 if(subscription){try{await notificationRequest('settings',{action:'unsubscribe',endpoint:subscription.endpoint});}catch{/* Unsubscribing locally also invalidates the endpoint. */}await subscription.unsubscribe();}
 const notes=await registration.getNotifications();notes.forEach(note=>note.close());
}
export function webPushApplicationKey(value:string){const raw=atob(value.replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from(raw,char=>char.charCodeAt(0));}
