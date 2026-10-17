'use client';

import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { Crop, X } from 'lucide-react';
import { allowsMotion, MOTION_EVENT } from '@/lib/motion';

interface Props {
  id: string;
  body: string;
  img: string;
  cropX: number;
  cropY: number;
  cropOpen: boolean;
  disabled?: boolean;
  onBody: (value: string) => void;
  onRemovePhoto: () => void;
  onToggleCrop: () => void;
}

const PROMPT = '무슨 일상을 로그할까요?';
const photoMemoMinimum = () => 136;

function sizeToContent(textarea: HTMLTextAreaElement, minimum: number) {
  // Measure intrinsic content without retaining a previous viewport's flex height.
  const previousFlex = textarea.style.flex;
  textarea.style.flex = 'none';
  textarea.style.height = '0px';
  textarea.style.height = `${Math.max(minimum, textarea.scrollHeight)}px`;
  textarea.style.flex = previousFlex;
}

/** Inline photo preview above the body memo panel, with smooth slide-down & scroll when a photo is attached. */
export default function PhotoMemoCanvas({ id, body, img, cropX, cropY, cropOpen, disabled = false, onBody, onRemovePhoto, onToggleCrop }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousImage = useRef(img);

  useLayoutEffect(() => {
    const photo = photoRef.current;
    const panel = panelRef.current;
    const textarea = textareaRef.current;
    const inserting = Boolean(img) && !previousImage.current;
    const replacing = Boolean(img) && Boolean(previousImage.current) && img !== previousImage.current;
    previousImage.current = img;
    if (!photo || (!inserting && !replacing)) return;

    let scrollTimer: ReturnType<typeof setTimeout> | null = null;
    if (inserting) {
      scrollTimer = setTimeout(() => {
        textarea?.focus({ preventScroll: true });
        panel?.scrollIntoView({ behavior: allowsMotion() ? 'smooth' : 'instant', block: 'center' });
      }, 120);
    }

    if (!allowsMotion()) {
      return () => {
        if (scrollTimer) clearTimeout(scrollTimer);
      };
    }

    const height = photo.getBoundingClientRect().height;
    const animation = photo.animate(
      inserting ? [{ height: '0px', opacity: 0 }, { height: `${height}px`, opacity: 1 }] : [{ opacity: 0.35 }, { opacity: 1 }],
      { duration: inserting ? 520 : 280, easing: 'cubic-bezier(.16,1,.3,1)' }
    );
    animation.id = 'photo-insert';
    const imageAnimation = photo.querySelector('img')?.animate(
      [{ transform: 'scale(1.03)', opacity: 0.45 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' }
    );
    const panelAnimation = inserting
      ? panel?.animate(
          [{ transform: 'translateY(-14px)', opacity: 0.4 }, { transform: 'translateY(0)', opacity: 1 }],
          { duration: 520, easing: 'cubic-bezier(.16,1,.3,1)' }
        )
      : undefined;

    const stop = () => {
      if (!allowsMotion()) {
        animation.cancel();
        imageAnimation?.cancel();
        panelAnimation?.cancel();
      }
    };
    window.addEventListener(MOTION_EVENT, stop);
    return () => {
      if (scrollTimer) clearTimeout(scrollTimer);
      window.removeEventListener(MOTION_EVENT, stop);
      animation.cancel();
      imageAnimation?.cancel();
      panelAnimation?.cancel();
    };
  }, [img]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    sizeToContent(textarea, img ? photoMemoMinimum() : 96);
  }, [body, img]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    let disposed = false;
    let previousWidth = -1;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const measure = () => {
      if (disposed || !context) return;
      const style = getComputedStyle(textarea);
      const available = textarea.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 6;
      if (available <= 0) return;
      context.font = '900 32px "Pretendard Variable", "Inter", sans-serif';
      const widthAt32 = context.measureText(PROMPT).width - (Array.from(PROMPT).length - 1) * 32 * 0.045;
      const size = Math.min(48, available * 32 / widthAt32);
      textarea.style.setProperty('--memo-prompt-size', `${size.toFixed(2)}px`);
      rootRef.current?.style.setProperty('--memo-prompt-size', `${size.toFixed(2)}px`);
      sizeToContent(textarea, rootRef.current?.dataset.hasPhoto === 'true' ? photoMemoMinimum() : 96);
    };
    const observer = new ResizeObserver(() => {
      if (Math.abs(textarea.clientWidth - previousWidth) < 1) return;
      previousWidth = textarea.clientWidth;
      measure();
    });
    observer.observe(textarea);
    measure();
    void document.fonts.ready.then(measure);
    window.addEventListener('resize', measure);
    return () => { disposed = true; observer.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  return (
    <div ref={rootRef} className={`photo-memo ${img ? 'has-photo' : ''}`} data-has-photo={Boolean(img)}>
      <div ref={photoRef} className="photo-memo-image" hidden={!img}>
        {img && <img src={img} alt="첨부한 기록 사진" style={{ objectPosition: `${cropX}% ${cropY}%` }} />}
        <div className="photo-memo-tools">
          <button type="button" className="quick-control" disabled={disabled} onClick={onToggleCrop} aria-expanded={cropOpen} aria-label="사진 위치 조정"><Crop size={17} aria-hidden="true" /></button>
          <button type="button" className="quick-control" disabled={disabled} onClick={onRemovePhoto} aria-label="사진 제거"><X size={18} aria-hidden="true" /></button>
        </div>
      </div>
      <div ref={panelRef} className="photo-memo-panel">
        <label htmlFor={id} className="sr-only">기억하고 싶은 순간</label>
        <textarea ref={textareaRef} id={id} name="body" value={body} disabled={disabled} onChange={(event) => onBody(event.target.value)} placeholder={PROMPT} rows={3} maxLength={5000} className="quick-memory" />
        {!body && <span className="memo-prompt" aria-hidden="true">{Array.from(PROMPT).map((character, index) => <span key={index} style={{ '--wave-index': index } as CSSProperties}>{character === ' ' ? '\u00a0' : character}</span>)}</span>}
      </div>
    </div>
  );
}
