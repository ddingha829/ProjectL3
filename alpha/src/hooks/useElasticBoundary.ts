'use client';
import { useEffect, useRef } from 'react';
import { allowsMotion, MOTION_EVENT } from '@/lib/motion';

/** Stretch only at a vertical boundary, leaving horizontal row swipes intact. */
export function useElasticBoundary() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let start: { x: number; y: number; edgeY: number | null } | null = null;
    let offset = 0, suppressUntil = 0, spring: Animation | null = null;
    const reset = () => { spring?.cancel(); spring = null; offset = 0; element.style.transform = ''; element.style.willChange = ''; element.dataset.elastic = 'idle'; };
    const edge = (dy: number) => { const root = document.scrollingElement!; return dy > 0 && root.scrollTop <= 1 || dy < 0 && root.scrollTop >= root.scrollHeight - root.clientHeight - 2; };
    const stretch = (dy: number) => { spring?.cancel(); offset = Math.sign(dy) * 44 * (1 - Math.exp(-Math.abs(dy) / 145)); element.style.willChange = 'transform'; element.style.transform = `translate3d(0,${offset}px,0)`; element.dataset.elastic = 'dragging'; };
    const release = () => {
      start = null;
      if (!offset) return;
      suppressUntil = performance.now() + 300;
      const from = offset; offset = 0; element.style.transform = ''; element.dataset.elastic = 'spring';
      spring = element.animate([{ transform: `translateY(${from}px)` }, { transform: `translateY(${-from * .13}px)`, offset: .57 }, { transform: `translateY(${from * .035}px)`, offset: .8 }, { transform: 'translateY(0)' }], { duration: 540, easing: 'cubic-bezier(.2,.72,.25,1)' });
      spring.id = 'logbook-boundary-spring'; spring.onfinish = () => { element.style.willChange = ''; element.dataset.elastic = 'idle'; };
    };
    const begin = (x: number, y: number) => { if (!allowsMotion()) return; reset(); start = { x, y, edgeY: null }; };
    const move = (x: number, y: number, event: Event) => {
      if (!start || !allowsMotion()) return;
      const dx = x - start.x, dy = y - start.y;
      if (Math.abs(dx) > Math.abs(dy) || Math.abs(dy) < 8) return;
      if (start.edgeY === null && edge(dy)) start.edgeY = start.y;
      if (start.edgeY !== null) { if (event.cancelable) event.preventDefault(); stretch(y - start.edgeY); }
    };
    const pointerDown = (event: PointerEvent) => { if (event.pointerType === 'mouse' && event.button === 0) begin(event.clientX, event.clientY); };
    const pointerMove = (event: PointerEvent) => { if (event.pointerType === 'mouse') move(event.clientX, event.clientY, event); };
    const touchStart = (event: TouchEvent) => { if (event.touches.length === 1) begin(event.touches[0].clientX, event.touches[0].clientY); else start = null; };
    const touchMove = (event: TouchEvent) => { if (event.touches.length === 1) move(event.touches[0].clientX, event.touches[0].clientY, event); };
    const wheel = (event: WheelEvent) => { if (!allowsMotion() || !edge(-event.deltaY) || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return; if (event.cancelable) event.preventDefault(); stretch(-event.deltaY * .75); release(); };
    const click = (event: MouseEvent) => { if (performance.now() < suppressUntil) { event.preventDefault(); event.stopPropagation(); } };
    const motionChange = () => { if (!allowsMotion()) { start = null; reset(); } };
    element.addEventListener('pointerdown', pointerDown); window.addEventListener('pointermove', pointerMove); window.addEventListener('pointerup', release); window.addEventListener('pointercancel', release);
    element.addEventListener('touchstart', touchStart, { passive: true }); element.addEventListener('touchmove', touchMove, { passive: false }); element.addEventListener('touchend', release); element.addEventListener('touchcancel', release);
    element.addEventListener('wheel', wheel, { passive: false }); element.addEventListener('click', click, true); window.addEventListener(MOTION_EVENT, motionChange);
    return () => { reset(); element.removeEventListener('pointerdown', pointerDown); window.removeEventListener('pointermove', pointerMove); window.removeEventListener('pointerup', release); window.removeEventListener('pointercancel', release); element.removeEventListener('touchstart', touchStart); element.removeEventListener('touchmove', touchMove); element.removeEventListener('touchend', release); element.removeEventListener('touchcancel', release); element.removeEventListener('wheel', wheel); element.removeEventListener('click', click, true); window.removeEventListener(MOTION_EVENT, motionChange); };
  }, []);
  return ref;
}
