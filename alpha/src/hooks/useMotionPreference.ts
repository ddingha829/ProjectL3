'use client';
import { useEffect, useState } from 'react';
import { MOTION_EVENT, type MotionPreference } from '@/lib/motion';

export function useMotionPreference() {
  // This preview is explicitly for evaluating motion, including on new browsers.
  const [motion, setMotion] = useState<MotionPreference>('on');
  useEffect(() => {
    let preference: MotionPreference = 'on';
    try { const stored = localStorage.getItem('l2_test_motion'); if (stored === 'auto' || stored === 'on' || stored === 'off') preference = stored; } catch {}
    setMotion(preference);
    document.documentElement.dataset.motion = preference;
    window.dispatchEvent(new Event(MOTION_EVENT));
  }, []);
  const changeMotion = (value: MotionPreference) => {
    setMotion(value);
    document.documentElement.dataset.motion = value;
    window.dispatchEvent(new Event(MOTION_EVENT));
    try { localStorage.setItem('l2_test_motion', value); } catch {}
  };
  return { motion, changeMotion };
}
