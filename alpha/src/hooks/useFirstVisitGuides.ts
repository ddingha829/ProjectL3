'use client';
import { useCallback, useEffect, useState } from 'react';

export type GuideScreen = 'log' | 'archive' | 'calendar' | 'card' | 'studio' | 'settings';
export const GUIDE_STORAGE_KEY = 'l2_first_visit_guides_v1';
interface GuideState { eligible: boolean; seen: Partial<Record<GuideScreen, boolean>>; mode?:'intro'|'full' }

function readState(): GuideState {
  if (typeof window === 'undefined') return { eligible: false, seen: {} };
  try {
    const saved = localStorage.getItem(GUIDE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { eligible: parsed.eligible === true, seen: parsed.seen && typeof parsed.seen === 'object' ? parsed.seen : {}, mode:parsed.mode==='full'?'full':'intro' };
    }
    // Existing installations are not interrupted when this feature is released.
    return { eligible: !localStorage.getItem('l2_test_preferences_v2'), seen: {} };
  } catch { return { eligible: true, seen: {} }; }
}

/** Call before repositories write their initial cache on the first mount. */
export function useFirstVisitGuides() {
  const [state, setState] = useState<GuideState>(readState);
  useEffect(() => { try { localStorage.setItem(GUIDE_STORAGE_KEY, JSON.stringify(state)); } catch { /* Session-only guidance still works. */ } }, [state]);
  const dismiss = useCallback((screen: GuideScreen) => setState(previous => ({ ...previous, seen: { ...previous.seen, [screen]: true } })), []);
  const replay = useCallback(() => setState({ eligible: true, seen: {}, mode:'full' }), []);
  return { enabled: state.eligible, seen: state.seen, mode:state.mode||'intro', dismiss, replay };
}
