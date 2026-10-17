'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { PresetPreferenceRepository, type PresetPreferences, type PresetServerSnapshot } from '@/lib/presetPreferences';
import { archiveTransport } from '@/lib/localArchiveRepository';

export function usePresetPreferences(snapshot: PresetServerSnapshot | null) {
  const repository = useMemo(() => new PresetPreferenceRepository({
    read: key => { const raw = localStorage.getItem(key); return raw ? JSON.parse(raw) : null; },
    write: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
  }, archiveTransport), []);
  const [preferences, setPreferences] = useState(() => repository.getView());
  useEffect(() => {
    const unsubscribe = repository.subscribe(() => setPreferences(repository.getView()));
    repository.start();
    const retry = () => { void repository.retrySync(); };
    window.addEventListener('online', retry);
    return () => { unsubscribe(); window.removeEventListener('online', retry); repository.stop(); };
  }, [repository]);
  useEffect(() => { repository.applySnapshot(snapshot); }, [repository, snapshot]);
  return {
    ...preferences,
    update: useCallback((patch: Partial<PresetPreferences> | ((previous: PresetPreferences) => PresetPreferences)) => repository.update(patch), [repository]),
    retrySync: useCallback(() => repository.retrySync(), [repository]),
  };
}
