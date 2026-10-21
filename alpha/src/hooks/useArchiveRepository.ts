'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ArchiveItem } from '@/types/l2';
import { IndexedDbArchiveStorage, LocalArchiveRepository } from '@/lib/localArchiveRepository';

export function useArchiveRepository() {
  const repository = useMemo(() => new LocalArchiveRepository(new IndexedDbArchiveStorage()), []);
  const [view, setView] = useState(() => repository.getView());
  useEffect(() => {
    const unsubscribe = repository.subscribe(setView);
    void repository.start();
    const reconnect = () => { void repository.retrySync(); };
    window.addEventListener('online', reconnect);
    return () => { unsubscribe(); window.removeEventListener('online', reconnect); };
  }, [repository]);
  return {
    ...view,
    save: useCallback((item: ArchiveItem, isEdit = false) => repository.save(item, isEdit), [repository]),
    remove: useCallback((id: string) => repository.remove(id), [repository]),
    restoreBatch: useCallback((items:ArchiveItem[],owner:string)=>repository.restoreBatch(items,owner),[repository]),
    prepareForLogin: useCallback(() => repository.prepareForLogin(), [repository]),
    resetAllLogs: useCallback(() => repository.resetAllLogs(), [repository]),
    retrySync: useCallback(() => repository.retrySync(), [repository]),
    refresh: useCallback(() => repository.refresh(), [repository]),
    setArchives: useCallback((update: ArchiveItem[] | ((current: ArchiveItem[]) => ArchiveItem[])) => { void repository.setArchives(update); }, [repository]),
  };
}

export default useArchiveRepository;
