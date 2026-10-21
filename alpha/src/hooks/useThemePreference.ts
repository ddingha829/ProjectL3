'use client';
import { useEffect, useRef, useState } from 'react';
import { applyTheme, normalizeThemePreference, THEME_STORAGE_KEY, type ThemePreference } from '@/lib/themePreference';

export function useThemePreference() {
  const [theme, setTheme] = useState<ThemePreference>('auto');
  const current = useRef<ThemePreference>('auto');
  useEffect(() => {
    const system = matchMedia('(prefers-color-scheme: dark)');
    const sync = (value: ThemePreference) => {
      current.current = value;
      setTheme(value);
      applyTheme(value, system.matches);
    };
    let initial: ThemePreference = 'auto';
    let storage: Storage | undefined;
    try { storage = localStorage; initial = normalizeThemePreference(storage.getItem(THEME_STORAGE_KEY)); } catch {}
    sync(initial);
    const onSystem = () => applyTheme(current.current, system.matches);
    const onStorage = (event: StorageEvent) => {
      if (storage && event.storageArea === storage && (event.key === THEME_STORAGE_KEY || event.key === null)) sync(normalizeThemePreference(event.newValue));
    };
    system.addEventListener('change', onSystem);
    window.addEventListener('storage', onStorage);
    return () => { system.removeEventListener('change', onSystem); window.removeEventListener('storage', onStorage); };
  }, []);
  const changeTheme = (value: ThemePreference) => {
    current.current = value;
    setTheme(value);
    applyTheme(value, matchMedia('(prefers-color-scheme: dark)').matches);
    try { localStorage.setItem(THEME_STORAGE_KEY, value); } catch {}
  };
  return { theme, changeTheme };
}
