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
  const hasPhoto = item.hasPhoto !== false && Boolean(item.img);

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
          {hasPhoto ? (
            <img
              src={item.img}
              alt={item.title}
              draggable={false}
              style={{ objectPosition: objectPos }}
              className="w-full h-full object-cover pointer-events-none"
            />
          ) : (
            <div
              style={{ background: skin.bg, color: skin.text }}
              className="w-full h-full flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="display-type text-4xl mb-2 tracking-tighter">L2.</div>
              <p className="kor-heavy text-2xl">{item.title}</p>
            </div>
          )}
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
              {hasPhoto ? (
                <img
                  src={item.img}
                  alt={item.title}
                  draggable={false}
                  style={{ objectPosition: objectPos }}
                  className="w-full h-full object-cover pointer-events-none"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-black/5 text-current/60 p-4 border border-dashed border-current/20 rounded-2xl">
                  <span className="display-type text-3xl font-black mb-1">L2 / {item.num}</span>
                  <span className="mono-num text-[10px] font-black uppercase tracking-widest">ADMISSION TICKET</span>
                </div>
              )}
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

  // 05: RECEIPT (Bistro Thermal Receipt)
  if (slot.layout === 'receipt') {
    return (
      <div
        ref={cardCaptureRef}
        style={{
          background: skin.bg,
          color: skin.text,
          borderColor: skin.border,
        }}
        className="w-full max-w-[390px] rounded-[20px] shadow-2xl border relative flex flex-col justify-between overflow-hidden transition-all duration-300"
      >
        {showGrain && (
          <div className="absolute inset-0 pointer-events-none z-20 texture-grain mix-blend-overlay" />
        )}
        {/* Top Sawtooth Edge */}
        <div
          style={{ color: skin.border }}
          className="receipt-sawtooth-t h-3 w-full opacity-80"
        />

        <div className="px-6 py-4 space-y-4 flex-1 flex flex-col justify-between">
          {/* Receipt Store Header */}
          <div className="text-center space-y-1 border-b border-dashed pb-3.5" style={{ borderColor: skin.border }}>
            <div className="display-type text-2xl tracking-tighter">L2. RECEIPT</div>
            <div className="mono-num text-[11px] font-black uppercase tracking-widest opacity-70">
              ORDER #0{item.num} · {item.date}
            </div>
            <div className="kor-heavy text-lg mt-1 truncate">{item.title}</div>
            {showLocation && (
              <div style={{ color: skin.sub }} className="text-[11px] font-bold truncate">
                {item.fullAddress || item.addressShort || item.loc}
              </div>
            )}
          </div>

          {/* Dithered Photo Thumbnail */}
          {hasPhoto && (
            <div
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              title="드래그하여 사진 위치 조정"
              style={{ borderColor: skin.border }}
              className={`relative rounded-xl overflow-hidden border aspect-[16/10] select-none ${
                isDragging ? 'cursor-grabbing' : 'cursor-grab'
              }`}
            >
              <img
                src={item.img}
                alt={item.title}
                draggable={false}
                style={{ objectPosition: objectPos }}
                className="w-full h-full object-cover filter contrast-125 grayscale pointer-events-none"
              />
              <div
                style={{ background: skin.accent }}
                className="absolute bottom-2 right-2 text-white text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider"
              >
                {item.cat}
              </div>
            </div>
          )}

          {/* Itemized Line Items */}
          <div className="space-y-1.5 py-1 border-b border-dashed text-xs mono-num" style={{ borderColor: skin.border }}>
            <div className="flex justify-between font-bold">
              <span className="truncate pr-2">01. {item.title}</span>
              <span style={{ color: skin.accent }}>★ {item.score}</span>
            </div>
            {showProsCons && item.good && (
              <div className="flex justify-between text-[11px] opacity-80 pl-2">
                <span className="truncate pr-2">└ GOOD: {item.good}</span>
                <span className="shrink-0 font-bold">INCL</span>
              </div>
            )}
            {showProsCons && item.bad && (
              <div className="flex justify-between text-[11px] opacity-80 pl-2">
                <span className="truncate pr-2">└ BAD: {item.bad}</span>
                <span className="shrink-0 font-bold">NOTED</span>
              </div>
            )}
            {showProsCons && item.note && (
              <div className="flex justify-between text-[11px] opacity-80 pl-2">
                <span className="truncate pr-2">└ NOTE: {item.note}</span>
                <span className="shrink-0 font-bold">TIPS</span>
              </div>
            )}
          </div>

          {/* Experience Metrics Summary */}
          <div className="space-y-1 text-xs border-b pb-3 pt-1" style={{ borderColor: skin.border }}>
            {showScore && (
              <div className="flex justify-between font-bold text-sm">
                <span>EXPERIENCE TOTAL</span>
                <span style={{ color: skin.accent }} className="text-base font-black mono-num">
                  ★ {item.score} / 5.0
                </span>
              </div>
            )}
            <div className="flex justify-between text-[11px] opacity-75">
              <span>CATEGORY</span>
              <span className="font-bold">{item.cat} · {item.loc}</span>
            </div>
            <div className="flex justify-between text-[11px] opacity-75">
              <span>VERDICT</span>
              <span className="font-bold">VERIFIED ARCHIVE</span>
            </div>
          </div>

          {/* Memo Quote */}
          <div
            style={{
              background: skin.chipBg,
              borderColor: skin.accent,
            }}
            className="p-3 rounded-xl text-xs leading-relaxed font-semibold italic border-l-3"
          >
            “{item.quote}”
          </div>

          {/* Barcode & Perforation Cut */}
          <div className="pt-2 text-center space-y-2">
            <div className="h-9 w-full flex items-center justify-center opacity-85 px-4">
              <svg className="w-full h-7" viewBox="0 0 200 40" preserveAspectRatio="none">
                <rect x="0" width="3" height="40" fill="currentColor"/>
                <rect x="5" width="2" height="40" fill="currentColor"/>
                <rect x="10" width="5" height="40" fill="currentColor"/>
                <rect x="18" width="1" height="40" fill="currentColor"/>
                <rect x="22" width="4" height="40" fill="currentColor"/>
                <rect x="30" width="2" height="40" fill="currentColor"/>
                <rect x="36" width="6" height="40" fill="currentColor"/>
                <rect x="45" width="2" height="40" fill="currentColor"/>
                <rect x="52" width="4" height="40" fill="currentColor"/>
                <rect x="60" width="1" height="40" fill="currentColor"/>
                <rect x="65" width="5" height="40" fill="currentColor"/>
                <rect x="74" width="3" height="40" fill="currentColor"/>
                <rect x="80" width="2" height="40" fill="currentColor"/>
                <rect x="85" width="6" height="40" fill="currentColor"/>
                <rect x="94" width="3" height="40" fill="currentColor"/>
                <rect x="100" width="5" height="40" fill="currentColor"/>
                <rect x="110" width="2" height="40" fill="currentColor"/>
                <rect x="116" width="4" height="40" fill="currentColor"/>
                <rect x="125" width="6" height="40" fill="currentColor"/>
                <rect x="135" width="2" height="40" fill="currentColor"/>
                <rect x="140" width="5" height="40" fill="currentColor"/>
                <rect x="150" width="3" height="40" fill="currentColor"/>
                <rect x="156" width="2" height="40" fill="currentColor"/>
                <rect x="162" width="6" height="40" fill="currentColor"/>
                <rect x="172" width="3" height="40" fill="currentColor"/>
                <rect x="180" width="5" height="40" fill="currentColor"/>
                <rect x="190" width="2" height="40" fill="currentColor"/>
                <rect x="195" width="4" height="40" fill="currentColor"/>
              </svg>
            </div>
            <p className="mono-num text-[9px] tracking-widest uppercase opacity-60">
              * L2-ARCHIVE-{item.id.replace(/[^A-Za-z0-9]/g, '').slice(0, 8).toUpperCase()} *
            </p>
          </div>

          {showSignature && (
            <div
              style={{ color: skin.sub, borderColor: skin.border }}
              className="pt-2 border-t border-dashed flex items-center justify-between mono-num text-[10px] font-bold"
            >
              <span>CURATOR: {displayAuthor}</span>
              <span>KEEP SLIP FOR ARCHIVE</span>
            </div>
          )}
        </div>

        {/* Bottom Sawtooth Edge */}
        <div
          style={{ color: skin.border }}
          className="receipt-sawtooth-b h-3 w-full opacity-80"
        />
      </div>
    );
  }

  // 06: POLAROID (35mm Contact Sheet / Polaroid Frame)
  if (slot.layout === 'polaroid') {
    return (
      <div
        ref={cardCaptureRef}
        style={{
          background: skin.bg,
          color: skin.text,
          borderColor: skin.border,
        }}
        className="w-full max-w-[390px] rounded-[24px] shadow-2xl border p-4 space-y-3 relative overflow-hidden transition-all duration-300"
      >
        {showGrain && (
          <div className="absolute inset-0 pointer-events-none z-20 texture-grain mix-blend-overlay" />
        )}

        {/* Masking Tape Graphic at Top Corner */}
        <div className="absolute -top-3 left-10 w-24 h-6 bg-[#E8E1CF]/90 backdrop-blur-sm -rotate-3 border-l border-r border-black/10 shadow-sm z-30 pointer-events-none" />

        {/* 35mm Sprocket Film Frame Container */}
        <div className="bg-[#121214] text-white p-3 rounded-xl space-y-2 mono-num text-[10px] shadow-inner">
          <div className="flex items-center justify-between text-white/50 tracking-widest px-1">
            <span>KODAK PORTRA 400</span>
            <span className="text-amber-500 font-black">▶ 24A</span>
          </div>

          <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            title="드래그하여 사진 위치 조정"
            className={`aspect-[4/3] rounded-lg overflow-hidden relative border border-white/10 select-none ${
              isDragging ? 'cursor-grabbing' : 'cursor-grab'
            }`}
          >
            {hasPhoto ? (
              <img
                src={item.img}
                alt={item.title}
                draggable={false}
                style={{ objectPosition: objectPos }}
                className="w-full h-full object-cover pointer-events-none"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-900 text-white/60">
                <span className="display-type text-2xl tracking-widest">{item.cat}</span>
                <span className="text-[10px] font-bold tracking-widest opacity-50 uppercase mt-1">NO PHOTO FRAME</span>
              </div>
            )}
            <div className="absolute inset-0 texture-grain pointer-events-none opacity-40 mix-blend-overlay" />
            {/* Vintage Timestamp in Amber LED */}
            <div className="absolute bottom-2 right-2 mono-num font-bold text-amber-500 text-xs tracking-widest drop-shadow-md">
              &apos;26 {item.date}
            </div>
          </div>

          <div className="flex items-center justify-between text-white/40 tracking-widest px-1 text-[9px]">
            <span>SAFETY FILM +0.5EV</span>
            <span>EXPOSURE 1/125s f/2.8</span>
          </div>
        </div>

        {/* Polaroid Handwritten Chin */}
        <div className="pt-2 pb-1 px-2 space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="kor-heavy text-2xl truncate">{item.title}</h3>
            {showScore && (
              <span
                style={{ background: skin.accent }}
                className="mono-num text-xs font-black text-white px-2.5 py-0.5 rounded-full shrink-0 shadow-sm"
              >
                ★ {item.score}
              </span>
            )}
          </div>

          <p className="text-xs font-medium leading-relaxed opacity-90 line-clamp-3">
            “{item.quote}”
          </p>

          {showProsCons && (item.good || item.note) && (
            <div style={{ color: skin.sub }} className="text-[11px] font-bold space-y-0.5 pt-1">
              {item.good && <div>• GOOD — {item.good}</div>}
              {item.note && <div>• NOTE — {item.note}</div>}
            </div>
          )}

          {showSignature && (
            <div
              style={{ borderColor: skin.border, color: skin.sub }}
              className="pt-3 border-t flex items-center justify-between mono-num text-[10px] font-bold"
            >
              <span>{showLocation ? (item.addressShort || item.loc) : item.cat}</span>
              <span className="italic">— {displayAuthor}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 07: MAGAZINE (Monocle / Kinfolk Editorial Spread)
  if (slot.layout === 'magazine') {
    return (
      <div
        ref={cardCaptureRef}
        style={{ borderColor: skin.border }}
        className="w-full max-w-[400px] aspect-[3/4.2] rounded-[24px] shadow-2xl overflow-hidden border relative flex flex-col justify-between text-white transition-all duration-300"
      >
        {showGrain && (
          <div className="absolute inset-0 pointer-events-none z-20 texture-grain mix-blend-overlay" />
        )}

        {/* Full Bleed Photo Background with Vignette */}
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
          {hasPhoto ? (
            <img
              src={item.img}
              alt={item.title}
              draggable={false}
              style={{ objectPosition: objectPos }}
              className="w-full h-full object-cover filter brightness-[0.75] pointer-events-none"
            />
          ) : (
            <div
              style={{ background: skin.bg, color: skin.text }}
              className="w-full h-full flex flex-col items-center justify-center p-8 text-center"
            >
              <div className="display-type text-4xl mb-2 tracking-tighter">L2.</div>
              <p className="kor-heavy text-2xl">{item.title}</p>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/75 pointer-events-none" />
        </div>

        {/* Magazine Masthead (Top) */}
        <div className="relative z-10 p-6 border-b border-white/20 flex items-baseline justify-between pointer-events-none">
          <div>
            <span className="display-type text-3xl font-black tracking-widest">L2. CHRONICLE</span>
            <div className="mono-num text-[9px] tracking-widest uppercase text-white/70 mt-0.5">
              THE JOURNAL OF TASTE &amp; SPACES
            </div>
          </div>
          <div className="text-right mono-num text-[10px]">
            <span style={{ color: skin.accent }} className="font-bold">VOL. 08</span><br />
            <span className="text-white/60">AUTUMN &apos;26</span>
          </div>
        </div>

        {/* Editorial Feature Article Headline (Bottom) */}
        <div className="relative z-10 p-6 space-y-3 pointer-events-none">
          <div
            style={{ background: skin.accent }}
            className="inline-block px-2.5 py-0.5 rounded-full text-white text-[10px] font-black uppercase tracking-wider mono-num"
          >
            COVER STORY · {item.cat}
          </div>

          <h2 className="kor-heavy text-3xl sm:text-4xl font-black leading-tight tracking-tight text-white drop-shadow-md">
            {item.title}
          </h2>

          <p className="text-xs text-white/85 leading-relaxed line-clamp-3 font-medium">
            “{item.quote}”
          </p>

          {showProsCons && (item.good || item.note) && (
            <div className="text-[11px] text-white/75 space-y-0.5 pt-1 font-semibold">
              {item.good && <div>• KEY — {item.good}</div>}
              {item.note && <div>• NOTE — {item.note}</div>}
            </div>
          )}

          <div className="pt-3 border-t border-white/20 flex items-center justify-between mono-num text-[10px] text-white/70">
            {showScore && <span>RATING : ★ {item.score} / 5.0</span>}
            {showSignature && <span>— {displayAuthor} ({item.date})</span>}
          </div>
        </div>
      </div>
    );
  }

  // 08: PASSPORT (Travel Passport & Entry Visa Stamp — NO PHOTO)
  if (slot.layout === 'passport') {
    return (
      <div
        ref={cardCaptureRef}
        style={{
          background: skin.bg,
          color: skin.text,
          borderColor: skin.accent || '#D4AF37',
        }}
        className="w-full max-w-[390px] rounded-[24px] shadow-2xl guilloche-pattern border-2 relative overflow-hidden flex flex-col justify-between p-6 transition-all duration-300"
      >
        {showGrain && (
          <div className="absolute inset-0 pointer-events-none z-20 texture-grain mix-blend-overlay" />
        )}

        {/* Gold Foil Crest Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-current/25 pb-4">
          <div className="flex items-center gap-3">
            <div
              style={{ borderColor: skin.accent }}
              className="w-11 h-11 rounded-full border-2 flex items-center justify-center display-type font-black text-xl shadow-[0_0_12px_rgba(212,175,55,0.2)]"
            >
              L2
            </div>
            <div>
              <div className="display-type text-sm font-bold tracking-widest">ARCHIVE PASSPORT</div>
              <div className="mono-num text-[9px] opacity-60 tracking-wider">REPUBLIC OF TASTE · {item.cat}</div>
            </div>
          </div>
          <span style={{ color: skin.accent }} className="mono-num text-xs font-bold tracking-widest">
            PAS-{item.num || '01'}-26
          </span>
        </div>

        {/* Stamp & Visa Content */}
        <div className="relative z-10 py-5 space-y-4">
          {/* Weathered Arrival Stamps */}
          <div className="flex items-center justify-around gap-2 py-2">
            <div className="border-2 border-red-500/80 text-red-500 font-mono mono-num font-black text-[10px] p-2.5 rounded-lg -rotate-6 tracking-wider uppercase text-center leading-tight shadow-sm">
              ★ VISITED ★<br />
              <span className="text-xs font-bold">{item.loc || 'SEOUL'}</span><br />
              {item.date}
            </div>
            {showScore && (
              <div className="border-2 border-cyan-500/80 text-cyan-600 dark:text-cyan-400 font-mono mono-num font-black text-[10px] p-2 rounded-full rotate-12 tracking-wider uppercase text-center leading-tight w-20 h-20 flex flex-col items-center justify-center shadow-sm">
                ADMITTED<br />
                <span className="text-xs font-black">SCORE {item.score}</span><br />
                <span className="text-[8px] opacity-75">VERIFIED</span>
              </div>
            )}
          </div>

          {/* Spot Data Box */}
          <div
            style={{
              background: skin.chipBg,
              borderColor: skin.border,
            }}
            className="border rounded-2xl p-4 space-y-2 mono-num"
          >
            <div style={{ color: skin.accent }} className="text-[10px] font-black uppercase tracking-widest">
              OFFICIAL RECORD ENTRY
            </div>
            <div className="kor-heavy text-xl text-current truncate">{item.title}</div>
            {showLocation && (
              <div style={{ color: skin.sub }} className="text-[11px] font-bold truncate">
                LOC: {item.fullAddress || item.addressShort || item.loc}
              </div>
            )}
            <p className="text-xs font-medium leading-relaxed opacity-90 line-clamp-2 pt-1 border-t border-dashed border-current/15">
              “{item.quote}”
            </p>
          </div>
        </div>

        {/* Machine Readable Zone (MRZ) Strip */}
        <div
          style={{ borderColor: skin.border, color: skin.sub }}
          className="relative z-10 pt-3 border-t mono-num text-[10px] tracking-widest leading-relaxed select-all font-mono"
        >
          <div className="truncate">
            P&lt;KORARCHIVE&lt;&lt;L2&lt;{item.cat}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;
          </div>
          <div className="truncate">
            {item.id.replace(/[^A-Za-z0-9]/g, '').slice(0, 9).toUpperCase()}2610M2610165KOR&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;{item.num || '01'}
          </div>
          {showSignature && (
            <div className="flex justify-between items-center pt-2 text-[9px] font-bold">
              <span>ISSUED BY: {displayAuthor}</span>
              <span>ENTRY GRANTED</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 09: VINYL (Vinyl LP Sleeve & 33⅓ RPM Liner — NO PHOTO)
  if (slot.layout === 'vinyl') {
    return (
      <div
        ref={cardCaptureRef}
        style={{
          background: skin.bg,
          color: skin.text,
          borderColor: skin.border,
        }}
        className="w-full max-w-[390px] aspect-square rounded-[24px] shadow-2xl relative overflow-hidden border flex flex-col justify-between p-5 transition-all duration-300"
      >
        {showGrain && (
          <div className="absolute inset-0 pointer-events-none z-20 texture-grain mix-blend-overlay" />
        )}

        {/* Vinyl Disc Peeking Out on Right */}
        <div className="absolute -right-16 top-1/2 -translate-y-1/2 w-48 h-48 rounded-full vinyl-grooves border-4 border-black/80 shadow-2xl flex items-center justify-center pointer-events-none opacity-90 z-0">
          <div
            style={{ background: skin.accent }}
            className="w-16 h-16 rounded-full border-2 border-white/20 flex flex-col items-center justify-center text-[8px] mono-num font-black text-white text-center shadow-inner"
          >
            <span>L2. SOUND</span>
            <span className="text-[6px] opacity-80">33⅓ RPM</span>
          </div>
        </div>

        {/* Vinyl Jacket Top Header */}
        <div className="relative z-10 flex items-center justify-between border-b border-current/15 pb-2.5">
          <div className="flex items-center gap-2">
            <span
              style={{ background: skin.accent }}
              className="w-2 h-2 rounded-full animate-pulse"
            />
            <span style={{ color: skin.accent }} className="mono-num text-[10px] font-black tracking-widest uppercase">
              STEREO LP · HI-FI
            </span>
          </div>
          <span style={{ color: skin.sub }} className="mono-num text-[10px]">
            SIDE A / CAT #{item.num || '01'}
          </span>
        </div>

        {/* Tracklist Liner Notes */}
        <div className="relative z-10 space-y-2 pr-14 my-auto">
          <h3 className="kor-heavy text-2xl truncate">{item.title}</h3>
          <p style={{ color: skin.sub }} className="text-[11px] font-medium italic truncate">
            Original Experience Soundtrack · {item.loc}
          </p>

          <div className="space-y-1 mono-num text-[10px] pt-1 border-t border-current/10">
            <div className="flex justify-between border-b border-current/5 pb-1">
              <span className="truncate pr-2">01. {item.good || '첫인상과 분위기'}</span>
              <span style={{ color: skin.accent }} className="shrink-0">03:42</span>
            </div>
            <div className="flex justify-between border-b border-current/5 pb-1">
              <span className="truncate pr-2">02. {item.quote.slice(0, 22) || '핵심 경험의 디테일'}</span>
              <span style={{ color: skin.accent }} className="shrink-0">04:18</span>
            </div>
            <div className="flex justify-between">
              <span className="truncate pr-2">03. {item.note || '방문 팁과 총평'}</span>
              <span style={{ color: skin.accent }} className="shrink-0">05:20</span>
            </div>
          </div>
        </div>

        {/* Audio Player Style Scrubber at Bottom */}
        <div className="relative z-10 pt-2 border-t border-current/10 space-y-1.5 mono-num text-[10px]">
          <div className="flex items-center justify-between opacity-75">
            {showScore && <span style={{ color: skin.accent }} className="font-bold">SCORE ★ {item.score} / 5.0</span>}
            <span>{item.cat} · ARCHIVE</span>
          </div>
          <div className="w-full bg-current/10 h-1.5 rounded-full overflow-hidden">
            <div
              style={{ background: skin.accent }}
              className="h-full w-4/5 rounded-full transition-all"
            />
          </div>
          {showSignature && (
            <div style={{ color: skin.sub }} className="flex justify-between text-[9px] pt-0.5">
              <span>MASTERED: {item.date}</span>
              <span>CURATED BY {displayAuthor}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 10: LIBRARY (Vintage Library Catalog Index Card — NO PHOTO)
  if (slot.layout === 'library') {
    return (
      <div
        ref={cardCaptureRef}
        style={{
          background: skin.bg,
          color: skin.text,
          borderColor: skin.border,
        }}
        className="w-full max-w-[390px] rounded-[24px] shadow-2xl library-ruled border p-6 relative overflow-hidden flex flex-col justify-between transition-all duration-300"
      >
        {showGrain && (
          <div className="absolute inset-0 pointer-events-none z-20 texture-grain mix-blend-overlay" />
        )}

        {/* Header & Dewey Decimal Call Number */}
        <div className="border-b-2 border-red-500/30 pb-3 flex items-start justify-between">
          <div>
            <div className="display-type text-base font-black tracking-wider text-red-600 dark:text-red-400">
              L2 PUBLIC ARCHIVE
            </div>
            <div className="mono-num text-[10px] font-bold uppercase tracking-widest opacity-60">
              CARD CATALOGUE · {item.cat}
            </div>
          </div>
          <div className="text-right mono-num text-xs font-black p-1.5 rounded bg-black/5 border border-black/10">
            CALL NO.<br />
            <span style={{ color: skin.accent }}>720.95 / L2-{item.num || '01'}</span>
          </div>
        </div>

        {/* Catalog Metadata Entry */}
        <div className="py-4 space-y-3">
          <div>
            <span className="mono-num text-[10px] font-black tracking-wider opacity-60 block">TITLE OF RECORD</span>
            <h3 className="kor-heavy text-2xl truncate">{item.title}</h3>
          </div>

          {showLocation && (
            <div>
              <span className="mono-num text-[10px] font-black tracking-wider opacity-60 block">LOCATION</span>
              <p className="text-xs font-bold opacity-80 truncate">
                {item.fullAddress || item.addressShort || item.loc}
              </p>
            </div>
          )}

          <div>
            <span className="mono-num text-[10px] font-black tracking-wider opacity-60 block">CURATOR&apos;S SUMMARY</span>
            <p className="text-xs font-semibold leading-relaxed line-clamp-3 italic">
              “{item.quote}”
            </p>
          </div>
        </div>

        {/* Stamped Checkout Date Table */}
        <div className="border-t border-b border-current/20 py-2.5 space-y-1.5 mono-num text-[10px]">
          <div className="flex justify-between font-black opacity-60 text-[9px] uppercase tracking-wider">
            <span>DATE ISSUED</span>
            <span>CURATOR</span>
            <span>STATUS / SCORE</span>
          </div>
          <div className="flex justify-between items-center font-bold text-blue-700 dark:text-blue-300">
            <span>{item.date}</span>
            <span className="truncate max-w-[120px]">{displayAuthor}</span>
            {showScore && <span style={{ color: skin.accent }}>★ {item.score} (VERIFIED)</span>}
          </div>
          <div className="flex justify-between items-center pt-1 border-t border-dashed border-current/10">
            <span className="text-[9px] font-bold text-red-500 uppercase tracking-widest border border-red-500/40 px-1 rounded -rotate-2">
              ARCHIVED &amp; PRESERVED
            </span>
            <span className="text-[9px] opacity-60">REGISTRY #26-{item.num}</span>
          </div>
        </div>

        {showSignature && (
          <div
            style={{ color: skin.sub }}
            className="pt-3 flex items-center justify-between mono-num text-[9px] font-bold tracking-widest uppercase"
          >
            <span>L2 ARCHIVAL SYSTEM</span>
            <span>DO NOT REMOVE FROM POCKET</span>
          </div>
        )}
      </div>
    );
  }

  // 11: BROADSIDE (Swiss Modernist Broadside Poster — NO PHOTO)
  if (slot.layout === 'broadside') {
    return (
      <div
        ref={cardCaptureRef}
        style={{
          background: skin.bg,
          color: skin.text,
          borderColor: skin.border,
        }}
        className="w-full max-w-[390px] rounded-[24px] shadow-2xl border p-6 relative overflow-hidden flex flex-col justify-between transition-all duration-300"
      >
        {showGrain && (
          <div className="absolute inset-0 pointer-events-none z-20 texture-grain mix-blend-overlay" />
        )}

        {/* Top Swiss Minimalist Grid */}
        <div className="space-y-4">
          <div className="flex items-start justify-between border-b-2 border-current pb-4">
            <div>
              <div
                style={{ color: skin.accent }}
                className="display-type text-4xl sm:text-5xl font-black leading-none tracking-tighter"
              >
                0{item.num || '01'}
              </div>
              <div className="mono-num text-[11px] font-black tracking-widest uppercase mt-1">
                L2 ARCHIV {item.cat}
              </div>
            </div>
            <div
              style={{ background: skin.accent, color: '#FFFFFF' }}
              className="w-10 h-10 rounded-lg flex items-center justify-center font-black text-2xl"
            >
              +
            </div>
          </div>

          {/* 3-Column Modernist Metadata */}
          <div className="grid grid-cols-3 gap-2 border-b border-current/20 pb-3 mono-num text-[10px]">
            <div>
              <span className="opacity-50 block font-bold">01 ORT</span>
              <span className="font-black truncate block">{item.loc}</span>
            </div>
            <div>
              <span className="opacity-50 block font-bold">02 DATUM</span>
              <span className="font-black block">{item.date}</span>
            </div>
            <div>
              <span className="opacity-50 block font-bold">03 PUNKTE</span>
              {showScore && <span style={{ color: skin.accent }} className="font-black block">★ {item.score}</span>}
            </div>
          </div>

          {/* Architectural Grotesque Headline */}
          <div className="space-y-3 py-2">
            <h2 className="kor-heavy text-3xl sm:text-4xl font-black leading-tight tracking-tight">
              {item.title}
            </h2>
            <div
              style={{ borderColor: skin.accent }}
              className="border-l-4 pl-3.5 py-1 text-sm sm:text-base font-bold leading-snug"
            >
              “{item.quote}”
            </div>
          </div>

          {/* Structured Pro/Note Grid */}
          {showProsCons && (item.good || item.note) && (
            <div
              style={{ background: skin.chipBg }}
              className="p-3.5 rounded-xl space-y-1.5 text-xs font-bold"
            >
              {item.good && (
                <div className="flex items-baseline gap-2">
                  <span style={{ color: skin.accent }} className="mono-num font-black shrink-0">POS —</span>
                  <span className="line-clamp-2">{item.good}</span>
                </div>
              )}
              {item.note && (
                <div className="flex items-baseline gap-2">
                  <span style={{ color: skin.sub }} className="mono-num font-black shrink-0">NOT —</span>
                  <span className="line-clamp-2">{item.note}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Swiss Modernist Colophon Footer */}
        {showSignature && (
          <div
            style={{ borderColor: skin.border, color: skin.sub }}
            className="pt-4 border-t flex items-center justify-between mono-num text-[9px] font-black uppercase tracking-widest"
          >
            <span>ZÜRICH · SEOUL</span>
            <span>EDITION {displayAuthor}</span>
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
        {hasPhoto ? (
          <img
            src={item.img}
            alt={item.title}
            draggable={false}
            style={{ objectPosition: objectPos }}
            className={`w-full ${photoHeight} object-cover pointer-events-none`}
          />
        ) : (
          <div className={`w-full ${photoHeight} flex flex-col items-center justify-center bg-black/5 text-current/60 p-4`}>
            <span className="display-type text-3xl font-black mb-1">L2.</span>
            <span className="mono-num text-[10px] font-black uppercase tracking-widest">{item.cat} · ARCHIVE</span>
          </div>
        )}
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
