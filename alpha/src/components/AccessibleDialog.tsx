'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface AccessibleDialogProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  initialFocusId?: string;
}

/** A small modal primitive shared by the optional composer controls. */
export default function AccessibleDialog({
  open,
  title,
  description,
  onClose,
  children,
  initialFocusId,
}: AccessibleDialogProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open || !mounted) return;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const inertElements = Array.from(document.body.children)
      .filter((element): element is HTMLElement =>
        element instanceof HTMLElement && element !== overlayRef.current &&
        !['SCRIPT', 'STYLE', 'LINK'].includes(element.tagName)
      )
      .map((element) => ({ element, wasInert: element.inert }));
    inertElements.forEach(({ element }) => { element.inert = true; });

    const getFocusable = () => Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), a[href], input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
      ) || []
    ).filter((element) => element.getClientRects().length > 0);

    const frame = requestAnimationFrame(() => {
      const requested = initialFocusId ? document.getElementById(initialFocusId) : null;
      const target = requested && panelRef.current?.contains(requested)
        ? requested
        : getFocusable()[0] || panelRef.current;
      target?.focus({ preventScroll: true });
    });

    const onKeyDown = (event: KeyboardEvent) => {
      if (Array.from(document.querySelectorAll('[data-dialog-overlay]')).at(-1) !== overlayRef.current) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = getFocusable();
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        panelRef.current?.focus();
      } else if (event.shiftKey && (document.activeElement === first || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !panelRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      inertElements.forEach(({ element, wasInert }) => { element.inert = wasInert; });
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open, mounted, initialFocusId]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      ref={overlayRef}
      data-dialog-overlay="true"
      className="quick-dialog-backdrop fixed inset-0 z-[100] flex items-end justify-center bg-black/65 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      onClick={(event) => { if (event.target === event.currentTarget) onClose(); }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className="quick-dialog-panel max-h-[88dvh] w-full max-w-xl overflow-x-hidden overflow-y-auto overscroll-contain rounded-[28px] border border-[var(--line)] bg-[var(--surface)] p-5 shadow-2xl outline-none sm:p-7"
      >
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h2 id={titleId} className="text-xl font-bold tracking-tight">{title}</h2>
            {description && <p id={descriptionId} className="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{description}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="추가 정보 닫기" className="quick-control flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--line)] text-xl">×</button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
