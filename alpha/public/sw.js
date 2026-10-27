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
  const id=/^[a-f0-9-]{36}$/i,scope=u.searchParams.get('scope'),log=u.searchParams.get('focus')||u.searchParams.get('log');
  if(!id.test(scope||'')||!id.test(log||'')||!['map','logs'].includes(u.searchParams.get('view')))return '/';
  return '/?view='+u.searchParams.get('view')+'&scope='+scope+(u.searchParams.get('view')==='map'?'&focus=':'&log=')+log;
 }catch{return '/';}
}
// Only an account identifier is persisted here; no coordinates, photos or logs.
function notificationOwner(value){return new Promise(resolve=>{
 const request=indexedDB.open('l2-notification-device',1);
 request.onupgradeneeded=()=>request.result.createObjectStore('settings');request.onerror=()=>resolve(null);
 request.onsuccess=()=>{const db=request.result,tx=db.transaction('settings',value===undefined?'readonly':'readwrite'),store=tx.objectStore('settings'),item=value===undefined?store.get('owner'):store.put(value,'owner');
  item.onsuccess=()=>{if(value===undefined)resolve(item.result||null);};tx.oncomplete=()=>{db.close();if(value!==undefined)resolve(value);};tx.onerror=()=>{db.close();resolve(null);};
 };
});}
self.addEventListener('message',event=>{
 if(event.data?.type!=='L2_NOTIFICATION_ACCOUNT')return;
 event.waitUntil((async()=>{const next=typeof event.data.ownerId==='string'?event.data.ownerId:null,previous=await notificationOwner();await notificationOwner(next);
  if(previous&&previous!==next){const notes=await self.registration.getNotifications();notes.forEach(note=>note.close());}
 })());
});
self.addEventListener('push',event=>{
 event.waitUntil((async()=>{let payload;try{payload=event.data?.json();}catch{return;}
  if(!payload||typeof payload.ownerId!=='string'||await notificationOwner()!==payload.ownerId)return;
  const url=notificationAddress(payload.url);if(url==='/')return;
  await self.registration.showNotification(String(payload.title||'새로운 기록').slice(0,100),{
   body:String(payload.body||'모임의 새 기록을 확인해보세요.').slice(0,160),icon:'/icons/icon-192.png',badge:'/icons/icon-192.png',
   tag:'l2-log-'+String(payload.id||''),data:{url,ownerId:payload.ownerId,kind:'new-log'},
  });
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
