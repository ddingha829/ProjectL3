'use client';

import React, { useRef, useState } from 'react';
import { ArchiveItem, PresetSlot, SkinTheme } from '@/types/l2';

interface CardStageProps {
  item: ArchiveItem;
  slot: PresetSlot;
  skin: SkinTheme;
  authorName: string;
  selectedItems: ArchiveItem[];
  curationTitle: string;
  cardCaptureRef?: React.RefObject<HTMLDivElement | null>;
  onUpdateCrop?: (cropX: number, cropY: number) => void;
}

export default function CardStage({
  item,
  slot,
  skin,
  authorName,
  selectedItems,
  curationTitle,
  cardCaptureRef,
  onUpdateCrop,
}: CardStageProps) {
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    initialCropX: number;
    initialCropY: number;
  }>({
    active: false,
    startX: 0,
    startY: 0,
    initialCropX: item.cropX ?? 50,
    initialCropY: item.cropY ?? 50,
  });

  const [isDragging, setIsDragging] = useState(false);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!onUpdateCrop) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      initialCropX: item.cropX ?? 50,
      initialCropY: item.cropY ?? 50,
    };
    setIsDragging(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStateRef.current.active || !onUpdateCrop) return;
    const dx = e.clientX - dragStateRef.current.startX;
    const dy = e.clientY - dragStateRef.current.startY;
    const nextX = Math.max(
      0,
      Math.min(100, Math.round(dragStateRef.current.initialCropX - dx * 0.22))
    );
    const nextY = Math.max(
      0,
      Math.min(100, Math.round(dragStateRef.current.initialCropY - dy * 0.22))
    );
    onUpdateCrop(nextX, nextY);
  };

  const handlePointerUp = () => {
    dragStateRef.current.active = false;
    setIsDragging(false);
  };

  const objectPos = `${item.cropX ?? 50}% ${item.cropY ?? 50}%`;
  const showScore = slot.showScore !== false;
  const showProsCons = slot.showProsCons !== false;
  const showLocation = slot.showLocation !== false;
  const showSignature = slot.showSignature !== false;
  const showGrain = slot.showGrain !== false;
  const displayAuthor = authorName || item.author || '여수피카츄';

  // 04: LIST (Multi-item Curation Card — no 3:4 text at top, no bottom API labels)
  if (slot.layout === 'curation') {
    const listItems = selectedItems.length > 0 ? selectedItems : [item];
    return (
      <div
        ref={cardCaptureRef}
        style={{
          background: skin.bg,
          color: skin.text,
          borderColor: skin.border,
        }}
        className="w-full max-w-[420px] rounded-[24px] relative overflow-hidden shadow-2xl border flex flex-col justify-between transition-all duration-300"
      >
        {showGrain && (
          <div className="absolute inset-0 pointer-events-none z-20 texture-grain mix-blend-overlay" />
        )}
        <div
          style={{
            background: skin.headerBg || skin.accent,
            color: skin.headerText || '#FFFFFF',
          }}
          className="px-6 py-4 flex items-center justify-between"
        >
          <span className="display-type text-2xl tracking-tighter">L2.</span>
          <span className="mono-num text-xs font-black tracking-widest uppercase">
            CURATED LIST
          </span>
        </div>

        <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
          <div className="space-y-4">
            <div
              style={{ borderColor: skin.border }}
              className="border-b pb-3.5"
            >
              <div
                style={{ color: skin.accent }}
                className="mono-num text-[11px] font-black tracking-widest uppercase"
              >
                SELECTED BY {displayAuthor}
              </div>
              <h3 className="kor-heavy text-3xl sm:text-4xl mt-1 leading-tight">
                {curationTitle || 'TOP PICKS.'}
              </h3>
            </div>

            <div className="space-y-3">
              {listItems.slice(0, 4).map((entry, idx) => (
                <div
                  key={entry.id}
                  style={{
                    background: skin.chipBg,
                    borderColor: skin.border,
                  }}
                  className="flex items-stretch gap-3.5 p-3 rounded-2xl border"
                >
                  <img
                    src={entry.img}
                    alt={entry.title}
                    className="w-18 h-18 rounded-xl object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="kor-heavy text-lg truncate">
                        0{idx + 1} {entry.title}
                      </span>
                      {showScore && (
                        <span
                          style={{ color: skin.accent }}
                          className="display-type text-2xl shrink-0"
                        >
                          {entry.score}
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-semibold line-clamp-2 leading-snug opacity-90">
                      “{entry.quote}”
                    </p>
                    {showLocation && entry.addressShort && (
                      <span className="text-[11px] font-bold opacity-60 truncate">
                        {entry.addressShort}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {showSignature && (
            <div
              style={{
                borderColor: skin.border,
                color: skin.sub,
                marginTop: 'auto',
              }}
              className="pt-3 border-t flex items-center justify-end text-xs font-bold"
            >
              <span>— {displayAuthor}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 02: INSTA (1:1 Full-Bleed Cover Poster)
  if (slot.layout === 'cover') {
    const heightClass =
      slot.ratio === '9:16'
        ? 'h-[520px]'
        : slot.ratio === '1:1'
        ? 'h-[420px]'
        : 'h-[470px]';

    return (
      <div
        ref={cardCaptureRef}
        style={{ borderColor: skin.border }}
        className={`w-full max-w-[420px] ${heightClass} rounded-[24px] relative overflow-hidden shadow-2xl border flex flex-col justify-between text-white transition-all duration-300`}
      >
        {showGrain && (
          <div className="absolute inset-0 pointer-events-none z-20 texture-grain mix-blend-overlay" />
        )}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          title="드래그하여 사진 위치 조정"
          className={`absolute inset-0 select-none ${
            isDragging ? 'cursor-grabbing' : 'cursor-grab'
          }`}
        >
          <img
            src={item.img}
            alt={item.title}
            draggable={false}
            style={{ objectPosition: objectPos }}
            className="w-full h-full object-cover pointer-events-none"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/30 pointer-events-none" />
        </div>

        <div className="relative z-10 p-6 flex items-start justify-between pointer-events-none">
          <div>
            <div className="display-type text-3xl tracking-tighter">
              L2<span style={{ color: '#FF3B00' }}>.</span>
            </div>
            <div className="mono-num text-[11px] font-black tracking-widest uppercase opacity-80 mt-1">
              {item.sub || `${item.cat} · ${item.loc}`}
            </div>
          </div>
          {showScore && (
            <div
              style={{ background: skin.accent }}
              className="px-4 py-2 rounded-2xl display-type text-3xl text-white shadow-lg"
            >
              {item.score}
            </div>
          )}
        </div>

        <div
          style={{ marginTop: 'auto' }}
          className="relative z-10 p-6 space-y-3.5 pointer-events-none"
        >
          <div>
            <h3 className="kor-heavy text-4xl sm:text-5xl leading-none tracking-tight">
              {item.title}
            </h3>
            {showLocation && (
              <p className="text-xs font-bold tracking-wide uppercase opacity-75 mt-2">
                {item.fullAddress || item.addressShort}
              </p>
            )}
          </div>
          <p className="font-semibold text-base sm:text-lg leading-snug border-l-4 border-[#FF3B00] pl-3.5 text-white/95 line-clamp-3">
            “{item.quote}”
          </p>
          {showSignature && (
            <div className="pt-2.5 border-t border-white/20 flex items-center justify-end text-xs font-bold text-white/75">
              <span>
                — {displayAuthor} ({item.date})
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 03: TICKET (9:16 Perforated Ticket)
  if (slot.layout === 'ticket') {
    return (
      <div
        ref={cardCaptureRef}
        style={{
          background: skin.bg,
          color: skin.text,
          borderColor: skin.border,
        }}
        className="w-full max-w-[400px] rounded-[24px] overflow-hidden shadow-2xl border relative flex flex-col justify-between transition-all duration-300"
      >
        {showGrain && (
          <div className="absolute inset-0 pointer-events-none z-20 texture-grain mix-blend-overlay" />
        )}
        <div className="ticket-notch-l" />
        <div className="ticket-notch-r" />

        <div>
          <div
            style={{ borderColor: skin.border }}
            className="p-6 pb-4 flex items-center justify-between border-b"
          >
            <span className="display-type text-3xl">L2 / {item.num}</span>
            <span
              style={{ color: skin.sub }}
              className="mono-num text-xs font-black tracking-widest uppercase"
            >
              {item.sub || `${item.cat} · ${item.loc}`}
            </span>
          </div>

          <div className="px-6 pt-5">
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              title="드래그하여 사진 위치 조정"
              className={`w-full h-56 rounded-2xl overflow-hidden select-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              <img
                src={item.img}
                alt={item.title}
                draggable={false}
                style={{ objectPosition: objectPos }}
                className="w-full h-full object-cover pointer-events-none"
              />
            </div>
          </div>

          <div className="p-6 space-y-4">
            <div
              style={{ borderColor: skin.border }}
              className="flex items-end justify-between border-b border-dashed pb-4 gap-3"
            >
              <div>
                <h3 className="kor-heavy text-3xl sm:text-4xl">{item.title}</h3>
                {showLocation && (
                  <p
                    style={{ color: skin.sub }}
                    className="text-xs font-bold mt-1"
                  >
                    {item.fullAddress || item.addressShort}
                  </p>
                )}
              </div>
              {showScore && (
                <div
                  style={{ color: skin.accent }}
                  className="display-type text-5xl shrink-0"
                >
                  {item.score}
                </div>
              )}
            </div>

            <p className="font-bold text-base sm:text-lg leading-snug">
              “{item.quote}”
            </p>

            {showProsCons && (
              <div
                style={{ color: skin.sub }}
                className="text-xs font-bold space-y-1 pt-1"
              >
                <div>
                  <strong style={{ color: skin.text }}>GOOD —</strong>{' '}
                  {item.good}
                </div>
                {item.bad && (
                  <div>
                    <strong style={{ color: skin.text }}>BAD —</strong>{' '}
                    {item.bad}
                  </div>
                )}
                <div>
                  <strong style={{ color: skin.text }}>NOTE —</strong>{' '}
                  {item.note}
                </div>
              </div>
            )}
          </div>
        </div>

        {showSignature && (
          <div
            style={{
              borderColor: skin.border,
              color: skin.sub,
              marginTop: 'auto',
            }}
            className="px-6 pb-5 pt-3 border-t flex items-center justify-end text-xs font-bold"
          >
            <span>
              — {displayAuthor} ({item.date})
            </span>
          </div>
        )}
      </div>
    );
  }

  // 01: KAKAO (Default Editorial Spec Card — no 3:4 at top, no bottom API labels)
  const photoHeight =
    slot.ratio === '1:1' ? 'h-56' : slot.ratio === '9:16' ? 'h-72' : 'h-64';

  return (
    <div
      ref={cardCaptureRef}
      style={{
        background: skin.bg,
        color: skin.text,
        borderColor: skin.border,
      }}
      className="w-full max-w-[420px] rounded-[24px] relative overflow-hidden shadow-2xl border flex flex-col justify-between transition-all duration-300"
    >
      {showGrain && (
        <div className="absolute inset-0 pointer-events-none z-20 texture-grain mix-blend-overlay" />
      )}
      <div
        style={{
          background: skin.headerBg || skin.accent,
          color: skin.headerText || '#FFFFFF',
        }}
        className="px-6 py-3.5 flex items-center justify-between"
      >
        <span className="display-type text-2xl tracking-tighter">L2.</span>
        <span className="mono-num text-xs font-black tracking-widest uppercase">
          {item.sub || `${item.cat} · ${item.loc}`}
        </span>
      </div>

      <div
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        title="드래그하여 사진 위치 조정"
        style={{ borderColor: skin.border }}
        className={`relative border-b select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
      >
        <img
          src={item.img}
          alt={item.title}
          draggable={false}
          style={{ objectPosition: objectPos }}
          className={`w-full ${photoHeight} object-cover pointer-events-none`}
        />
      </div>

      <div className="p-6 space-y-5 flex-1 flex flex-col justify-between">
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="kor-heavy text-3xl sm:text-4xl leading-none">
                {item.title}
              </h3>
              {showLocation && (
                <p
                  style={{ color: skin.sub }}
                  className="text-xs font-bold mt-2"
                >
                  {item.fullAddress || item.addressShort}
                </p>
              )}
            </div>
            {showScore && (
              <div className="text-right shrink-0">
                <div
                  style={{ background: skin.accent, color: '#FFFFFF' }}
                  className="px-3.5 py-1.5 rounded-xl display-type text-3xl inline-block"
                >
                  {item.score}
                </div>
                <div
                  style={{ color: skin.accent }}
                  className="text-xs font-black tracking-widest mt-1"
                >
                  ★★★★★
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              background: skin.chipBg,
              borderLeftColor: skin.accent,
              color: skin.text,
            }}
            className="p-4 rounded-r-2xl border-l-4 font-bold text-base sm:text-lg leading-snug"
          >
            ‘{item.quote}’
          </div>

          {showProsCons && (
            <div className="space-y-2 pt-1 text-xs font-bold">
              <div className="flex items-baseline gap-2.5">
                <span
                  style={{ background: skin.text, color: skin.bg }}
                  className="px-2 py-0.5 rounded font-black uppercase tracking-wider shrink-0"
                >
                  GOOD
                </span>
                <span style={{ color: skin.sub }}>{item.good}</span>
              </div>
              {item.bad && (
                <div className="flex items-baseline gap-2.5">
                  <span
                    style={{ borderColor: skin.border, color: skin.text }}
                    className="px-2 py-0.5 rounded font-black uppercase tracking-wider border shrink-0"
                  >
                    BAD
                  </span>
                  <span style={{ color: skin.sub }}>{item.bad}</span>
                </div>
              )}
              <div className="flex items-baseline gap-2.5">
                <span
                  style={{ borderColor: skin.border, color: skin.text }}
                  className="px-2 py-0.5 rounded font-black uppercase tracking-wider border shrink-0"
                >
                  NOTE
                </span>
                <span style={{ color: skin.sub }}>{item.note}</span>
              </div>
            </div>
          )}
        </div>

        {showSignature && (
          <div
            style={{ color: skin.sub, marginTop: 'auto' }}
            className="pt-3 flex items-center justify-end text-xs font-bold"
          >
            <span>
              — {displayAuthor} ({item.date})
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
