'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera, ImagePlus, Clapperboard, Search, BookOpen, LoaderCircle } from 'lucide-react';
import { briefMediaText, type MediaResult } from '@/lib/media';
import AccessibleDialog from './AccessibleDialog';
export type { MediaResult } from '@/lib/media';
interface Props { selectionError?: string; open: boolean; onClose: () => void; onAlbum: () => void; onCamera: () => void; onMedia: (item: MediaResult) => void }
export default function PhotoPickerDialog(p: Props) {
  const [mode,setMode]=useState<'movie'|'book'|null>(null),[query,setQuery]=useState('');
  const [results,setResults]=useState<MediaResult[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [selecting,setSelecting]=useState<string|null>(null), selection=useRef<AbortController|null>(null);
  useEffect(()=>{if(!p.open){setMode(null);setQuery('');setResults([]);setError('');setSelecting(null);selection.current?.abort();}},[p.open]);
  useEffect(()=>()=>selection.current?.abort(),[]);
  const changeMode=(next:'movie'|'book'|null)=>{selection.current?.abort();setSelecting(null);setMode(next);setQuery('');setResults([]);setError('');};
  useEffect(()=>{
    if(!p.open||!mode||query.trim().length<(mode==='book'?1:2)){setResults([]);setBusy(false);return;}
    const controller=new AbortController();setBusy(true);setError('');setResults([]);
    const timer=setTimeout(async()=>{
      try{const response=await fetch(`/api/${mode==='book'?'books':'media'}/search?q=${encodeURIComponent(query.trim())}`,{signal:controller.signal});const data=await response.json();if(!response.ok)throw new Error(data.error||'검색을 다시 시도해 주세요.');if(!controller.signal.aborted)setResults(data.results||[]);}
      catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'검색 결과를 불러오지 못했어요.');}
      finally{if(!controller.signal.aborted)setBusy(false);}
    },350);
    return()=>{clearTimeout(timer);controller.abort();};
  },[query,mode,p.open]);
  const select=async(item:MediaResult)=>{
    if(selecting||selection.current&&!selection.current.signal.aborted)return;
    const controller=new AbortController();selection.current=controller;setSelecting(`${item.type}-${item.id}`);
    let overview=briefMediaText(item.overview);
    try{const response=await fetch('/api/media/summary',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:item.title,type:item.type,overview:item.overview}),signal:controller.signal});const data=await response.json();if(response.ok&&typeof data.summary==='string')overview=briefMediaText(data.summary);}
    catch{/* A short source excerpt still lets the user attach the selected work. */}
    if(!controller.signal.aborted){selection.current=null;setSelecting(null);p.onMedia({...item,overview});}
  };
  const book=mode==='book';
  return <AccessibleDialog open={p.open} onClose={p.onClose} title={mode?(book?'책 표지 찾기':'영화 · 드라마 포스터'):'사진 한 장 추가'}>
    {mode?<div className="media-picker">
      <button type="button" className="test-text-button" onClick={()=>changeMode(null)}>← 사진 선택으로</button>
      <label className="media-search"><Search size={18} aria-hidden="true"/><input aria-label={book?'책 제목 또는 저자':'영화 또는 드라마 제목'} value={query} onChange={e=>setQuery(e.target.value)} disabled={Boolean(selecting)} maxLength={120} placeholder={book?'책 제목 · 저자 · ISBN으로 검색':'작품 제목으로 검색'}/></label>
      {busy&&<p role="status">{book?'책':'작품'} 찾는 중…</p>}{selecting&&<p role="status"><LoaderCircle size={15} className="preset-spinner"/> 소개를 한두 문장으로 정리하고 있어요…</p>}{error&&<p role="alert">{error}</p>}
      {!busy&&query.trim().length>=(book?1:2)&&!results.length&&!error&&<p>검색 결과가 없어요.</p>}
      <div className="media-results">{results.map(item=><button type="button" key={`${item.type}-${item.id}`} disabled={Boolean(selecting)} onClick={()=>void select(item)}>
        {item.poster?<img src={item.poster} alt={`${item.title} ${book?'표지':'포스터'}`} loading="lazy"/>:<span className="media-no-cover"><BookOpen size={32}/></span>}
        <strong>{item.title}</strong><small>{item.type==='book'?[item.authors?.join(' · '),item.publisher,item.year].filter(Boolean).join(' · '):`${item.type==='movie'?'영화':'드라마'} · ${item.year}${item.rating>0?` · TMDB ${item.rating.toFixed(1)}/10`:''}`}</small>
      </button>)}</div>
      <p className="media-credit">{book?'카카오 책 검색 제공 · 표지와 저자, 짧은 소개가 함께 추가돼요.':<>TMDB 제공 · 작품 소개는 한두 문장으로 정리해 참고 메모에 추가해요.<br/>This product uses the TMDB API but is not endorsed or certified by TMDB.</>}</p>
    </div>:<div className="photo-picker-options">
      <button type="button" onClick={p.onAlbum}><ImagePlus size={22}/><span><strong>앨범에서 사진 선택</strong><small>사진 한 장을 가볍게 압축해요</small></span></button>
      <button type="button" onClick={p.onCamera}><Camera size={22}/><span><strong>사진 찍기</strong><small>지금의 순간 담기</small></span></button>
      <button type="button" onClick={()=>changeMode('movie')}><Clapperboard size={22}/><span><strong>영화 및 드라마 검색</strong><small>TMDB 공식 포스터로 기록</small></span></button>
      <button type="button" onClick={()=>changeMode('book')}><BookOpen size={22}/><span><strong>책 검색</strong><small>표지와 저자를 함께 기록</small></span></button>
      {p.selectionError&&<p className="quick-photo-error" role="alert">{p.selectionError}</p>}
    </div>}
  </AccessibleDialog>;
}
