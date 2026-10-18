'use client';

import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { LogDraft } from '@/components/QuickLogComposer';
import { isArchiveCategory } from '@/lib/archiveCategories';
import { isGeoPoint } from '@/lib/mapLocations';

type DraftStatus = 'loading' | 'saved' | 'saving' | 'empty' | 'error';

export function isStoredDraft(value: unknown): value is LogDraft {
  if (!value || typeof value !== 'object') return false;
  const draft = value as Partial<LogDraft>;
  const validPlace = draft.place === null || (
    typeof draft.place === 'object' && draft.place !== null &&
    typeof draft.place.name === 'string' && typeof draft.place.short === 'string' &&
    typeof draft.place.loc === 'string' && typeof draft.place.link === 'string' &&
    typeof draft.place.x === 'number' && typeof draft.place.y === 'number' &&
    (draft.place.coordinates === undefined || isGeoPoint(draft.place.coordinates))
  );
  return ['title', 'body', 'img', 'good', 'bad', 'note'].every((key) => typeof draft[key as keyof LogDraft] === 'string') &&
    isArchiveCategory(draft.category) && draft.category !== 'GROUP' &&
    (draft.score === null || (typeof draft.score === 'number' && Number.isFinite(draft.score) && draft.score >= 0 && draft.score <= 5)) &&
    typeof draft.cropX === 'number' && Number.isFinite(draft.cropX) && draft.cropX >= 0 && draft.cropX <= 100 &&
    (draft.cropZoom===undefined||(typeof draft.cropZoom==='number'&&Number.isFinite(draft.cropZoom)&&draft.cropZoom>=1&&draft.cropZoom<=3)) &&
    (draft.photoFit===undefined||draft.photoFit==='contain'||draft.photoFit==='cover') &&
    typeof draft.cropY === 'number' && Number.isFinite(draft.cropY) && draft.cropY >= 0 && draft.cropY <= 100 && validPlace;
}

function hasContent(draft: LogDraft) {
  return Boolean(draft.title.trim() || draft.body.trim() || draft.img || draft.place || draft.score !== null || draft.good.trim() || draft.bad.trim() || draft.note.trim());
}

/** Local recovery is independent from the durable archive save. */
export function useLogDraft(storageKey: string, initialDraft: LogDraft) {
  const initialRef = useRef(initialDraft);
  initialRef.current = initialDraft;
  const [draft, setDraft] = useState<LogDraft>(initialDraft);
  const draftRef = useRef(draft);
  draftRef.current = draft;
  const [hydratedKey, setHydratedKey] = useState<string | null>(null);
  const [status, setStatus] = useState<DraftStatus>('loading');
  const [error, setError] = useState('');
  const [restored, setRestored] = useState(false);
  const skipWriteRef = useRef(false);

  useEffect(() => {
    setError('');
    setRestored(false);
    let next = initialRef.current;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: unknown = JSON.parse(stored);
        if (!isStoredDraft(parsed)) throw new Error('invalid draft');
        next = parsed;
        setRestored(hasContent(next));
      }
      setStatus(hasContent(next) ? 'saved' : 'empty');
    } catch {
      setError('이전 초안을 불러오지 못했어요. 현재 작성한 내용은 지우지 않고 유지합니다.');
      setStatus('error');
    }
    skipWriteRef.current = false;
    draftRef.current = next;
    setDraft(next);
    setHydratedKey(storageKey);
  }, [storageKey]);

  useEffect(() => {
    if (hydratedKey !== storageKey) return;
    if (skipWriteRef.current) {
      skipWriteRef.current = false;
      return;
    }
    setStatus(hasContent(draft) ? 'saving' : 'empty');
    const timer = window.setTimeout(() => {
      try {
        if (hasContent(draft)) localStorage.setItem(storageKey, JSON.stringify(draft));
        else localStorage.removeItem(storageKey);
        setError('');
        setStatus(hasContent(draft) ? 'saved' : 'empty');
      } catch {
        setError('이 기기에 초안을 보관하지 못했어요. 저장 공간이 부족할 수 있어요. 기록 저장 버튼으로 먼저 보관해 주세요.');
        setStatus('error');
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [draft, storageKey, hydratedKey]);

  // Flush the latest keystrokes before a refresh, navigation, or app suspension.
  useEffect(() => {
    if (hydratedKey !== storageKey) return;
    const flush = () => {
      try {
        const current = draftRef.current;
        if (hasContent(current)) localStorage.setItem(storageKey, JSON.stringify(current));
        else localStorage.removeItem(storageKey);
      } catch { /* The visible debounced writer reports recoverable storage errors. */ }
    };
    const onVisibility = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      flush();
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [storageKey, hydratedKey]);

  const clearDraft = useCallback((next: LogDraft) => {
    skipWriteRef.current = true;
    draftRef.current = next;
    setDraft(next);
    setRestored(false);
    try {
      localStorage.removeItem(storageKey);
      setStatus('empty');
      setError('');
    } catch {
      setStatus('error');
      setError('기록은 저장했지만 이 기기의 이전 초안을 지우지 못했어요.');
    }
  }, [storageKey]);

  return {
    draft,
    setDraft: setDraft as Dispatch<SetStateAction<LogDraft>>,
    isRestored: hydratedKey === storageKey,
    restored,
    status,
    error,
    clearDraft,
  };
}
