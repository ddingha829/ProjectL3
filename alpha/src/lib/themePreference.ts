export type ThemePreference = 'auto' | 'light' | 'dark';
export const THEME_STORAGE_KEY = 'l2_unified_ui_theme';

export function normalizeThemePreference(value: string | null): ThemePreference {
  if (value === 'paper' || value === 'light') return 'light';
  return value === 'dark' ? 'dark' : 'auto';
}

export function applyTheme(preference: ThemePreference, systemDark: boolean) {
  const light = preference === 'light' || preference === 'auto' && !systemDark;
  const root = document.documentElement;
  root.classList.toggle('light', light);
  root.dataset.theme = preference;
  root.style.colorScheme = light ? 'light' : 'dark';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', light ? '#FFFFFF' : '#08080A');
}

// Run before hydration/CSS paint. Preserve the legacy paper/dark choices.
export const THEME_BOOTSTRAP_SCRIPT = `(()=>{let value;try{value=localStorage.getItem('${THEME_STORAGE_KEY}')}catch{}const theme=value==='paper'||value==='light'?'light':value==='dark'?'dark':'auto';const light=theme==='light'||theme==='auto'&&!matchMedia('(prefers-color-scheme: dark)').matches;const root=document.documentElement;root.classList.toggle('light',light);root.dataset.theme=theme;root.style.colorScheme=light?'light':'dark';})()`;
