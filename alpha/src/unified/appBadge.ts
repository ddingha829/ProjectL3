type BadgeNavigator=Navigator&{setAppBadge?:(count:number)=>Promise<void>;clearAppBadge?:()=>Promise<void>};
let queue=Promise.resolve();
/** Badging is optional: unsupported platforms and revoked permissions stay silent. */
export function syncAppBadge(ownerId:string,count:number,updatedAt:number){
 if(typeof navigator==='undefined'||!Number.isSafeInteger(count)||count<0||!Number.isFinite(updatedAt))return Promise.resolve();
 const api=navigator as BadgeNavigator;if(typeof api.setAppBadge!=='function')return Promise.resolve();
 queue=queue.catch(()=>{}).then(async()=>{
  // The worker serializes foreground and push updates against the same clock.
  if(ownerId)try{const registration=await navigator.serviceWorker?.getRegistration('/');if(registration?.active){registration.active.postMessage({type:'L2_APP_BADGE',ownerId,count,updatedAt});return;}}catch{}
  try{if(count===0&&api.clearAppBadge)await api.clearAppBadge();else await api.setAppBadge!(count);}catch{/* Icon badges must never block reading notifications. */}
 });return queue;
}
export function clearAppBadge(){return syncAppBadge('',0,Date.now());}
