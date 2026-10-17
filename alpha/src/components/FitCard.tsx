'use client';

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import type { PresetSlot } from '@/types/l2';
import { getCardDimensions } from '@/lib/cardLayouts';
import { allowsMotion } from '@/lib/motion';
import './FitCard.css';

export default function FitCard({ ratio, children, animationKey, transition = 'simple', direction = 1 }: { ratio: PresetSlot['ratio']; children: ReactNode; animationKey?: string; transition?: 'simple' | 'slide'; direction?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(180);
  const previous = useRef({ key: animationKey, children, width });
  const [outgoing, setOutgoing] = useState<{ children: ReactNode; width: number; key: string } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useLayoutEffect(() => {
    const before = previous.current;
    if (before.key !== animationKey && transition === 'slide' && allowsMotion()) {
      if (timer.current) clearTimeout(timer.current);
      setOutgoing({ children: before.children, width: before.width, key: String(before.key) });
      timer.current = setTimeout(() => setOutgoing(null), 500);
    }
    previous.current = { key: animationKey, children, width };
  }, [animationKey, children, width, transition]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useLayoutEffect(() => {
    const node = ref.current;
    if (!node) return;
    const measure = () => {
      const dimensions = getCardDimensions(ratio);
      setWidth(Math.max(40, Math.min(420, node.clientWidth, node.clientHeight * dimensions.width / dimensions.height)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [ratio]);
  return <div ref={ref} className={`fit-card ${transition === 'slide' ? 'fit-card-slide' : ''}`} style={{ '--card-direction': direction < 0 ? 1 : -1 } as CSSProperties}>
    <div key={animationKey} className="fit-card-artwork" style={{ width }}>{children}</div>
    {outgoing && <div key={`out-${outgoing.key}`} className="fit-card-outgoing" aria-hidden="true" inert><div style={{ width: outgoing.width }}>{outgoing.children}</div></div>}
  </div>;
}
