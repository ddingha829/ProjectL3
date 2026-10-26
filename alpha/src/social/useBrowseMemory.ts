'use client';
import {useCallback,useEffect,useLayoutEffect,useRef,useState} from 'react';

export type Screen='today'|'library'|'map';
type Library='mine'|'circle'|'saved'|'taste';
type View={screen:Screen;library:Library;query:string;grid:boolean;mapMine:boolean};
type Position={query:string;y:number;anchor?:string;offset?:number};
type Memory={version:1;active:View;routes:Record<string,Position>};
const PREFIX='l2_social_lab_browse_v1:';
const defaults:View={screen:'today',library:'mine',query:'',grid:true,mapMine:false};
export const browseRoute=(view:View,circle:string)=>view.screen==='library'?`library:${view.library}${view.library==='circle'?`:${circle}`:''}`:`${view.screen}:${circle}${view.screen==='map'?`:${view.mapMine?'mine':'all'}`:''}`;
function fresh():Memory{return {version:1,active:{...defaults},routes:{}};}
function load(actor:string):Memory{
 try{
  const raw=JSON.parse(sessionStorage.getItem(PREFIX+actor)||'null');if(raw?.version!==1||!raw.routes||typeof raw.routes!=='object')return fresh();
  const active:View={...defaults,...raw.active};if(!['today','library','map'].includes(active.screen)||!['mine','circle','saved','taste'].includes(active.library))return fresh();
  active.grid=active.grid!==false;active.mapMine=active.mapMine===true;active.query='';
  const routes:Record<string,Position>={};for(const [key,rawPosition] of Object.entries(raw.routes).slice(-80)){
   const p=rawPosition as Position;if(key.length>180||!p||!Number.isFinite(p.y)||p.y<0)continue;
   routes[key]={query:typeof p.query==='string'?p.query.slice(0,200):'',y:Math.min(1000000,p.y),...(typeof p.anchor==='string'&&Number.isFinite(p.offset)?{anchor:p.anchor,offset:p.offset}:{} )};
  }return {version:1,active,routes};
 }catch{return fresh();}
}
export function clearBrowseMemory(){try{for(const key of Object.keys(sessionStorage))if(key.startsWith(PREFIX))sessionStorage.removeItem(key);}catch{}}
function position(query:string):Position{
 const cards=Array.from(document.querySelectorAll<HTMLElement>('.lab-main [data-log-id]'));
 const anchor=cards.find(card=>{const r=card.getBoundingClientRect();return r.bottom>0&&r.top<innerHeight;});
 return {query,y:window.scrollY,...(anchor?{anchor:anchor.dataset.logId,offset:anchor.getBoundingClientRect().top}:{})};
}

/** Tab-local view state, isolated per demo account. No log/photo content is copied. */
export function useBrowseMemory(actor:string,circle:string,modalOpen:boolean){
 const [view,setView]=useState<View>({...defaults}),[restoreTick,setRestoreTick]=useState(0);
 const current=useRef<{actor:string;circle:string;view:View}|null>(null),memory=useRef<Memory>(fresh()),request=useRef<Position|null>(null),modal=useRef(modalOpen),restoring=useRef(false),raf=useRef(0),timer=useRef<ReturnType<typeof setTimeout>|undefined>(undefined),first=useRef(true),stopRestore=useRef<()=>void>(()=>{});
 modal.current=modalOpen;
 const persist=useCallback(()=>{const c=current.current;if(!c)return;try{sessionStorage.setItem(PREFIX+c.actor,JSON.stringify(memory.current));}catch{}},[]);
 const capture=useCallback(()=>{const c=current.current;if(!c)return;memory.current.routes[browseRoute(c.view,c.circle)]=position(c.view.query);memory.current.active=c.view;persist();},[persist]);
 const schedule=useCallback((p:Position)=>{request.current=p;setRestoreTick(t=>t+1);},[]);
 useLayoutEffect(()=>{
  if(!actor)return;const previous=current.current;if(previous?.actor===actor&&previous.circle===circle)return;
  let next:View;
  if(previous?.actor!==actor){
   memory.current=load(actor);next={...memory.current.active};
   const explicit=new URLSearchParams(location.search).get('view');if(first.current&&['today','library','map'].includes(explicit||''))next.screen=explicit as Screen;else if(!first.current)next.screen='today';first.current=false;
  }else next={...previous.view};
  const saved=memory.current.routes[browseRoute(next,circle)]||{query:'',y:0};next.query=saved.query;
  current.current={actor,circle,view:next};setView(next);schedule(saved);
 },[actor,circle,schedule]);
 const open=useCallback((screen:Screen,options:{library?:Library;reset?:boolean;circleId?:string;mapMine?:boolean}={})=>{
  const c=current.current;if(!c)return;capture();
  const next={...c.view,screen,...(options.library?{library:options.library}:{}),...(options.mapMine!==undefined?{mapMine:options.mapMine}:{})};
  const scope=options.circleId??c.circle,key=browseRoute(next,scope),saved=options.reset?{query:'',y:0}:memory.current.routes[key]||{query:'',y:0};next.query=saved.query;
  current.current={...c,circle:scope,view:next};memory.current.active=next;memory.current.routes[key]=saved;setView(next);schedule(saved);persist();
 },[capture,persist,schedule]);
 const setQuery=useCallback((query:string)=>{
  const c=current.current;if(!c)return;const next={...c.view,query:query.slice(0,200)},p={query:next.query,y:0};current.current={...c,view:next};memory.current.routes[browseRoute(next,c.circle)]=p;memory.current.active=next;setView(next);schedule(p);persist();
 },[schedule,persist]);
 const setLibrary=useCallback((library:Library)=>open('library',{library}),[open]);
 const setMapMine=useCallback((mapMine:boolean)=>open('map',{mapMine}),[open]);
 const setGrid=useCallback((grid:boolean)=>{const c=current.current;if(!c)return;capture();const p=memory.current.routes[browseRoute(c.view,c.circle)]||{query:c.view.query,y:0},next={...c.view,grid};current.current={...c,view:next};memory.current.active=next;setView(next);schedule(p);persist();},[capture,schedule,persist]);
 const reset=useCallback(()=>{clearBrowseMemory();memory.current=fresh();const c=current.current;if(c){current.current={...c,view:{...defaults}};setView({...defaults});schedule({query:'',y:0});persist();}},[schedule,persist]);
 const restore=useCallback(()=>{const c=current.current;if(c)schedule(memory.current.routes[browseRoute(c.view,c.circle)]||{query:c.view.query,y:0});},[schedule]);
 useLayoutEffect(()=>{
  const destination=request.current;if(!destination)return;stopRestore.current();cancelAnimationFrame(raf.current);restoring.current=true;let attempts=0;
  const apply=()=>{
   if(modal.current){restoring.current=false;return;}
   const anchor=destination.anchor?Array.from(document.querySelectorAll<HTMLElement>('.lab-main [data-log-id]')).find(el=>el.dataset.logId===destination.anchor):undefined;
   const y=Math.max(0,anchor?scrollY+anchor.getBoundingClientRect().top-(destination.offset||0):destination.y);
   window.scrollTo({top:y,behavior:'instant'});attempts++;
   if(attempts<4)raf.current=requestAnimationFrame(apply);else restoring.current=false;
  };
  const observer=new ResizeObserver(()=>{attempts=0;apply();});const main=document.querySelector('.lab-main');if(main)observer.observe(main);const finish=setTimeout(()=>{observer.disconnect();restoring.current=false;},1800);stopRestore.current=()=>{observer.disconnect();clearTimeout(finish);cancelAnimationFrame(raf.current);restoring.current=false;};
  raf.current=requestAnimationFrame(()=>{raf.current=requestAnimationFrame(apply);});return()=>stopRestore.current();
 },[restoreTick]);
 useEffect(()=>{
  const scroll=()=>{if(modal.current||restoring.current)return;clearTimeout(timer.current);timer.current=setTimeout(capture,140);};
  const leave=()=>{if(!modal.current&&!restoring.current)capture();};
  const interrupt=()=>stopRestore.current();
  window.addEventListener('scroll',scroll,{passive:true});window.addEventListener('pagehide',leave);window.addEventListener('wheel',interrupt,{passive:true});window.addEventListener('keydown',interrupt);window.addEventListener('pointerdown',interrupt,{passive:true});window.addEventListener('touchstart',interrupt,{passive:true});
  return()=>{clearTimeout(timer.current);cancelAnimationFrame(raf.current);window.removeEventListener('scroll',scroll);window.removeEventListener('pagehide',leave);window.removeEventListener('wheel',interrupt);window.removeEventListener('keydown',interrupt);window.removeEventListener('pointerdown',interrupt);window.removeEventListener('touchstart',interrupt);};
 },[capture]);
 return {...view,open,setQuery,setLibrary,setGrid,setMapMine,capture,restore,reset};
}
