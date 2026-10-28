'use client';
import {Bell,MapPin,ArrowUpRight} from 'lucide-react';
import type useNotifications from './useNotifications';
import './NotificationSettings.css';
type Controller=ReturnType<typeof useNotifications>;
export default function NotificationSettings({controller:n,cloud,onInstall}:{controller:Controller;cloud:boolean;onInstall:()=>void}){
 const unavailable=!cloud||!n.loaded||!n.health.available,permissionBlocked=n.permission==='denied'||n.permission==='unsupported';
 return <section className="un-notification-settings" aria-labelledby="notification-heading"><h3 id="notification-heading" tabIndex={-1}><Bell size={16} strokeWidth={1.6}/>알림</h3>
  {!cloud?<p className="un-notification-hint">실제 계정으로 로그인하면 알림을 설정할 수 있어요.</p>:!n.loaded?<p className="un-notification-hint" role="status">알림 설정을 확인하고 있어요.</p>:!n.health.available?<p className="un-notification-hint">알림 기능을 준비 중이에요.</p>:null}
  {[{key:'newLogs',Icon:Bell,title:'모임 새 티끌',description:'모임원이 새 기록을 공유하면 알려요.'},{key:'nearby',Icon:MapPin,title:'근처에 남긴 기록',description:'앱을 보고 있을 때 · 약 100m 안의 장소'}].map(({key,Icon,title,description})=>{const field=key as 'newLogs'|'nearby',blocked=unavailable||n.busy||field==='newLogs'&&!n.health.pushReady;return <div className="un-notification-row" key={key}><Icon size={18} strokeWidth={1.6}/><div><strong id={'notification-'+key}>{title}</strong><p id={'notification-'+key+'-description'}>{description}</p></div><button type="button" role="switch" aria-checked={n.prefs[field]} aria-labelledby={'notification-'+key} aria-describedby={'notification-'+key+'-description'} disabled={blocked} onClick={()=>void n.save({...n.prefs,[field]:!n.prefs[field]})}><span/></button></div>;})}
  <p className="un-notification-rule">근처 알림은 6시간에 한 번, 같은 장소는 다시 알리지 않아요. 알림용 현재 위치는 기기에서만 비교해요.</p>
  {cloud&&n.needsInstall?<button type="button" className="un-notification-connect" onClick={onInstall}>웹앱 설치 방법<ArrowUpRight size={14}/></button>:cloud&&n.health.available&&(permissionBlocked||!n.connected&&(n.prefs.newLogs||n.prefs.nearby))?<div className="un-notification-permission"><p>{permissionBlocked?'기기·브라우저 설정에서 알림을 허용해주세요.':'이 기기에서도 알림을 연결해주세요.'}</p>{!permissionBlocked&&<button type="button" disabled={n.busy} onClick={()=>void n.save(n.prefs)}>이 기기에서 알림 허용</button>}</div>:null}
  {n.message&&<p className="un-notification-message" role="status">{n.message}</p>}
 </section>;
}
