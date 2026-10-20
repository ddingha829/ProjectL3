'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import type { CardLayoutType } from '@/types/l2';
import { getCardDimensions, type CardRatio } from '@/lib/cardLayouts';
import styles from './CardStage.module.css';

interface CardFrameProps {
  ratio: CardRatio;
  layout: CardLayoutType;
  captureRef?: RefObject<HTMLDivElement | null>;
  style: CSSProperties;
  children: ReactNode;
}

/** The preview scales a canonical canvas; its CSS layout never follows viewport breakpoints. */
export default function CardFrame({ ratio, layout, captureRef, style, children }: CardFrameProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [availableWidth, setAvailableWidth] = useState(420);
  const { width, height } = getCardDimensions(ratio);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    const measure = () => setAvailableWidth(Math.min(width, viewport.clientWidth || viewport.getBoundingClientRect().width));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    return () => observer.disconnect();
  }, [width]);
  const scale = availableWidth / width;

  return (
    <div ref={viewportRef} data-card-preview="true" className={styles.viewport} style={{ aspectRatio: `${width} / ${height}` }}>
      <div className={styles.previewPlane} style={{ width, height, transform: `scale(${scale})` }}>
        {/* Physical preview only: these solid edge layers are siblings of the export node. */}
        {[1, 2, 3, 4, 5, 6].map(layer => <span key={layer} aria-hidden="true" data-card-edge="true" data-card-layout={layout} className={styles.depthSlice} style={{ ...style, '--depth-layer': layer } as CSSProperties} />)}
        <div
          ref={captureRef}
          className={styles.frame}
          data-card-capture="true"
          data-card-width={width}
          data-card-height={height}
          data-card-ratio={ratio}
          data-card-layout={layout}
          style={{ ...style, width, height }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
