import type {LabLog} from '@/social/model';

export const NEARBY_RADIUS_METERS=100;
export const NEARBY_COOLDOWN_MS=6*60*60*1000;
export type NotificationPreferences={newLogs:boolean;nearby:boolean;lastNearbyAt:number|null;seenLogIds:string[]};
export const EMPTY_NOTIFICATION_PREFERENCES:NotificationPreferences={newLogs:false,nearby:false,lastNearbyAt:null,seenLogIds:[]};
export type NotificationTarget={kind:'map'|'log';logId:string;scope:string};
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export function notificationTarget(url:string):NotificationTarget|null{
 try{const parsed=new URL(url,'https://local.invalid');if(parsed.origin!=='https://local.invalid'||parsed.pathname!=='/')return null;
  const scope=parsed.searchParams.get('scope')||'',logId=parsed.searchParams.get('focus')||parsed.searchParams.get('log')||'';
  if(!uuid.test(logId)||!uuid.test(scope))return null;
  if(parsed.searchParams.get('view')==='map'&&parsed.searchParams.has('focus'))return {kind:'map',logId,scope};
  if(parsed.searchParams.get('view')==='logs'&&parsed.searchParams.has('log'))return {kind:'log',logId,scope};
 }catch{}return null;
}
export function distanceMeters(a:{lat:number;lng:number},b:{lat:number;lng:number}){
 const rad=Math.PI/180,lat=(b.lat-a.lat)*rad,lng=(b.lng-a.lng)*rad;
 const h=Math.sin(lat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(lng/2)**2;
 return 6371000*2*Math.atan2(Math.sqrt(h),Math.sqrt(Math.max(0,1-h)));
}
export function nearbyCandidate(logs:LabLog[],point:{lat:number;lng:number;accuracy:number},prefs:NotificationPreferences,now=Date.now()):LabLog|undefined{
 if(!prefs.nearby||!Number.isFinite(point.lat)||!Number.isFinite(point.lng)||Math.abs(point.lat)>90||Math.abs(point.lng)>180||!Number.isFinite(point.accuracy)||point.accuracy<0||point.accuracy>80||prefs.lastNearbyAt!==null&&now-prefs.lastNearbyAt<NEARBY_COOLDOWN_MS)return;
 return logs.filter(log=>log.authorId!=='me'&&log.place&&!prefs.seenLogIds.includes(log.id)&&Number.isFinite(log.place.lat)&&Number.isFinite(log.place.lng)&&Math.abs(log.place.lat)<=90&&Math.abs(log.place.lng)<=180)
  .map(log=>({log,distance:distanceMeters(point,log.place!)})).filter(item=>item.distance<=NEARBY_RADIUS_METERS)
  .sort((a,b)=>a.distance-b.distance||b.log.createdAt-a.log.createdAt)[0]?.log;
}
export function validPushSubscription(value:unknown):value is {endpoint:string;keys:{p256dh:string;auth:string}}{
 const s=value as {endpoint?:unknown;keys?:{p256dh?:unknown;auth?:unknown}};
 if(!s||typeof s!=='object'||typeof s.endpoint!=='string'||s.endpoint.length>4096||typeof s.keys?.p256dh!=='string'||typeof s.keys.auth!=='string'||!/^[-_A-Za-z0-9]{80,100}={0,2}$/.test(s.keys.p256dh)||!/^[-_A-Za-z0-9]{20,30}={0,2}$/.test(s.keys.auth))return false;
 try{const url=new URL(s.endpoint);return url.protocol==='https:'&&!url.username&&!url.password&&!url.hash&&(!url.port||url.port==='443')&&['push.apple.com','fcm.googleapis.com','push.services.mozilla.com','notify.windows.com'].some(host=>url.hostname===host||url.hostname.endsWith('.'+host));}catch{return false;}
}
