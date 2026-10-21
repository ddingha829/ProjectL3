'use client';

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import dynamic from 'next/dynamic';
import { Camera, BookOpen, MapPin, SlidersHorizontal, Utensils, Clapperboard, Shapes, Inbox, Star, LocateFixed, LoaderCircle } from 'lucide-react';
import type { ArchiveCategory, ArchiveItem, GeoPoint, MapApiPlace, PlaceInboxItem } from '@/types/l2';
import { ARCHIVE_CATEGORIES, getArchiveCategory } from '@/lib/archiveCategories';
import { useLogDraft } from '@/hooks/useLogDraft';
import { useCurrentLocation } from '@/hooks/useCurrentLocation';
import AccessibleDialog from '@/components/AccessibleDialog';
import PhotoCropControls from './PhotoCropControls';
import {photoCrop,type PhotoFit} from '@/lib/photoCrop';
import PhotoMemoCanvas from '@/components/PhotoMemoCanvas';
import SaveFeedback from '@/components/SaveFeedback';
import VoiceLogInput from '@/components/VoiceLogInput';
import PhotoPickerDialog from './PhotoPickerDialog';
import { compressUploadedImage as preparePhoto } from '@/lib/imageUtils';
import { allowsMotion } from '@/lib/motion';
import { normalizeLogMedia, type LogMedia } from '@/lib/media';
import { voiceTitleCandidate } from '@/lib/voiceTitle';
import { isGeoPoint } from '@/lib/mapLocations';
import { dateTimeInput, parseExperienceInput } from '@/lib/logDate';
import './QuickLogComposer.css';
const LocationPickerMap=dynamic(()=>import('./LocationPickerMap'),{ssr:false,loading:()=> <div className="location-picker-map-loading" role="status">지도 불러오는 중…</div>});

export interface LogDraft {
  title: string;
  body: string;
  category: ArchiveCategory;
  score: number | null;
  occurredAt?: number | null;
  img: string;
  cropX: number;
  cropY: number;
  cropZoom?:number;
  photoFit?:PhotoFit;
  place: MapApiPlace | null;
  good: string;
  bad: string;
  note: string;
  inboxId?: string;
  media?: LogMedia | null;
}

export type SuggestedSummary = Pick<LogDraft, 'good' | 'bad' | 'note'>;

interface QuickLogComposerProps {
  editingItem: ArchiveItem | null;
  onSave: (draft: LogDraft, acknowledge?: () => Promise<void>) => Promise<void>;
  onCancelEdit: () => void;
  isReady: boolean;
  recordCount: number;
  inboxPlaces?: PlaceInboxItem[];
  onRemoveInboxPlace?: (id: string) => void;
  autoPlaceLinkOn?: boolean;
}

const CATEGORY_ICONS = { dining: Utensils, cinema: Clapperboard, place: MapPin, other: Shapes };

export function emptyLogDraft(): LogDraft {
  return { title: '', body: '', category: 'DINING', score: null, occurredAt:null, img: '', cropX: 50, cropY: 50, cropZoom:1, place: null, good: '', bad: '', note: '' };
}

function draftFromItem(item: ArchiveItem | null): LogDraft {
  if (!item) return emptyLogDraft();
  const parsedScore = Number.parseFloat(item.score);
  const customLocation = isGeoPoint(item.coordinates) && Boolean(item.loc) && !item.fullAddress && !item.addressShort;
  return {
    title: item.title || '',
    body: item.quote || '',
    category: item.cat,
    score: Number.isFinite(parsedScore) ? Math.max(0, Math.min(5, parsedScore)) : null,
    occurredAt:item.occurredAt??null,
    img: item.hasPhoto === false ? '' : item.img || '',
    cropX: item.cropX ?? 50,
    cropY: item.cropY ?? 50,
    cropZoom:item.cropZoom??1,
    photoFit:item.photoFit,
    place: item.loc || item.addressShort || item.fullAddress || item.link ? {
      name: customLocation ? item.loc : item.title,
      ...(customLocation ? {id:'current-location',source:'LOCAL' as const} : {}),
      short: item.addressShort || item.loc || '',
      fullAddress: item.fullAddress,
      loc: item.loc || '',
      category: item.cat,
      link: item.link || '',
      x: item.mapX ?? 0,
      y: item.mapY ?? 0,
      coordinates: item.coordinates || undefined,
    } : null,
    good: item.good || '',
    bad: item.bad || '',
    note: item.note || '',
    media: item.media,
  };
}

function inferCategory(text: string): ArchiveCategory | null {
  if (/(영화|극장|시네마|상영|감독|배우|관람평|cinema|film|movie)/i.test(text)) return 'CINEMA';
  if (/(전시|미술관|갤러리|박물관|작품|건축|공간|여행|산책|exhibition|gallery|museum)/i.test(text)) return 'ART';
  if (/(식당|맛집|카페|커피|식사|음식|디저트|와인|맥주|메뉴|점심|저녁|레스토랑|dining|cafe|restaurant)/i.test(text)) return 'DINING';
  return null;
}

function isPlace(value: unknown): value is MapApiPlace {
  if (!value || typeof value !== 'object') return false;
  const place = value as Partial<MapApiPlace>;
  return typeof place.name === 'string' && typeof place.short === 'string' && typeof place.loc === 'string' &&
    typeof place.link === 'string' && typeof place.x === 'number' && Number.isFinite(place.x) &&
    typeof place.y === 'number' && Number.isFinite(place.y);
}

export default function QuickLogComposer({
  editingItem,
  onSave,
  onCancelEdit,
  isReady,
  inboxPlaces = [],
  onRemoveInboxPlace,
  autoPlaceLinkOn = true,
}: QuickLogComposerProps) {
  const initialDraft = useMemo(() => draftFromItem(editingItem), [editingItem]);
  const storageKey = `l2:quick-log:v1:${editingItem?.id || 'new'}`;
  const { draft: storedDraft, setDraft, isRestored, restored, error: draftError, clearDraft } = useLogDraft(storageKey, initialDraft);
  const [manualCategory, setManualCategory] = useState(Boolean(editingItem));
  const [dialog, setDialog] = useState<'place' | 'details' | 'category' | 'inbox' | 'photo' | 'movie' | 'book' | null>(null);
  const { locating, locationMessage, locationError, requestLocation, cancelLocation } = useCurrentLocation(dialog === 'place');
  const [pickedLocation,setPickedLocation]=useState<GeoPoint|null>(null),[locationName,setLocationName]=useState('');
  useEffect(()=>{if(dialog!=='place'){setPickedLocation(null);setLocationName('');}},[dialog]);
  const [titleFocused, setTitleFocused] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<MapApiPlace[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [saved, setSaved] = useState(false);
  const [voiceActive, setVoiceActive] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  const suggestedTitle = voiceTitleCandidate(spokenText);
  const completedDraft = useRef<LogDraft | null>(null);
  const [committingCategory, setCommittingCategory] = useState<ArchiveCategory | null>(null);
  // Clear durable draft recovery immediately, but keep the just-saved text visible until navigation.
  const draft = saved && completedDraft.current ? completedDraft.current : storedDraft;
  const [cropOpen, setCropOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const composerFocusedRef = useRef(false);
  const photoToken = useRef(0);
  const savingRef = useRef(false);
  const mountedRef = useRef(true);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const id = useId();
  const placeId = `${id}-place`;
  const scoreId = `${id}-score`;
  const goodId = `${id}-good`;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      photoToken.current += 1;
      if (timerRef.current) clearTimeout(timerRef.current);
      delete document.documentElement.dataset.keyboard;
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    let rafId = 0;
    const lockTopScroll = () => {
      if (window.innerWidth > 640) return;
      const vv = window.visualViewport;
      if (window.scrollY !== 0 || document.documentElement.scrollTop !== 0 || document.body.scrollTop !== 0 || (vv && vv.offsetTop > 0)) {
        window.scrollTo(0, 0);
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    };
    const syncViewport = () => {
      const vv = window.visualViewport;
      const height = vv ? vv.height : window.innerHeight;
      document.documentElement.style.setProperty('--vvh', `${Math.round(height)}px`);
      const isMobile = window.innerWidth <= 640;
      const keyboardDelta = window.innerHeight - height;
      const isOpen = isMobile && (keyboardDelta > 100 || composerFocusedRef.current);
      if (isOpen) {
        document.documentElement.dataset.keyboard = 'open';
        lockTopScroll();
        cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(lockTopScroll);
      } else {
        delete document.documentElement.dataset.keyboard;
      }
    };
    syncViewport();
    const vv = window.visualViewport;
    vv?.addEventListener('resize', syncViewport);
    vv?.addEventListener('scroll', syncViewport);
    window.addEventListener('resize', syncViewport);
    return () => {
      cancelAnimationFrame(rafId);
      vv?.removeEventListener('resize', syncViewport);
      vv?.removeEventListener('scroll', syncViewport);
      window.removeEventListener('resize', syncViewport);
      delete document.documentElement.dataset.keyboard;
    };
  }, []);

  useEffect(() => {
    photoToken.current += 1;
    setPhotoBusy(false);
    setPhotoError('');
    setSubmitError('');
    setSaved(false);
    setManualCategory(Boolean(editingItem));
    setSpokenText('');
    setSearchQuery('');
    setPlaceResults([]);
    setDialog(null);
    // A sync update changes the item object, but must not reset an active editing session.
  }, [storageKey]);

  useEffect(() => {
    if (isRestored && restored) setManualCategory(true);
  }, [isRestored, restored]);

  useEffect(() => {
    if (!isRestored || restored || manualCategory) return;
    const inferred = draft.place?.category || inferCategory(`${draft.title} ${draft.body}`);
    if (inferred && inferred !== draft.category) setDraft((current) => ({ ...current, category: inferred }));
  }, [draft.title, draft.body, draft.place, draft.category, manualCategory, isRestored, restored, setDraft]);

  useEffect(() => {
    if (dialog !== 'place' || searchQuery.trim().length < 2) {
      setPlaceResults([]);
      setSearching(false);
      setSearchError('');
      return;
    }
    const controller = new AbortController();
    setSearching(true);
    setSearchError('');
    setPlaceResults([]);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/places/search?q=${encodeURIComponent(searchQuery.trim())}&category=${draft.category}`, { signal: controller.signal });
        if (!response.ok) throw new Error('search unavailable');
        const result = await response.json();
        if (!controller.signal.aborted) setPlaceResults(Array.isArray(result.results) ? result.results.filter(isPlace) : []);
      } catch {
        if (!controller.signal.aborted) setSearchError('지금은 검색에 연결하지 못했어요. 장소 없이도 기록을 저장할 수 있어요.');
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 300);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [dialog, searchQuery, draft.category]);

  const applyLocation = () => {
    if(!isGeoPoint(pickedLocation))return;
    const point=pickedLocation,name=locationName.trim()||'현재 위치';
    setDraft(current=>({...current,place:{id:'current-location',name,short:'',loc:name,fullAddress:'',category:current.category,link:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.lat},${point.lng}`)}`,coordinates:point,source:'LOCAL',x:50,y:50}}));
    cancelLocation();setPickedLocation(null);setSearchQuery('');setPlaceResults([]);setSearchError('');setSubmitError('');setDialog(null);
  };

  const update = <K extends keyof LogDraft>(key: K, value: LogDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
    setSubmitError('');
    setSaved(false);
  };

  const applyInboxItem = (item: PlaceInboxItem) => {
    setManualCategory(true);
    setDraft((current) => ({
      ...current,
      title: item.title,
      body: current.body.trim() || item.note || '',
      category: item.category,
      place: {
        name: item.title,
        short: item.addressShort,
        fullAddress: item.address,
        loc: item.loc,
        category: item.category,
        link: item.googleMapsUrl,
        x: 50,
        y: 50,
        coordinates: { lat: item.lat, lng: item.lng },
      },
      inboxId: item.id,
    }));
    setDialog(null);
    setSubmitError('');
  };

  const uploadPhoto = async (file: File | undefined) => {
    if (!file || savingRef.current) return;
    const token = ++photoToken.current;
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const img = await preparePhoto(file);
      if (mountedRef.current && token === photoToken.current) {
        setDraft((current) => ({ ...current, img, cropX: 50, cropY: 50, cropZoom:1, photoFit:undefined }));
        setSaved(false);
      }
    } catch (error) {
      if (mountedRef.current && token === photoToken.current) setPhotoError(error instanceof Error ? error.message : '사진을 준비하지 못했어요.');
    } finally {
      if (mountedRef.current && token === photoToken.current) setPhotoBusy(false);
    }
  };

  const openPhotoPicker = (input: HTMLInputElement | null) => {
    if (!input || disabled) return;
    setPhotoError('');
    input.multiple = false;
    input.value = '';
    input.click();
  };
  const selectPhoto = (input: HTMLInputElement) => {
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length) return;
    if (files.length !== 1) {
      setPhotoError('사진은 한 장만 선택해 주세요. 기존 사진은 그대로 유지돼요.');
      return;
    }
    setPhotoError(''); setDialog(null);
    void uploadPhoto(files[0]);
  };

  const commit = async (category: ArchiveCategory) => {
    if (savingRef.current || !isReady || !isRestored || photoBusy || voiceActive) return;
    if (!draft.title.trim()) {
      setSubmitError('제목을 입력해 주세요.');
      titleRef.current?.focus();
      return;
    }
    savingRef.current = true;
    setSaved(false);
    setCommittingCategory(category);
    setIsSaving(true);
    setSubmitError('');
    try {
      let acknowledged = false;
      const acknowledge = async () => {
        if (acknowledged) return;
        acknowledged = true;
        completedDraft.current = { ...draft, category };
        clearDraft(emptyLogDraft());
        if (!mountedRef.current) return;
        setSaved(true);
        await new Promise<void>(resolve => window.setTimeout(resolve, allowsMotion() ? 220 : 120));
      };
      await onSave({ ...draft, category, title: draft.title.trim(), body: draft.body.trim(), good: draft.good.trim(), bad: draft.bad.trim(), note: draft.note.trim() }, acknowledge);
      if (!acknowledged) await acknowledge();
      if (mountedRef.current) { setDialog(null); setManualCategory(false); setSearchQuery(''); setCropOpen(false); timerRef.current = setTimeout(() => setSaved(false), 1400); }
    } catch (error) {
      if (mountedRef.current) setSubmitError(error instanceof Error ? error.message : '저장하지 못했어요. 작성한 내용은 그대로 있으니 다시 시도해 주세요.');
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setIsSaving(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (savingRef.current || !isReady || !isRestored || photoBusy || voiceActive) return;
    if (!draft.title.trim()) { setSubmitError('제목을 입력해 주세요.'); titleRef.current?.focus(); return; }
    if (editingItem) void commit(draft.category);
    else setDialog('category');
  };

  const disabled = isSaving || !isRestored;
  const meaningfulInput = Boolean(draft.body.trim() || draft.title.trim());
  const fieldClass = 'w-full rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-base font-normal';
  const showPlaceHint = autoPlaceLinkOn && draft.category !== 'CINEMA' && !draft.place && draft.title.trim().length >= 2;

  const oneTapLinkPlace = async () => {
    const q = draft.title.trim();
    if (q.length < 2) return;
    try {
      const response = await fetch(`/api/places/search?q=${encodeURIComponent(q)}&category=${draft.category}`);
      if (response.ok) {
        const result = await response.json();
        const list = Array.isArray(result.results) ? result.results.filter(isPlace) : [];
        const best = list.find((p: MapApiPlace) => p.coordinates && Number.isFinite(p.coordinates.lat)) || list[0];
        if (best) {
          update('place', best);
          return;
        }
      }
    } catch {
      /* fallback to dialog */
    }
    setSearchQuery(q);
    setDialog('place');
  };

  return (
    <section className={`quick-composer ${draft.img ? 'has-photo' : 'without-photo'} ${editingItem ? 'is-editing' : ''} mx-auto w-full`} aria-labelledby={`${id}-heading`}>
      <h1 id={`${id}-heading`} className="sr-only">{editingItem ? '기록 수정' : '기록 작성'}</h1>
      {editingItem && <div className="mb-3 flex justify-end"><button type="button" onClick={onCancelEdit} disabled={isSaving} className="quick-control min-h-11 rounded-full px-4 text-sm font-medium text-[var(--muted)]">수정 취소</button></div>}
      <form noValidate onSubmit={submit} onKeyDown={(event) => { if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') { event.preventDefault(); event.currentTarget.requestSubmit(); } }} aria-busy={isSaving} className="quick-form">
        <div className="quick-fields" role="group" aria-label="기록 내용" aria-disabled={disabled}>
          <div
            ref={surfaceRef}
            className="quick-input-surface"
            onFocusCapture={(event) => {
              const target = event.target as HTMLElement;
              if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') return;
              if ((target as HTMLInputElement).type === 'range' || (target as HTMLInputElement).type === 'file') return;
              composerFocusedRef.current = true;
              if (typeof window !== 'undefined' && window.innerWidth <= 640) {
                document.documentElement.dataset.keyboard = 'open';
                const snapTop = () => {
                  window.scrollTo(0, 0);
                  document.documentElement.scrollTop = 0;
                  document.body.scrollTop = 0;
                };
                snapTop();
                requestAnimationFrame(snapTop);
                setTimeout(snapTop, 60);
                setTimeout(snapTop, 160);
                setTimeout(snapTop, 300);
              }
            }}
            onBlurCapture={() => {
              setTimeout(() => {
                const active = document.activeElement as HTMLElement | null;
                const stillInside = Boolean(
                  active &&
                  surfaceRef.current?.contains(active) &&
                  (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')
                );
                composerFocusedRef.current = stillInside;
                if (!stillInside && typeof window !== 'undefined') {
                  const vv = window.visualViewport;
                  const delta = vv ? window.innerHeight - vv.height : 0;
                  if (delta <= 100) {
                    delete document.documentElement.dataset.keyboard;
                  }
                }
              }, 80);
            }}
          >
            <div className={`quick-title ${titleFocused || draft.title ? 'is-active' : ''}`}>
              <label htmlFor={`${id}-title`}>제목 <span aria-hidden="true" className="text-[var(--accent)]">*</span><span className="sr-only">필수</span></label>
              <input ref={titleRef} id={`${id}-title`} name="title" value={draft.title} placeholder={titleFocused ? '제목을 입력해 주세요' : ''} disabled={disabled} onFocus={() => setTitleFocused(true)} onBlur={() => setTitleFocused(false)} onChange={(event) => update('title', event.target.value)} maxLength={120} required aria-required="true" aria-invalid={Boolean(submitError && !draft.title.trim())} aria-describedby={submitError && !draft.title.trim() ? `${id}-save-error` : undefined} />
            </div>

            {!draft.title.trim() && suggestedTitle && <button type="button" className="voice-title-suggestion" disabled={disabled || voiceActive} onClick={() => update('title', suggestedTitle)}><small>제목 제안</small><span>{suggestedTitle}</span><span aria-hidden="true">↗</span></button>}
            {(showPlaceHint || (!editingItem && inboxPlaces.length > 0)) && (
              <div className="quick-smart-chips" role="group" aria-label="빠른 장소 연결">
                {showPlaceHint && (
                  <button
                    type="button"
                    className="quick-control quick-smart-chip"
                    onClick={() => void oneTapLinkPlace()}
                  >
                    <MapPin size={13} aria-hidden="true" />
                    <span>‘{draft.title.trim().slice(0, 18)}’ 위치 원탭 연결</span>
                  </button>
                )}
                {!editingItem && inboxPlaces.length > 0 && (
                  <button
                    type="button"
                    className="quick-control quick-smart-chip"
                    onClick={() => setDialog('inbox')}
                  >
                    <Inbox size={13} aria-hidden="true" />
                    <span>구글 지도 대기열 ({inboxPlaces.length})</span>
                  </button>
                )}
              </div>
            )}

            <PhotoMemoCanvas id={`${id}-body`} body={draft.body} img={draft.img} cropX={draft.cropX} cropY={draft.cropY} cropZoom={draft.cropZoom} photoFit={draft.photoFit} defaultFit={editingItem?.cardAppearance?.slot.layout==='ticket'?'contain':'cover'} onCrop={crop=>setDraft(current=>({...current,...crop}))} cropOpen={cropOpen} disabled={disabled} onBody={(body) => update('body', body)} onToggleCrop={() => setCropOpen((current) => !current)} onRemovePhoto={() => { photoToken.current += 1; setPhotoBusy(false); update('img', ''); setCropOpen(false); }} />
            {draft.img && cropOpen && <><p className="photo-adjust-hint">사진을 드래그해 위치를 옮길 수 있어요.</p><PhotoCropControls value={photoCrop(draft)} defaultFit={editingItem?.cardAppearance?.slot.layout==='ticket'?'contain':'cover'} disabled={disabled} positions onChange={crop=>setDraft(current=>({...current,...crop}))}/></>}

            <VoiceLogInput leadingAction={<button type="button" onClick={() => setDialog('photo')} disabled={disabled || !isReady || photoBusy} aria-busy={photoBusy} aria-label={draft.img ? '사진 바꾸기' : '사진 첨부'} title={draft.img ? '사진 바꾸기' : '사진 첨부'} className="quick-control input-tool-button quick-camera-button">{photoBusy ? <LoaderCircle size={22} className="preset-spinner" aria-hidden="true"/> : <Camera size={22} strokeWidth={1.7} aria-hidden="true"/>}</button>} blocked={disabled || !isReady || photoBusy || Boolean(dialog) || cropOpen} full={draft.body.length >= 5000} onActiveChange={setVoiceActive} onText={text => {
              setSpokenText(current => (current + ' ' + text).trim().slice(0, 600));
              setDraft(current => ({ ...current, body: (current.body + (current.body && !/\s$/.test(current.body) ? ' ' : '') + text).slice(0, 5000) }));
              setSubmitError(''); setSaved(false);
            }}/>

            {photoError && <p role="alert" className="text-sm leading-relaxed text-[var(--accent)]">{photoError}</p>}
          </div>
        </div>

        <div className="quick-composer-footer">
            <div className="quick-actions" role="group" aria-label="기록 첨부">
              <button type="button" onClick={() => setDialog('movie')} disabled={disabled || photoBusy} aria-label="영화 및 드라마 검색" className={`quick-control quick-action quick-movie-button ${draft.media?.type === 'movie' || draft.media?.type === 'tv' ? 'selected' : ''}`}><Clapperboard size={17} aria-hidden="true"/><span>영화·드라마</span></button>
              <button type="button" onClick={() => setDialog('book')} disabled={disabled || photoBusy} aria-label="책 검색" className={`quick-control quick-action quick-book-button ${draft.media?.type === 'book' ? 'selected' : ''}`}><BookOpen size={17} aria-hidden="true"/><span>책</span></button>
              <input ref={fileRef} type="file" accept="image/*" multiple={false} tabIndex={-1} hidden disabled={disabled} aria-label="기록 사진 선택" onChange={event=>selectPhoto(event.currentTarget)} />
              <input ref={cameraRef} type="file" accept="image/*" multiple={false} capture="environment" tabIndex={-1} hidden disabled={disabled} aria-label="사진 촬영" onChange={event=>selectPhoto(event.currentTarget)} />
              <button type="button" onClick={() => { if (!searchQuery && !draft.place && draft.title.trim()) setSearchQuery(draft.title.trim()); setDialog('place'); }} disabled={disabled} aria-label={draft.place?`장소·작품 변경: ${draft.place.name}`:'장소·작품 선택'} title={draft.place?.name || '장소·작품 선택'} className={`quick-control quick-action ${draft.place ? 'selected' : ''}`}><MapPin size={17} aria-hidden="true" /><span>{draft.place ? draft.place.name.slice(0, 8) : '장소'}</span></button>
              <button type="button" aria-label="세부 설정" onClick={() => setDialog('details')} disabled={disabled} className={`quick-control quick-action ${draft.occurredAt!=null || draft.score !== null || draft.good || draft.bad || draft.note ? 'selected' : ''}`}><SlidersHorizontal size={16} aria-hidden="true" /><span>세부 설정</span></button>
            </div>
        <div className="quick-save">
          {submitError && <p id={`${id}-save-error`} role="alert" className="mb-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3 text-sm leading-relaxed text-[var(--accent)]">{submitError}</p>}
          {draftError && <p role="alert" className="mb-4 text-sm leading-relaxed text-[var(--accent)]">{draftError}</p>}
          <p aria-live="polite" role="status" className="sr-only">{isSaving ? '기록 저장 중' : saved ? '기록을 저장했습니다.' : ''}</p>
          <div className="flex justify-end">
            <button type="submit" data-save-state={saved ? 'saved' : isSaving ? 'saving' : 'idle'} disabled={!isReady || !isRestored || !meaningfulInput || isSaving || photoBusy || voiceActive} className="quick-control quick-save-button"><SaveFeedback state={saved ? 'saved' : isSaving ? 'saving' : 'idle'} label={editingItem ? '수정 저장' : voiceActive ? '음성 입력을 마친 뒤 저장' : '로그 저장'} /></button>
          </div>
        </div>
        </div>
      </form>

      <PhotoPickerDialog key={dialog==='movie'?'movie':dialog==='book'?'book':'photo'} mode={dialog==='movie'?'movie':dialog==='book'?'book':'photo'} open={dialog==='photo'||dialog==='movie'||dialog==='book'} onClose={()=>setDialog(null)} selectionError={photoError} onAlbum={()=>openPhotoPicker(fileRef.current)} onCamera={()=>openPhotoPicker(cameraRef.current)} onMedia={item=>{
        photoToken.current += 1;
        const book=item.type==='book';
        const reference = `[${book?'책':'TMDB'} 참고] ${item.title}${book&&item.authors?.length?` · ${item.authors.slice(0,2).join(' · ')}`:item.rating>0?` · 평점 ${item.rating.toFixed(1)}/10`:''}${item.overview?`\n${item.overview}`:''}`;
        setDraft(current=>({...current,title:current.title.trim()?current.title:item.title,img:item.poster,cropX:50,cropY:50,cropZoom:1,photoFit:undefined,category:book?'OTHER':'CINEMA',media:normalizeLogMedia(item),note:[current.note.replace(/\[(?:TMDB|책) 참고\][\s\S]*?(?=\n\n|$)/g,'').trim(),reference].filter(Boolean).join('\n\n').slice(0,1000)}));
        setManualCategory(true);setPhotoError('');setSaved(false);setDialog(null);
      }}/>
      <AccessibleDialog open={dialog === 'category'} onClose={() => { if (!isSaving) setDialog(null); }} title="어떤 로그인가요?">
        <div className="quick-category-sheet" role="group" aria-label="로그 분류 선택" aria-busy={isSaving}>{ARCHIVE_CATEGORIES.map((category) => { const Icon = CATEGORY_ICONS[category.icon]; const selected = committingCategory === category.id; return <button type="button" key={category.id} data-save-state={selected && isSaving ? saved ? 'saved' : 'saving' : 'idle'} className={(isSaving ? selected : draft.category === category.id) ? 'suggested' : ''} disabled={isSaving} onClick={() => { setManualCategory(true); update('category', category.id); void commit(category.id); }}><Icon size={28} /><strong>{category.label}</strong>{selected && isSaving ? <small role="status"><SaveFeedback state={saved ? 'saved' : 'saving'} label={category.label} /></small> : !isSaving && draft.category === category.id ? <small>추천</small> : null}</button>; })}</div>
        {submitError && <p role="alert" className="test-inline-error">{submitError}</p>}
      </AccessibleDialog>

      <AccessibleDialog open={dialog === 'inbox'} onClose={() => setDialog(null)} title={`구글 지도 대기열 (${inboxPlaces.length})`}>
        <div className="space-y-3">
          <p className="text-xs leading-relaxed text-[var(--muted)]">가져온 장소를 선택하면 제목·주소·좌표가 자동으로 채워집니다.</p>
          {inboxPlaces.length === 0 ? (
            <p className="py-6 text-center text-sm text-[var(--muted)]">대기 중인 장소가 없습니다.</p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto pr-1">
              {inboxPlaces.map((item) => (
                <li key={item.id} className="flex items-center justify-between gap-2 rounded-2xl border border-[var(--line)] bg-[var(--bg)] p-3">
                  <button
                    type="button"
                    onClick={() => applyInboxItem(item)}
                    className="quick-control min-w-0 flex-1 text-left"
                  >
                    <span className="block truncate text-sm font-bold">{item.title}</span>
                    <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                      {getArchiveCategory(item.category).label} · {item.address || item.addressShort}
                    </span>
                    {item.note && <span className="mt-1 block truncate text-xs text-[var(--accent)]">“{item.note}”</span>}
                  </button>
                  {onRemoveInboxPlace && (
                    <button
                      type="button"
                      aria-label={`${item.title} 대기열에서 삭제`}
                      onClick={() => onRemoveInboxPlace(item.id)}
                      className="quick-control flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-lg text-[var(--muted)]"
                    >
                      ×
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          <button type="button" onClick={() => setDialog(null)} className="quick-control min-h-[48px] w-full rounded-2xl border border-[var(--line)] bg-[var(--fg)] px-6 py-3 text-base font-semibold text-[var(--bg)]">닫기</button>
        </div>
      </AccessibleDialog>

      <AccessibleDialog open={dialog === 'place'} onClose={() => setDialog(null)} title={pickedLocation?'위치 선택':'장소·작품'} initialFocusId={pickedLocation?undefined:placeId}>
        {pickedLocation?<div className="quick-location-picker">
          <LocationPickerMap point={pickedLocation} onChange={setPickedLocation}/>
          {locationMessage&&<p className="quick-location-accuracy" role="status">{locationMessage}</p>}
          <label className="quick-location-name">장소 이름<input value={locationName} onChange={event=>setLocationName(event.target.value)} placeholder="예: 집, 성수 카페" maxLength={80} autoComplete="off"/></label>
          <div className="quick-location-picker-actions"><button type="button" onClick={()=>{cancelLocation();setPickedLocation(null);setLocationName('');}}>검색으로</button><button type="button" className="primary" onClick={applyLocation}>이 위치로 적용</button></div>
        </div>:<fieldset disabled={isSaving} className="space-y-7 border-0 p-0">
          <div>
            <label htmlFor={placeId} className="mb-2 block text-sm font-semibold">장소·작품</label>
            {draft.place && <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-4 py-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{draft.place.name}</p><p className="mt-0.5 truncate text-xs text-[var(--muted)]">{draft.place.id==='current-location'?<a href={draft.place.link} target="_blank" rel="noopener noreferrer" className="text-[var(--accent)] underline underline-offset-2" aria-label="현재 위치 Google 지도에서 확인">지도에서 확인</a>:draft.place.short || draft.place.loc}</p>{isGeoPoint(draft.place.coordinates)&&<button type="button" className="quick-location-edit" onClick={()=>{cancelLocation();setPickedLocation(draft.place!.coordinates!);setLocationName(draft.place!.name==='현재 위치'?'':draft.place!.name);}}>위치·이름 수정</button>}</div><button type="button" onClick={() => { cancelLocation(); update('place', null); setSearchQuery(''); }} aria-label="선택한 장소·작품 제거" className="quick-control flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-[var(--muted)]">×</button></div>}
            <button type="button" className="quick-current-location" disabled={disabled || locating} aria-busy={locating} onClick={()=>requestLocation(point=>{setPickedLocation(point);setLocationName('');setSearchQuery('');setPlaceResults([]);setSearchError('');})}>{locating?<LoaderCircle size={18} className="preset-spinner" aria-hidden="true"/>:<LocateFixed size={18} aria-hidden="true"/>}<span>{locating?'위치 확인 중…':'현재 위치 사용'}</span></button>
            <p className={`quick-location-status ${locationError?'is-error':''}`} role={locationError?'alert':'status'} aria-live="polite">{locationError || locationMessage}</p>
            <input id={placeId} type="search" autoComplete="off" value={searchQuery} onChange={(event) => { cancelLocation(); setSearchQuery(event.target.value); if (draft.place) update('place', null); }} placeholder={draft.category === 'CINEMA' ? '영화 제목 검색' : '장소 이름 검색'} aria-describedby={`${id}-search-status`} className={fieldClass} />
            <p id={`${id}-search-status`} role="status" aria-live="polite" className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{searching ? '검색 중…' : searchError || (searchQuery.trim().length >= 2 && placeResults.length === 0 ? '검색 결과가 없습니다.' : '')}</p>
            {placeResults.length > 0 && <ul aria-label="장소·작품 검색 결과" className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-[var(--line)] p-1.5">{placeResults.map((place, index) => <li key={`${place.id || place.name}-${index}`}><button type="button" onClick={() => { cancelLocation(); setDraft((current) => ({ ...current, title: current.title.trim() ? current.title : place.name, place, category: !manualCategory && place.category ? place.category : current.category })); setSearchQuery(''); setPlaceResults([]); setSubmitError(''); }} className="quick-control min-h-14 w-full rounded-xl border border-transparent px-3 py-3 text-left"><span className="block text-sm font-semibold">{place.name}</span><span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">{place.short || place.loc}</span></button></li>)}</ul>}
          </div>

          <button type="button" onClick={() => setDialog(null)} className="quick-control min-h-[48px] w-full rounded-2xl border border-[var(--line)] bg-[var(--fg)] px-6 py-3 text-base font-semibold text-[var(--bg)]">완료</button>
        </fieldset>}
      </AccessibleDialog>

      <AccessibleDialog open={dialog === 'details'} onClose={() => setDialog(null)} title="세부 설정" initialFocusId={scoreId}>
        <fieldset disabled={isSaving} className="space-y-6 border-0 p-0">
          <label className="quick-experience-date">일어난 날짜·시간 <small>한국 시간 · 비워두면 저장한 시간</small><input type="datetime-local" min="1900-01-01T00:00" max="9999-12-31T23:59" value={dateTimeInput(draft.occurredAt)} onChange={event=>{try{update('occurredAt',parseExperienceInput(event.target.value));}catch{setSubmitError('날짜와 시간을 확인해 주세요.');}}}/>{draft.occurredAt!=null&&<button type="button" onClick={()=>update('occurredAt',null)}>저장한 시간으로</button>}</label>
          {editingItem && <div className="quick-edit-categories">{ARCHIVE_CATEGORIES.map((category) => <button type="button" key={category.id} aria-pressed={draft.category === category.id} className={draft.category === category.id ? 'selected' : ''} onClick={() => update('category', category.id)}>{category.label}</button>)}</div>}
          <div>
            <div className="mb-3 flex items-center justify-between gap-3">
              <label htmlFor={scoreId} className="text-sm font-semibold">
                별점 <span className="ml-2 font-normal text-[var(--muted)]">{draft.score === null ? '남기지 않음' : `★ ${draft.score.toFixed(1)} / 5.0`}</span>
              </label>
              {draft.score !== null && (
                <button type="button" onClick={() => update('score', null)} className="quick-control min-h-9 rounded-full px-3 text-xs font-medium text-[var(--muted)]">
                  별점 지우기
                </button>
              )}
            </div>
            <div className="quick-star-row" role="group" aria-label="빠른 별점 선택">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  aria-pressed={draft.score !== null && Math.round(draft.score) === star}
                  onClick={() => update('score', star)}
                  className={`quick-control quick-star-btn ${draft.score !== null && draft.score >= star ? 'active' : ''}`}
                >
                  <Star size={14} fill={draft.score !== null && draft.score >= star ? 'currentColor' : 'none'} />
                  <span>{star}</span>
                </button>
              ))}
            </div>
            <input id={scoreId} type="range" min="0" max="5" step="0.5" value={draft.score ?? 0} aria-valuetext={draft.score === null ? '별점 없음. 방향키로 별점을 남기세요.' : `${draft.score.toFixed(1)}점`} onChange={(event) => update('score', Number(event.target.value))} className="block h-11 w-full" />
            <div className="flex justify-between text-xs text-[var(--muted)]"><span>0.0</span><span>2.5</span><span>5.0</span></div>
          </div>

          <div className="space-y-4 border-t border-[var(--line)] pt-6">
            {([{ key: 'good', label: '좋았던 점', placeholder: '다시 떠올리고 싶은 디테일' }, { key: 'bad', label: '아쉬웠던 점', placeholder: '다음에는 달라졌으면 하는 것' }, { key: 'note', label: '다음의 나에게', placeholder: '다시 방문하거나 볼 때 참고할 메모' }] as const).map((field) => <div key={field.key}><label htmlFor={field.key === 'good' ? goodId : `${id}-${field.key}`} className="mb-2 block text-sm font-semibold">{field.label}</label><textarea id={field.key === 'good' ? goodId : `${id}-${field.key}`} rows={2} maxLength={1000} value={draft[field.key]} onChange={(event) => update(field.key, event.target.value)} placeholder={field.placeholder} className={`${fieldClass} resize-y`} /></div>)}
          </div>
          <button type="button" onClick={() => setDialog(null)} className="quick-control min-h-[48px] w-full rounded-2xl border border-[var(--line)] bg-[var(--fg)] px-6 py-3 text-base font-semibold text-[var(--bg)]">완료</button>
        </fieldset>
      </AccessibleDialog>
    </section>
  );
}
