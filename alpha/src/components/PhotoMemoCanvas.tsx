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
const photoMemoMinimum = () => Math.max(200, Math.min(300, window.innerHeight * .3));

function sizeToContent(textarea: HTMLTextAreaElement, minimum: number) {
  // Measure intrinsic content without retaining a previous viewport's flex height.
  const previousFlex = textarea.style.flex;
  textarea.style.flex = 'none';
  textarea.style.height = '0px';
  textarea.style.height = `${Math.max(minimum, textarea.scrollHeight)}px`;
  textarea.style.flex = previousFlex;
}

/** The same textarea moves from the photograph to its normal place below it. */
export default function PhotoMemoCanvas({ id, body, img, cropX, cropY, cropOpen, disabled = false, onBody, onRemovePhoto, onToggleCrop }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previousImage = useRef(img);

  useLayoutEffect(() => {
    const photo = photoRef.current;
    const inserting = Boolean(img) && !previousImage.current;
    const replacing = Boolean(img) && Boolean(previousImage.current) && img !== previousImage.current;
    previousImage.current = img;
    if (!photo || !allowsMotion() || !inserting && !replacing) return;
    const height = photo.getBoundingClientRect().height;
    const animation = photo.animate(inserting ? [{ height: '0px', opacity: 0 }, { height: `${height}px`, opacity: 1 }] : [{ opacity: .35 }, { opacity: 1 }], { duration: inserting ? 720 : 320, easing: 'cubic-bezier(.16,1,.3,1)' });
    animation.id = 'photo-insert';
    const imageAnimation = photo.querySelector('img')?.animate([{ transform: 'translateY(14px)', opacity: .45 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 720, easing: 'cubic-bezier(.16,1,.3,1)' });
    const stop = () => { if (!allowsMotion()) { animation.cancel(); imageAnimation?.cancel(); } };
    window.addEventListener(MOTION_EVENT, stop);
    return () => { window.removeEventListener(MOTION_EVENT, stop); animation.cancel(); imageAnimation?.cancel(); };
  }, [img]);

  useLayoutEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    sizeToContent(textarea, img ? photoMemoMinimum() : 76);
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
      sizeToContent(textarea, rootRef.current?.dataset.hasPhoto === 'true' ? photoMemoMinimum() : 76);
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

  useLayoutEffect(() => {
    const root = rootRef.current;
    const photo = photoRef.current;
    if (!root || !photo) return;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
    const scroller = root.closest<HTMLElement>('.quick-dialog-panel');
    const scrollTarget = scroller || window;
    const scrollPosition = () => scroller ? scroller.scrollTop : window.scrollY;
    const origin = scrollPosition();
    let frame = 0;
    let scrolledToBottom = false;
    const checkBottom = (pos: number) => scroller
      ? pos > 0 && scroller.clientHeight + Math.ceil(pos) >= scroller.scrollHeight - 4
      : pos > 0 && window.innerHeight + Math.ceil(pos) >= document.documentElement.scrollHeight - 4;
    const update = () => {
      frame = 0;
      const pos = scrollPosition();
      if (pos <= origin + 1) scrolledToBottom = false;
      else if (checkBottom(pos)) scrolledToBottom = true;
      const offset = img && allowsMotion() ? photo.getBoundingClientRect().height * 0.62 : 0;
      const progress = !offset || scrolledToBottom ? 1 : Math.max(0, Math.min(1, (pos - origin) / offset));
      root.style.setProperty('--memo-shift', `${(-offset * (1 - progress)).toFixed(2)}px`);
      root.style.setProperty('--memo-background', `${80 + progress * 20}%`);
      root.dataset.memoDock = progress >= 0.999 ? 'settled' : progress <= 0.001 ? 'floating' : 'settling';
      root.dataset.memoProgress = progress.toFixed(3);
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    const onScroll = () => {
      const pos = scrollPosition();
      scrolledToBottom = checkBottom(pos);
      schedule();
    };
    update();
    scrollTarget.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', schedule);
    reducedMotion.addEventListener('change', schedule);
    window.addEventListener(MOTION_EVENT, schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(photo);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      scrollTarget.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', schedule);
      reducedMotion.removeEventListener('change', schedule);
      window.removeEventListener(MOTION_EVENT, schedule);
      observer.disconnect();
    };
  }, [img]);

  return (
    <div ref={rootRef} className={`photo-memo ${img ? 'has-photo' : ''}`} data-has-photo={Boolean(img)} data-memo-dock="settled" data-memo-progress="1">
      <div ref={photoRef} className="photo-memo-image" hidden={!img}>
        {img && <img src={img} alt="첨부한 기록 사진" style={{ objectPosition: `${cropX}% ${cropY}%` }} />}
        <div className="photo-memo-tools">
          <button type="button" className="quick-control" disabled={disabled} onClick={onToggleCrop} aria-expanded={cropOpen} aria-label="사진 위치 조정"><Crop size={17} aria-hidden="true" /></button>
          <button type="button" className="quick-control" disabled={disabled} onClick={onRemovePhoto} aria-label="사진 제거"><X size={18} aria-hidden="true" /></button>
        </div>
      </div>
      <div className="photo-memo-panel">
        <label htmlFor={id} className="sr-only">기억하고 싶은 순간</label>
        <textarea ref={textareaRef} id={id} name="body" value={body} disabled={disabled} onChange={(event) => onBody(event.target.value)} placeholder={PROMPT} rows={2} maxLength={5000} className="quick-memory" />
        {!body && <span className="memo-prompt" aria-hidden="true">{Array.from(PROMPT).map((character, index) => <span key={index} style={{ '--wave-index': index } as CSSProperties}>{character === ' ' ? '\u00a0' : character}</span>)}</span>}
      </div>
    </div>
  );
}
