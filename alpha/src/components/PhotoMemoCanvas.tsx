'use client';

import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { Crop, X } from 'lucide-react';
import PhotoViewport from './PhotoViewport';
import type {PhotoCrop,PhotoFit} from '@/lib/photoCrop';
import { allowsMotion, MOTION_EVENT } from '@/lib/motion';

interface Props {
  id: string;
  body: string;
  img: string;
  cropX: number;
  cropY: number;
  cropZoom?: number;
  photoFit?:PhotoFit;
  defaultFit?:PhotoFit;
  onCrop:(crop:PhotoCrop)=>void;
  cropOpen: boolean;
  disabled?: boolean;
  onBody: (value: string) => void;
  onRemovePhoto: () => void;
  onToggleCrop: () => void;
}

const PROMPT = '무슨 일상을 로그할까요?';
const photoMemoMinimum = () => 112;

function sizeToContent(textarea: HTMLTextAreaElement, minimum: number) {
  const isKeyboardOpen = typeof document !== 'undefined' && document.documentElement.dataset.keyboard === 'open';
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;
  const previousFlex = textarea.style.flex;
  textarea.style.flex = 'none';
  textarea.style.height = '0px';
  const effectiveMin = isKeyboardOpen && isMobile ? 68 : minimum;
  const desired = Math.max(effectiveMin, textarea.scrollHeight);
  if (isKeyboardOpen && isMobile) {
    const panelHeight = textarea.parentElement?.clientHeight || 0;
    const maxAllowed = panelHeight > 64 ? panelHeight - 4 : 150;
    const clamped = Math.min(desired, maxAllowed);
    textarea.style.height = `${clamped}px`;
    textarea.style.overflowY = desired > maxAllowed ? 'auto' : 'hidden';
  } else {
    textarea.style.height = `${desired}px`;
    textarea.style.overflowY = 'hidden';
  }
  textarea.style.flex = previousFlex;
}

/** Inline photo preview above the body memo panel, with smooth slide-down & scroll when a photo is attached. */
export default function PhotoMemoCanvas({ id, body, img, cropX, cropY, cropZoom, photoFit, defaultFit, onCrop, cropOpen, disabled = false, onBody, onRemovePhoto, onToggleCrop }: Props) {
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
      { duration: inserting ? 420 : 260, easing: 'cubic-bezier(.16,1,.3,1)' }
    );
    animation.id = 'photo-insert';
    const imageAnimation = photo.querySelector('img')?.animate(
      [{ transform: 'scale(1.03)', opacity: 0.45 }, { transform: 'scale(1)', opacity: 1 }],
      { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' }
    );
    const panelAnimation = inserting
      ? panel?.animate(
          [{ transform: 'translateY(-10px)', opacity: 0.45 }, { transform: 'translateY(0)', opacity: 1 }],
          { duration: 420, easing: 'cubic-bezier(.16,1,.3,1)' }
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
    sizeToContent(textarea, img ? photoMemoMinimum() : 88);
  }, [body, img]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    const panel = panelRef.current;
    if (!textarea) return;
    let disposed = false;
    let previousWidth = -1;
    let previousPanelHeight = -1;
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const measure = () => {
      if (disposed || !context) return;
      const style = getComputedStyle(textarea);
      const available = textarea.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 6;
      if (available <= 0) return;
      const family=getComputedStyle(rootRef.current||textarea).getPropertyValue('--font-sans').trim()||style.fontFamily;
      context.font = `900 32px ${family}`;
      const widthAt32 = context.measureText(PROMPT).width - (Array.from(PROMPT).length - 1) * 32 * 0.045;
      const size = Math.min(44, available * 32 / widthAt32);
      textarea.style.setProperty('--memo-prompt-size', `${size.toFixed(2)}px`);
      rootRef.current?.style.setProperty('--memo-prompt-size', `${size.toFixed(2)}px`);
      sizeToContent(textarea, rootRef.current?.dataset.hasPhoto === 'true' ? photoMemoMinimum() : 88);
    };
    const observer = new ResizeObserver(() => {
      const panelH = panel?.clientHeight || 0;
      if (Math.abs(textarea.clientWidth - previousWidth) < 1 && Math.abs(panelH - previousPanelHeight) < 2) return;
      previousWidth = textarea.clientWidth;
      previousPanelHeight = panelH;
      measure();
    });
    observer.observe(textarea);
    if (panel) observer.observe(panel);
    measure();
    void document.fonts.ready.then(measure);
    const fontObserver=new MutationObserver(measure);
    fontObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-font']});
    document.fonts.addEventListener('loadingdone',measure);
    window.addEventListener('resize', measure);
    window.visualViewport?.addEventListener('resize', measure);
    return () => {
      disposed = true;
      observer.disconnect();
      fontObserver.disconnect();
      document.fonts.removeEventListener('loadingdone',measure);
      window.removeEventListener('resize', measure);
      window.visualViewport?.removeEventListener('resize', measure);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={`photo-memo ${img ? 'has-photo' : ''}`}
      data-has-photo={Boolean(img)}
      onClick={(event) => {
        if (disabled) return;
        const target = event.target as HTMLElement;
        if (target.closest('button, input, a, [data-crop-interactive]')) return;
        if (target !== textareaRef.current) {
          textareaRef.current?.focus({ preventScroll: true });
        }
      }}
    >
      <PhotoViewport viewportRef={photoRef} className="photo-memo-image" hidden={!img} src={img} alt="첨부한 기록 사진" crop={{cropX,cropY,cropZoom,photoFit}} defaultFit={defaultFit} editing={cropOpen} disabled={disabled} onChange={onCrop}>
        <div className="photo-memo-tools">
          <button type="button" className="quick-control" disabled={disabled} onClick={onToggleCrop} aria-expanded={cropOpen} aria-label="사진 위치 조정"><Crop size={17} aria-hidden="true" /></button>
          <button type="button" className="quick-control" disabled={disabled} onClick={onRemovePhoto} aria-label="사진 제거"><X size={18} aria-hidden="true" /></button>
        </div>
      </PhotoViewport>
      <div ref={panelRef} className="photo-memo-panel">
        <label htmlFor={id} className="sr-only">기억하고 싶은 순간</label>
        <textarea ref={textareaRef} id={id} name="body" value={body} disabled={disabled} onChange={(event) => onBody(event.target.value)} placeholder={PROMPT} rows={3} maxLength={5000} className="quick-memory" />
        {!body && <span className="memo-prompt" aria-hidden="true">{Array.from(PROMPT).map((character, index) => <span key={index} style={{ '--wave-index': index } as CSSProperties}>{character === ' ' ? '\u00a0' : character}</span>)}</span>}
      </div>
    </div>
  );
}
