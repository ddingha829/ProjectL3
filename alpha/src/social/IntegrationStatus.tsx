'use client';
import {useEffect,useState} from 'react';
type Status={tmdb:boolean;books:boolean;gemini:boolean;geminiAvailable:boolean;used:number;limit:number};
export default function IntegrationStatus(){
 const [status,setStatus]=useState<Status|null>(null),[error,setError]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{const controller=new AbortController();setError(false);void fetch('/api/integrations/status',{signal:controller.signal}).then(async response=>{if(!response.ok)throw Error();return await response.json() as Status;}).then(setStatus).catch(()=>{if(!controller.signal.aborted)setError(true);});return()=>controller.abort();},[retry]);
 return <div className="un-integration-status">{error?<p>연결 상태를 확인하지 못했어요. <button onClick={()=>setRetry(v=>v+1)}>다시 확인</button></p>:status?<><p>AI 소개 요약 <strong>{status.used} / {status.limit}</strong><small>이 브라우저 · 매일 자정 초기화</small></p><span>TMDB {status.tmdb?'연결됨':'연결 준비 중'} · 책 검색 {status.books?'연결됨':'연결 준비 중'} · Gemini {status.geminiAvailable?'연결됨':status.gemini?'연결 확인 필요':'연결 준비 중'}</span></>:<p>작품 연동 상태를 확인하고 있어요.</p>}<details><summary>작품 정보 출처</summary><a href="https://www.themoviedb.org" target="_blank" rel="noreferrer"><img src="/credits/tmdb.svg" alt="TMDB" width="66" height="9"/></a><p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p><a href="https://search.daum.net/search?w=book" target="_blank" rel="noreferrer">Kakao 도서 검색</a></details></div>;
}
