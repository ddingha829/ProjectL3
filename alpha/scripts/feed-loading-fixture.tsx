'use client';
import {useRef,useState} from 'react';
import useFeedPagination from '../src/unified/useFeedPagination';
import {FeedSkeleton} from '../src/unified/FeedLoading';
import EditorialCard from '../src/social/EditorialCard';
import {initialUnified,type UnifiedLog} from '../src/unified/store';
import type {FeedCursor} from '../src/unified/feedRepository';
import '../src/social/SocialLab.css';import '../src/social/SocialMaterial.css';import '../src/unified/UnifiedApp.css';
export default function Fixture(){
 const [logs,setLogs]=useState<UnifiedLog[]>([]),fail=useRef(false);
 const pager=useFeedPagination({enabled:true,remote:true,query:{scope:'mine',category:'all',query:'',sort:'recent',photosOnly:false,saved:false},load:async(_query,cursor?:FeedCursor)=>{await new Promise(r=>setTimeout(r,1800));if(fail.current){fail.current=false;throw Error('QA offline');}const offset=Number(cursor?.id||0),base=initialUnified().logs.find(l=>l.id==='walk')!;const rows=Array.from({length:Math.min(4,12-offset)},(_,i)=>({...base,id:'qa-'+(offset+i),title:'기록 '+(offset+i+1)}));setLogs(previous=>[...previous,...rows]);return {cursor:{date:'2026-10-29',id:String(offset+rows.length)},hasMore:offset+rows.length<12};}});
 return <div className="lab-app un-app"><main className="lab-main un-main"><h1>피드 로딩 UI 검증</h1><button onClick={()=>{fail.current=true;}}>다음 요청 실패</button><div className="lab-feed lab-poster-grid un-grid">{logs.slice(0,pager.count).map(log=><div key={log.id} data-qa-card><EditorialCard log={log} author="테스트" interactive={false}/></div>)}</div>{pager.loading&&<><FeedSkeleton/><div className="un-feed-pagination" role="status">티끌을 불러오고 있어요</div></>}{!pager.loading&&pager.hasMore&&<div className="un-feed-pagination">{pager.error&&<span role="alert">{pager.error}</span>}<button onClick={pager.more}>{pager.error?'다시 불러오기':'티끌 4장 더 보기'}</button></div>}</main></div>;
}
