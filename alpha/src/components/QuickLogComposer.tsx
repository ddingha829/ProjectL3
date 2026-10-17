'use client';

import { useEffect, useId, useMemo, useRef, useState, type FormEvent } from 'react';
import { Camera, MapPin, SlidersHorizontal, Utensils, Clapperboard, Shapes, Sparkles, Inbox, Star } from 'lucide-react';
import type { ArchiveCategory, ArchiveItem, MapApiPlace, PlaceInboxItem } from '@/types/l2';
import { ARCHIVE_CATEGORIES, getArchiveCategory } from '@/lib/archiveCategories';
import { useLogDraft } from '@/hooks/useLogDraft';
import AccessibleDialog from '@/components/AccessibleDialog';
import PhotoMemoCanvas from '@/components/PhotoMemoCanvas';
import './QuickLogComposer.css';

export interface LogDraft {
  title: string;
  body: string;
  category: ArchiveCategory;
  score: number | null;
  img: string;
  cropX: number;
  cropY: number;
  place: MapApiPlace | null;
  good: string;
  bad: string;
  note: string;
  inboxId?: string;
}

export type SuggestedSummary = Pick<LogDraft, 'good' | 'bad' | 'note'>;

interface QuickLogComposerProps {
  editingItem: ArchiveItem | null;
  onSave: (draft: LogDraft) => Promise<void>;
  onCancelEdit: () => void;
  isReady: boolean;
  recordCount: number;
  onSuggest?: (draft: LogDraft) => Promise<SuggestedSummary>;
  inboxPlaces?: PlaceInboxItem[];
  onRemoveInboxPlace?: (id: string) => void;
  autoPlaceLinkOn?: boolean;
}

const CATEGORY_ICONS = { dining: Utensils, cinema: Clapperboard, place: MapPin, other: Shapes };

export function emptyLogDraft(): LogDraft {
  return { title: '', body: '', category: 'DINING', score: null, img: '', cropX: 50, cropY: 50, place: null, good: '', bad: '', note: '' };
}

function draftFromItem(item: ArchiveItem | null): LogDraft {
  if (!item) return emptyLogDraft();
  const parsedScore = Number.parseFloat(item.score);
  return {
    title: item.title || '',
    body: item.quote || '',
    category: item.cat,
    score: Number.isFinite(parsedScore) ? Math.max(0, Math.min(5, parsedScore)) : null,
    img: item.hasPhoto === false ? '' : item.img || '',
    cropX: item.cropX ?? 50,
    cropY: item.cropY ?? 50,
    place: item.loc || item.addressShort || item.fullAddress || item.link ? {
      name: item.title,
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

async function preparePhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('사진 파일을 선택해 주세요.');
  if (file.size > 15 * 1024 * 1024) throw new Error('15MB 이하의 사진을 선택해 주세요.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (!image.naturalWidth || !image.naturalHeight) throw new Error('사진 크기를 확인하지 못했어요.');
    const scale = Math.min(1, 900 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('사진을 준비하지 못했어요. 다시 선택해 주세요.');
    context.fillStyle = '#f5f4f0';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.74);
  } catch (error) {
    if (error instanceof Error && /사진|15MB/.test(error.message)) throw error;
    throw new Error('사진을 읽지 못했어요. JPG, PNG 또는 WebP 사진으로 다시 선택해 주세요.');
  } finally {
    URL.revokeObjectURL(url);
  }
}

export default function QuickLogComposer({
  editingItem,
  onSave,
  onCancelEdit,
  isReady,
  onSuggest,
  inboxPlaces = [],
  onRemoveInboxPlace,
  autoPlaceLinkOn = true,
}: QuickLogComposerProps) {
  const initialDraft = useMemo(() => draftFromItem(editingItem), [editingItem]);
  const storageKey = `l2:quick-log:v1:${editingItem?.id || 'new'}`;
  const { draft, setDraft, isRestored, restored, error: draftError, clearDraft } = useLogDraft(storageKey, initialDraft);
  const [manualCategory, setManualCategory] = useState(Boolean(editingItem));
  const [dialog, setDialog] = useState<'place' | 'details' | 'category' | 'inbox' | null>(null);
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
  const [cropOpen, setCropOpen] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestedSummary | null>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState('');
  const suggestionToken = useRef(0);
  const suggestButtonRef = useRef<HTMLButtonElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
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
      suggestionToken.current += 1;
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
    setSearchQuery('');
    setPlaceResults([]);
    setDialog(null);
    suggestionToken.current += 1;
    setSuggestion(null);
    setSuggesting(false);
    setSuggestionError('');
  }, [storageKey, editingItem]);

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
        setDraft((current) => ({ ...current, img, cropX: 50, cropY: 50 }));
        setSaved(false);
      }
    } catch (error) {
      if (mountedRef.current && token === photoToken.current) setPhotoError(error instanceof Error ? error.message : '사진을 준비하지 못했어요.');
    } finally {
      if (mountedRef.current && token === photoToken.current) setPhotoBusy(false);
    }
  };

  const commit = async (category: ArchiveCategory) => {
    if (savingRef.current || !isReady || !isRestored || photoBusy) return;
    if (!draft.title.trim()) {
      setSubmitError('제목을 입력해 주세요.');
      titleRef.current?.focus();
      return;
    }
    savingRef.current = true;
    setIsSaving(true);
    setSubmitError('');
    try {
      await onSave({ ...draft, category, title: draft.title.trim(), body: draft.body.trim(), good: draft.good.trim(), bad: draft.bad.trim(), note: draft.note.trim() });
      clearDraft(emptyLogDraft());
      if (mountedRef.current) {
        setSaved(true);
        setManualCategory(false);
        setSearchQuery('');
        setCropOpen(false);
        timerRef.current = setTimeout(() => setSaved(false), 2200);
      }
    } catch (error) {
      if (mountedRef.current) setSubmitError(error instanceof Error ? error.message : '저장하지 못했어요. 작성한 내용은 그대로 있으니 다시 시도해 주세요.');
    } finally {
      savingRef.current = false;
      if (mountedRef.current) setIsSaving(false);
    }
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (savingRef.current || !isReady || !isRestored || photoBusy) return;
    if (!draft.title.trim()) { setSubmitError('제목을 입력해 주세요.'); titleRef.current?.focus(); return; }
    if (editingItem) void commit(draft.category);
    else setDialog('category');
  };

  const suggestSummary = async () => {
    if (!onSuggest || suggesting || isSaving) return;
    const token = ++suggestionToken.current;
    setSuggesting(true);
    setSuggestion(null);
    setSuggestionError('');
    try {
      const result = await onSuggest({ ...draft });
      if (!mountedRef.current || token !== suggestionToken.current) return;
      const next = {
        good: typeof result.good === 'string' ? result.good : '',
        bad: typeof result.bad === 'string' ? result.bad : '',
        note: typeof result.note === 'string' ? result.note : '',
      };
      if (!next.good && !next.bad && !next.note) throw new Error('제안할 내용이 없습니다.');
      setSuggestion(next);
    } catch (error) {
      if (mountedRef.current && token === suggestionToken.current) setSuggestionError(error instanceof Error ? error.message : '요약 제안을 받지 못했습니다.');
    } finally {
      if (mountedRef.current && token === suggestionToken.current) setSuggesting(false);
    }
  };

  const disabled = isSaving || !isRestored;
  const meaningfulInput = Boolean(draft.body.trim() || draft.title.trim());
  const fieldClass = 'w-full rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-4 py-3 text-base font-normal';
  const showPlaceHint = autoPlaceLinkOn && !draft.place && draft.title.trim().length >= 2;

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
    <section className={`quick-composer ${draft.img ? 'has-photo' : 'without-photo'} ${editingItem ? 'is-editing' : ''} mx-auto w-full max-w-3xl`} aria-labelledby={`${id}-heading`}>
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

            <PhotoMemoCanvas id={`${id}-body`} body={draft.body} img={draft.img} cropX={draft.cropX} cropY={draft.cropY} cropOpen={cropOpen} disabled={disabled} onBody={(body) => update('body', body)} onToggleCrop={() => setCropOpen((current) => !current)} onRemovePhoto={() => { photoToken.current += 1; setPhotoBusy(false); update('img', ''); setCropOpen(false); }} />
            {draft.img && cropOpen && <div className="grid gap-3 rounded-2xl border border-[var(--line)] p-4 sm:grid-cols-2">{(['cropX', 'cropY'] as const).map((axis) => <label key={axis} className="text-xs font-medium text-[var(--muted)]">{axis === 'cropX' ? '가로 위치' : '세로 위치'}<input type="range" min="0" max="100" step="1" value={draft[axis]} disabled={disabled} onChange={(event) => update(axis, Number(event.target.value))} className="mt-2 block h-8 w-full" /></label>)}</div>}
          </div>

          <div className="quick-actions" role="group" aria-label="기록 첨부">
            <button type="button" onClick={() => fileRef.current?.click()} disabled={disabled || photoBusy} aria-busy={photoBusy} title={draft.img ? '사진 바꾸기' : '사진 첨부'} className={`quick-control quick-action prominent ${draft.img ? 'selected' : ''}`}><Camera size={18} aria-hidden="true" /><span>사진</span></button>
            <input ref={fileRef} type="file" accept="image/*" tabIndex={-1} hidden disabled={disabled} aria-label="기록 사진 선택" onChange={(event) => { const file = event.target.files?.[0]; event.currentTarget.value = ''; void uploadPhoto(file); }} />
            <button type="button" onClick={() => { if (!searchQuery && !draft.place && draft.title.trim()) setSearchQuery(draft.title.trim()); setDialog('place'); }} disabled={disabled} title={draft.place?.name || '장소·작품 선택'} className={`quick-control quick-action prominent ${draft.place ? 'selected' : ''}`}><MapPin size={18} aria-hidden="true" /><span>{draft.place ? draft.place.name.slice(0, 8) : '장소'}</span></button>
            <button type="button" onClick={() => setDialog('details')} disabled={disabled} className={`quick-control quick-action ${draft.score !== null || draft.good || draft.bad || draft.note ? 'selected' : ''}`}><SlidersHorizontal size={16} aria-hidden="true" /><span>세부 설정</span></button>
          </div>
          {photoError && <p role="alert" className="text-sm leading-relaxed text-[var(--accent)]">{photoError}</p>}
        </div>

        <div className="quick-save">
          {submitError && <p id={`${id}-save-error`} role="alert" className="mb-4 rounded-xl border border-[var(--accent)]/30 bg-[var(--accent)]/5 px-4 py-3 text-sm leading-relaxed text-[var(--accent)]">{submitError}</p>}
          {draftError && <p role="alert" className="mb-4 text-sm leading-relaxed text-[var(--accent)]">{draftError}</p>}
          <p aria-live="polite" role="status" className="sr-only">{isSaving ? '기록 저장 중' : saved ? '기록을 저장했습니다.' : ''}</p>
          <div className="flex justify-end">
            <button type="submit" disabled={!isReady || !isRestored || !meaningfulInput || isSaving || photoBusy} className="quick-control quick-save-button">{isSaving ? '저장 중…' : editingItem ? '수정 저장' : '로그 저장'}</button>
          </div>
        </div>
      </form>

      <AccessibleDialog open={dialog === 'category'} onClose={() => { if (!isSaving) setDialog(null); }} title="어떤 로그인가요?">
        <div className="quick-category-sheet" role="group" aria-label="로그 분류 선택">{ARCHIVE_CATEGORIES.map((category) => { const Icon = CATEGORY_ICONS[category.icon]; return <button type="button" key={category.id} className={draft.category === category.id ? 'suggested' : ''} disabled={isSaving} onClick={() => { setManualCategory(true); update('category', category.id); void commit(category.id); }}><Icon size={28} /><strong>{category.label}</strong>{draft.category === category.id && <small>{isSaving ? '저장 중…' : '추천'}</small>}</button>; })}</div>
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

      <AccessibleDialog open={dialog === 'place'} onClose={() => setDialog(null)} title="장소·작품" initialFocusId={placeId}>
        <fieldset disabled={isSaving} className="space-y-7 border-0 p-0">
          <div>
            <label htmlFor={placeId} className="mb-2 block text-sm font-semibold">장소·작품</label>
            {draft.place && <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-[var(--bg)] px-4 py-2"><div className="min-w-0"><p className="truncate text-sm font-semibold">{draft.place.name}</p><p className="mt-0.5 truncate text-xs text-[var(--muted)]">{draft.place.short || draft.place.loc}</p></div><button type="button" onClick={() => { update('place', null); setSearchQuery(''); }} aria-label="선택한 장소·작품 제거" className="quick-control flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-xl text-[var(--muted)]">×</button></div>}
            <input id={placeId} type="search" autoComplete="off" value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); if (draft.place) update('place', null); }} placeholder={draft.category === 'CINEMA' ? '영화 제목 검색' : '장소 이름 검색'} aria-describedby={`${id}-search-status`} className={fieldClass} />
            <p id={`${id}-search-status`} role="status" aria-live="polite" className="mt-2 text-xs leading-relaxed text-[var(--muted)]">{searching ? '검색 중…' : searchError || (searchQuery.trim().length >= 2 && placeResults.length === 0 ? '검색 결과가 없습니다.' : '')}</p>
            {placeResults.length > 0 && <ul aria-label="장소·작품 검색 결과" className="mt-3 max-h-64 space-y-1 overflow-y-auto rounded-2xl border border-[var(--line)] p-1.5">{placeResults.map((place, index) => <li key={`${place.id || place.name}-${index}`}><button type="button" onClick={() => { setDraft((current) => ({ ...current, title: current.title.trim() ? current.title : place.name, place, category: !manualCategory && place.category ? place.category : current.category })); setSearchQuery(''); setPlaceResults([]); setSubmitError(''); }} className="quick-control min-h-14 w-full rounded-xl border border-transparent px-3 py-3 text-left"><span className="block text-sm font-semibold">{place.name}</span><span className="mt-1 block text-xs leading-relaxed text-[var(--muted)]">{place.short || place.loc}</span></button></li>)}</ul>}
          </div>

          <button type="button" onClick={() => setDialog(null)} className="quick-control min-h-[48px] w-full rounded-2xl border border-[var(--line)] bg-[var(--fg)] px-6 py-3 text-base font-semibold text-[var(--bg)]">완료</button>
        </fieldset>
      </AccessibleDialog>

      <AccessibleDialog open={dialog === 'details'} onClose={() => setDialog(null)} title="세부 설정" initialFocusId={scoreId}>
        <fieldset disabled={isSaving} className="space-y-6 border-0 p-0">
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

          {onSuggest && (
            <section className="quick-suggestion" aria-label="요약 제안">
              <div className="flex items-center justify-between gap-3">
                <button
                  ref={suggestButtonRef}
                  type="button"
                  disabled={suggesting || (!draft.title.trim() && !draft.body.trim())}
                  aria-busy={suggesting}
                  onClick={() => void suggestSummary()}
                  className="quick-control quick-suggest-button"
                >
                  <Sparkles size={16} aria-hidden="true" />
                  {suggesting ? '요약 만드는 중…' : 'AI 요약 제안 받기'}
                </button>
                {!draft.title.trim() && !draft.body.trim() && (
                  <span className="text-xs text-[var(--muted)]">제목이나 메모 입력 후 사용 가능</span>
                )}
              </div>
              {suggestionError && <p role="alert" className="mt-3 text-sm leading-relaxed text-[var(--accent)]">{suggestionError}</p>}
              {suggestion && (
                <div className="quick-suggestion-preview">
                  <dl>
                    {([{ key: 'good', label: '좋았던 점' }, { key: 'bad', label: '아쉬웠던 점' }, { key: 'note', label: '다음의 나에게' }] as const).map((field) =>
                      suggestion[field.key] ? (
                        <div key={field.key}>
                          <dt>{field.label}</dt>
                          <dd>{suggestion[field.key]}</dd>
                        </div>
                      ) : null
                    )}
                  </dl>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft((current) => ({ ...current, good: suggestion.good, bad: suggestion.bad, note: suggestion.note }));
                      setSaved(false);
                      setSuggestion(null);
                      requestAnimationFrame(() => suggestButtonRef.current?.focus({ preventScroll: true }));
                    }}
                    className="quick-control quick-suggest-apply"
                  >
                    적용
                  </button>
                </div>
              )}
            </section>
          )}

          <div className="space-y-4 border-t border-[var(--line)] pt-6">
            {([{ key: 'good', label: '좋았던 점', placeholder: '다시 떠올리고 싶은 디테일' }, { key: 'bad', label: '아쉬웠던 점', placeholder: '다음에는 달라졌으면 하는 것' }, { key: 'note', label: '다음의 나에게', placeholder: '다시 방문하거나 볼 때 참고할 메모' }] as const).map((field) => <div key={field.key}><label htmlFor={field.key === 'good' ? goodId : `${id}-${field.key}`} className="mb-2 block text-sm font-semibold">{field.label}</label><textarea id={field.key === 'good' ? goodId : `${id}-${field.key}`} rows={2} maxLength={1000} value={draft[field.key]} onChange={(event) => update(field.key, event.target.value)} placeholder={field.placeholder} className={`${fieldClass} resize-y`} /></div>)}
          </div>
          <button type="button" onClick={() => setDialog(null)} className="quick-control min-h-[48px] w-full rounded-2xl border border-[var(--line)] bg-[var(--fg)] px-6 py-3 text-base font-semibold text-[var(--bg)]">완료</button>
        </fieldset>
      </AccessibleDialog>
    </section>
  );
}
