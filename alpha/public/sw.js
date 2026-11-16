// The account-backed app uses the network for pages, photos and API responses.
// Replace the personal app's worker at the same URL without retaining its shell.
self.addEventListener('install',event=>event.waitUntil(self.skipWaiting()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const keys=await caches.keys();
 await Promise.all(keys.filter(key=>key.startsWith('l2-test-shell-')).map(key=>caches.delete(key)));
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 if(event.request.method==='GET'&&new URL(event.request.url).origin===self.location.origin)event.respondWith(fetch(event.request));
});

function notificationAddress(value){
 try{const u=new URL(value,self.location.origin);if(u.origin!==self.location.origin||u.pathname!=='/')return '/';
  if(u.search==='?compose=1')return '/?compose=1';
  const id=/^[a-f0-9-]{36}$/i,scope=u.searchParams.get('scope'),log=u.searchParams.get('focus')||u.searchParams.get('log');
  if(!id.test(log||'')||!['map','logs'].includes(u.searchParams.get('view'))||!(id.test(scope||'')||scope==='mine'&&u.searchParams.get('view')==='logs'))return '/';
  return '/?view='+u.searchParams.get('view')+'&scope='+scope+(u.searchParams.get('view')==='map'?'&focus=':'&log=')+log;
 }catch{return '/';}
}
// Only account and badge metadata is persisted here; no coordinates, photos or logs.
function notificationOwner(value,key='owner'){return new Promise(resolve=>{
 const request=indexedDB.open('l2-notification-device',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('settings');request.onerror=()=>resolve(null);
 request.onsuccess=()=>{const db=request.result,tx=db.transaction('settings',value===undefined?'readonly':'readwrite'),store=tx.objectStore('settings'),item=value===undefined?store.get(key):store.put(value,key);
  item.onsuccess=()=>{if(value===undefined)resolve(item.result||null);};tx.oncomplete=()=>{db.close();if(value!==undefined)resolve(value);};tx.onerror=()=>{db.close();resolve(null);};
 };
});}
let appBadgeQueue=Promise.resolve();
function queueBadge(task){appBadgeQueue=appBadgeQueue.catch(()=>{}).then(task);return appBadgeQueue;}
async function clearIconBadge(){
 await notificationOwner(null,'badge');
 try{if(self.navigator?.clearAppBadge)await self.navigator.clearAppBadge();else if(self.navigator?.setAppBadge)await self.navigator.setAppBadge(0);}catch{}
}
function updateIconBadge(ownerId,count,updatedAt){
 if(!self.navigator?.setAppBadge||typeof ownerId!=='string'||!Number.isSafeInteger(count)||count<0||!Number.isFinite(updatedAt))return Promise.resolve();
 return queueBadge(async()=>{
  if(await notificationOwner()!==ownerId)return;
  const prior=await notificationOwner(undefined,'badge');
  if(prior?.ownerId===ownerId&&prior.updatedAt>updatedAt)return;
  await notificationOwner({ownerId,count,updatedAt},'badge');
  try{if(count===0&&self.navigator.clearAppBadge)await self.navigator.clearAppBadge();else await self.navigator.setAppBadge(count);}catch{}
 });
}
self.addEventListener('message',event=>{
 if(event.data?.type==='L2_APP_BADGE'){event.waitUntil(updateIconBadge(event.data.ownerId,event.data.count,event.data.updatedAt));return;}
 if(event.data?.type!=='L2_NOTIFICATION_ACCOUNT')return;
 event.waitUntil(queueBadge(async()=>{const next=typeof event.data.ownerId==='string'?event.data.ownerId:null,previous=await notificationOwner();await notificationOwner(next);
  if(previous&&previous!==next){const notes=await self.registration.getNotifications();notes.forEach(note=>note.close());}
  if(previous!==next||!next)await clearIconBadge();
 }));
});
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{let payload;try{payload=event.data?.json();}catch{return;}
  if(!payload||typeof payload.ownerId!=='string'||await notificationOwner()!==payload.ownerId)return;
  if(payload.kind==='reminder'&&(!Number.isFinite(payload.expiresAt)||payload.expiresAt<=Date.now()))return;
  const url=notificationAddress(payload.url);if(url==='/')return;
  await self.registration.showNotification(String(payload.title||'새로운 기록').slice(0,100),{
   body:String(payload.body||'모임의 새 티끌을 확인해보세요.').slice(0,160),icon:'/brand/ticgle-icon-a-192.png',badge:'/brand/ticgle-icon-a-192.png',
   tag:'l2-'+(['comment','likes','reminder'].includes(payload.kind)?payload.kind:'log')+'-'+String(payload.id||''),data:{url,ownerId:payload.ownerId,kind:['comment','likes','reminder'].includes(payload.kind)?payload.kind:'new-log'},
  });
  await updateIconBadge(payload.ownerId,payload.badgeCount,payload.badgeUpdatedAt);
 })());
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();event.waitUntil((async()=>{
  const data=event.notification.data||{};if(await notificationOwner()!==data.ownerId)return;
  const address=notificationAddress(data.url),windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});
  const target=windows.find(client=>{try{const url=new URL(client.url);return url.origin===self.location.origin&&url.pathname==='/';}catch{return false;}});
  if(target){await target.focus();target.postMessage({type:'L2_NOTIFICATION_OPEN',url:address,ownerId:data.ownerId});}
  else await self.clients.openWindow(address);
 })());
});
