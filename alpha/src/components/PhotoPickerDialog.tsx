'use client';
import { useEffect, useState } from 'react';
import { Camera, ImagePlus, Clapperboard, Search } from 'lucide-react';
import AccessibleDialog from './AccessibleDialog';

export interface MediaResult { id: number; type: 'movie' | 'tv'; title: string; poster: string; overview: string; rating: number; year: string }
interface Props { open: boolean; onClose: () => void; onAlbum: () => void; onCamera: () => void; onMedia: (item: MediaResult) => void }
export default function PhotoPickerDialog(p: Props) {
  const [media, setMedia] = useState(false), [query, setQuery] = useState('');
  const [results, setResults] = useState<MediaResult[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { if (!p.open) { setMedia(false); setQuery(''); setResults([]); setError(''); } }, [p.open]);
  useEffect(() => {
    if (!p.open || !media || query.trim().length < 2) { setResults([]); setBusy(false); return; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setBusy(true); setError('');
      try {
        const response = await fetch(`/api/media/search?q=${encodeURIComponent(query.trim())}`, { signal: controller.signal });
        const data = await response.json(); if (!response.ok) throw new Error(data.error || '작품 검색을 다시 시도해 주세요.');
        if (!controller.signal.aborted) setResults(data.results || []);
      } catch (e) { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : '작품을 불러오지 못했어요.'); }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, media, p.open]);
  return <AccessibleDialog open={p.open} onClose={p.onClose} title={media ? '영화 · 드라마 포스터' : '사진 한 장 추가'}>
    {media ? <div className="media-picker"><button type="button" className="test-text-button" onClick={() => setMedia(false)}>← 사진 선택으로</button><label className="media-search"><Search size={18} aria-hidden="true"/><input aria-label="영화 또는 드라마 제목" value={query} onChange={e => setQuery(e.target.value)} maxLength={120} placeholder="작품 제목으로 검색"/></label>{busy && <p role="status">작품 찾는 중…</p>}{error && <p role="alert">{error}</p>}{!busy && query.trim().length >= 2 && !results.length && !error && <p>검색 결과가 없어요.</p>}<div className="media-results">{results.map(item => <button type="button" key={`${item.type}-${item.id}`} onClick={() => p.onMedia(item)}><img src={item.poster} alt={`${item.title} 포스터`} loading="lazy"/><strong>{item.title}</strong><small>{item.type === 'movie' ? '영화' : '드라마'} · {item.year}{item.rating > 0 && ` · TMDB ${item.rating.toFixed(1)}/10`}</small></button>)}</div><p className="media-credit">TMDB 제공 · 작품 소개와 평점은 참고 메모에 추가돼요.<br/>This product uses the TMDB API but is not endorsed or certified by TMDB.</p></div> : <div className="photo-picker-options"><button type="button" onClick={p.onAlbum}><ImagePlus size={22}/><span><strong>앨범에서 사진 선택</strong><small>사진 한 장을 가볍게 압축해요</small></span></button><button type="button" onClick={p.onCamera}><Camera size={22}/><span><strong>사진 찍기</strong><small>지금의 순간 담기</small></span></button><button type="button" onClick={() => setMedia(true)}><Clapperboard size={22}/><span><strong>영화 및 드라마 검색</strong><small>TMDB 공식 포스터로 기록</small></span></button></div>}
  </AccessibleDialog>;
}
