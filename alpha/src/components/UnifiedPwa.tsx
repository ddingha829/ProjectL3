'use client';
import {useEffect} from 'react';

/** Update the existing installed app's worker without caching private records. */
export default function UnifiedPwa(){
 useEffect(()=>{if(process.env.NODE_ENV!=='production'||!('serviceWorker' in navigator))return;
  void navigator.serviceWorker.register('/sw.js',{updateViaCache:'none'}).then(registration=>registration.update()).catch(()=>{});
 },[]);
 return null;
}
