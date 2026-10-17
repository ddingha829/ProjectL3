/**
 * Web Haptics Utility for PWA
 * Invokes native physical vibration motors on Android devices,
 * with graceful safe fallback on iOS Safari and desktop.
 */

function canVibrate(): boolean {
  try {
    if (typeof window !== 'undefined' && (localStorage.getItem('l2_test_haptics') === 'off' || window.matchMedia('(prefers-reduced-motion: reduce)').matches)) return false;
  } catch { return false; }
  return (
    typeof window !== 'undefined' &&
    typeof navigator !== 'undefined' &&
    'vibrate' in navigator &&
    typeof navigator.vibrate === 'function'
  );
}

export const haptic = {
  /** Subtle 12ms tick for dials, score drag gauge, and crop panning */
  tick() {
    if (canVibrate()) {
      try {
        navigator.vibrate(12);
      } catch {
        // Safe ignore
      }
    }
  },

  /** Crisp 18ms snap for preset slot switching, tabs, and element toggles */
  snap() {
    if (canVibrate()) {
      try {
        navigator.vibrate(18);
      } catch {
        // Safe ignore
      }
    }
  },

  /** Tactile double-pulse [15, 50, 22] when a card or log is saved successfully */
  success() {
    if (canVibrate()) {
      try {
        navigator.vibrate([15, 50, 22]);
      } catch {
        // Safe ignore
      }
    }
  },

  /** Alert pattern [25, 40, 25] for deletion, warnings, or quota notices */
  warning() {
    if (canVibrate()) {
      try {
        navigator.vibrate([25, 40, 25]);
      } catch {
        // Safe ignore
      }
    }
  },
};
