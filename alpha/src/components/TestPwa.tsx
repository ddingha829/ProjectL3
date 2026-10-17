'use client';
import { useEffect } from 'react';

export default function TestPwa() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') {
      // Unregister any leftover production service workers on the same port in dev mode
      // so stale chunk hashes never cause ChunkLoadError.
      void navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => void registration.unregister());
      }).catch(() => {});
      if ('caches' in window) {
        void caches.keys().then((keys) => {
          keys.filter((k) => k.startsWith('l2-test-shell-')).forEach((k) => void caches.delete(k));
        }).catch(() => {});
      }
      return;
    }

    let canceled = false;
    const onMessage = (event: MessageEvent) => {
      if (event.data?.type === 'L2_CACHE_READY') {
        document.documentElement.dataset.offlineReady = 'true';
      }
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    void (async () => {
      try {
        await navigator.serviceWorker.register('/sw.js');
        await navigator.serviceWorker.ready;
        if (!navigator.serviceWorker.controller) {
          await new Promise<void>((resolve) => {
            const listener = () => {
              navigator.serviceWorker.removeEventListener('controllerchange', listener);
              resolve();
            };
            navigator.serviceWorker.addEventListener('controllerchange', listener, { once: true });
          });
        }
        if (canceled) return;
        await Promise.allSettled([
          import('./ArchiveBrowser'),
          import('./CardWorkspace'),
          import('./StudioPanel'),
          import('./SettingsDialog'),
          import('./LogbookMap'),
          import('leaflet'),
        ]);
        if (canceled) return;
        const urls = [
          ...new Set(
            performance
              .getEntriesByType('resource')
              .map((entry) => entry.name)
              .filter((url) => {
                const parsed = new URL(url);
                return parsed.origin === location.origin && parsed.pathname.startsWith('/_next/static/');
              })
          ),
        ];
        navigator.serviceWorker.controller?.postMessage({ type: 'L2_CACHE_ASSETS', urls });
      } catch {
        /* Local draft/repository storage stays usable even when app-shell caching is unavailable. */
      }
    })();
    return () => {
      canceled = true;
      navigator.serviceWorker.removeEventListener('message', onMessage);
    };
  }, []);
  return null;
}
