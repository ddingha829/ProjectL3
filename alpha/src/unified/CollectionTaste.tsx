'use client';
import {useEffect,useState} from 'react';
import type {UnifiedLog} from './store';
const results=new Map<string,{line:string;source:string}>();
export default function CollectionTaste({logs}:{logs:readonly UnifiedLog[]}){
 const key=JSON.stringify(Array.from(new Map(logs.map(l=>{const w={kind:l.work?.kind||l.category,title:(l.work?.title||l.title).slice(0,160),creator:(l.work?.creator||'').slice(0,120)};return[JSON.stringify(w),w]})).values()).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
 const [state,setState]=useState<{key:string;line:string;source:string}>();
 useEffect(()=>{if(key==='[]')return;const hit=results.get(key);if(hit){setState({key,...hit});return;}const controller=new AbortController();const timer=setTimeout(()=>{void fetch('/api/collections/taste',{method:'POST',headers:{'Content-Type':'application/json','x-l2-request':'1'},body:JSON.stringify({works:JSON.parse(key)}),signal:controller.signal}).then(r=>r.ok?r.json():null).then(value=>{if(controller.signal.aborted)return;if(!value?.line){setState({key,line:'서로 다른 작품으로 함께 취향을 넓혀가고 있어요.',source:'collection'});return;}if(results.size>=40)results.delete(results.keys().next().value!);results.set(key,value);setState({key,...value});}).catch(()=>{if(!controller.signal.aborted)setState({key,line:'서로 다른 작품으로 함께 취향을 넓혀가고 있어요.',source:'collection'});});},1500);return()=>{clearTimeout(timer);controller.abort();};},[key]);
 if(key==='[]')return null;
 const current=state?.key===key?state:undefined;
 return <aside className="un-collection-taste"><small>{current?.source==='ai'?'AI가 읽은 우리 취향':'우리의 취향 한 줄'}</small><p>{current?.line||'모인 작품에서 취향의 공통점을 찾고 있어요.'}</p></aside>;
}
