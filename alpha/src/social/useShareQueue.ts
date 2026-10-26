'use client';
import {useEffect,useRef,useState} from 'react';
import type {LabRepository} from './repository';
import {ShareQueue} from './shareQueue';
import {SimulatedPublicationGateway,TRANSPORT_KEY,type TransportMode} from './shareTransport';

export function useShareQueue(repository:LabRepository|null,actorId:string,onError:(message:string)=>void){
 const [mode,setMode]=useState<TransportMode>('normal'),[loaded,setLoaded]=useState(false),error=useRef(onError);error.current=onError;
 useEffect(()=>{try{const value=localStorage.getItem(TRANSPORT_KEY);if(value==='normal'||value==='fail'||value==='paused')setMode(value);}catch{}setLoaded(true);},[]);
 useEffect(()=>{
  if(!repository||!actorId||!loaded)return;
  const queue=new ShareQueue(repository,new SimulatedPublicationGateway(mode),{actorId,paused:mode==='paused',online:()=>navigator.onLine,onError:message=>error.current(message),exclusive:navigator.locks?async job=>{await navigator.locks.request(`l2_social_lab_share:${actorId}`,{ifAvailable:true},async lock=>{if(lock)await job();});}:undefined});
  queue.start();const online=()=>queue.wake();window.addEventListener('online',online);return()=>{window.removeEventListener('online',online);queue.stop();};
 },[repository,actorId,mode,loaded]);
 const changeMode=(next:TransportMode)=>{setMode(next);try{localStorage.setItem(TRANSPORT_KEY,next);}catch{}};
 return{mode,changeMode};
}
