'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { ArchiveItem, PresetSlot, SkinTheme } from '@/types/l2';
import CardStage from '@/components/CardStage';
import { haptic } from '@/lib/haptics';
import { resolveEffectiveSlot } from '@/lib/cardLayouts';
import { downloadCardFile, isShareCanceled, prepareCardExport } from '@/lib/cardExport';

interface ShareCardViewerProps {
  item: ArchiveItem;
  presetSlots: PresetSlot[];
  skins: Record<string, SkinTheme>;
  authorName: string;
}

export default function ShareCardViewer({
  item,
  presetSlots,
  skins,
  authorName,
}: ShareCardViewerProps) {
  const [slotIdx, setSlotIdx] = useState(0);
  const [copied, setCopied] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [preparedFile, setPreparedFile] = useState<File | null>(null);
  const captureRef = useRef<HTMLDivElement | null>(null);

  const preferred = presetSlots[slotIdx] || presetSlots[0] || { id: 'default', name: 'MY CARD', layout: 'broadside' as const, ratio: '3:4' as const, skinId: Object.keys(skins)[0] || 'paper' };
  const activeSlot = resolveEffectiveSlot(item, preferred);
  const activeSkin = skins[activeSlot.skinId] || Object.values(skins)[0] || { id: 'paper', name: 'PAPER', bg: '#F5F2EB', text: '#19191B', sub: '#66615B', border: '#D3CDC2', accent: '#B23824', chipBg: '#EDE8DF' };

  const handleDownloadPng = async () => {
    if (!captureRef.current || exporting) return;
    setError('');
    setNotice('');
    setExporting(true);
    try {
      const { file } = await prepareCardExport(captureRef.current, { filename: `L2_${activeSlot.name}_${item.title}.png` });
      setPreparedFile(file);
      downloadCardFile(file);
      haptic.success();
      setNotice('카드 이미지 다운로드를 시작했습니다.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '카드 저장에 실패했습니다. 다시 시도해 주세요.');
    } finally { setExporting(false); }
  };

  const handleSharePrepared = async () => {
    if (!preparedFile || !navigator.share) return;
    setError('');
    try {
      // File is already prepared: this call retains the current click's user activation.
      await navigator.share({ title: item.title, files: [preparedFile] });
      setNotice('카드 공유를 완료했습니다.');
    } catch (reason) {
      if (isShareCanceled(reason)) return;
      setError('공유를 열지 못했습니다. 카드 이미지 저장을 이용해 주세요.');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(
        `[L2] ${item.title}${item.score ? ` (★${item.score})` : ''} — ${new URL(`/share/${encodeURIComponent(item.id)}`, window.location.origin).href}`
      );
      haptic.success();
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      setError('링크를 복사하지 못했습니다. 브라우저 주소를 직접 복사해 주세요.');
    }
  };

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)] px-4 py-6 flex flex-col items-center justify-between">
      <header className="w-full max-w-[440px] flex items-center justify-between pb-4 border-b border-[var(--line)]">
        <Link
          href="/"
          className="display-type text-3xl tracking-tighter hover:opacity-80"
        >
          L2<span className="text-[var(--accent)]">.</span>
        </Link>
        <Link
          href="/"
          className="px-4 py-1.5 rounded-full bg-[var(--surface)] border border-[var(--line)] mono-num text-xs font-extrabold hover:border-[var(--fg)]"
        >
          OPEN L2 APP →
        </Link>
      </header>

      <main className="w-full max-w-[440px] my-6 space-y-4 flex flex-col items-center">
        {/* Preset Switcher */}
        <div className="w-full grid grid-cols-3 gap-2">
          {presetSlots.slice(0, 3).map((slot, idx) => (
            <button
              key={slot.id}
              onClick={() => {
                haptic.snap();
                setSlotIdx(idx);
                 setPreparedFile(null);
                 setError('');
                 setNotice('');
              }}
              className={`py-2.5 px-3 rounded-full mono-num text-xs font-extrabold border transition-all cursor-pointer active:scale-95 ${
                slotIdx === idx
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'bg-[var(--surface)] text-[var(--muted)] border-[var(--line)]'
              }`}
            >
              {slot.name}
            </button>
          ))}
        </div>

        {/* Live Card */}
        <CardStage
          item={item}
          slot={activeSlot}
          skin={activeSkin}
          authorName={authorName}
          selectedItems={[item]}
          curationTitle="TOP PICKS."
          cardCaptureRef={captureRef}
        />

        {/* Direct Action Buttons */}
        <div className="w-full space-y-2.5 pt-2">
          {item.link && <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-4 px-5 rounded-2xl bg-[#FEE500] text-[#111111] kor-heavy text-base flex items-center justify-between shadow-lg hover:brightness-95 transition-all"
          >
            <span>지도 / 상세정보 바로 열기 ({item.title})</span>
            <span className="mono-num text-xs font-extrabold">OPEN ↗</span>
          </a>}

          <div className="grid grid-cols-2 gap-2.5">
            <button
              onClick={handleDownloadPng}
               disabled={exporting}
               aria-busy={exporting}
              className="py-3.5 px-4 rounded-2xl bg-[var(--surface)] border border-[var(--line)] kor-heavy text-sm hover:border-[var(--fg)] cursor-pointer"
            >
              {exporting ? '이미지 준비 중…' : '카드 이미지 저장 ↓'}
            </button>
            <button
              onClick={handleCopyLink}
              className="py-3.5 px-4 rounded-2xl bg-[var(--accent)] text-white kor-heavy text-sm cursor-pointer"
            >
              {copied ? '복사 완료 ✓' : '링크 + 추천문구 복사'}
            </button>
          </div>
          {preparedFile && typeof navigator !== 'undefined' && typeof navigator.share === 'function' && navigator.canShare?.({ files: [preparedFile] }) && (
            <button type="button" onClick={handleSharePrepared} className="w-full py-3 rounded-2xl border border-[var(--line)] kor-heavy text-sm cursor-pointer">준비된 카드 공유하기 ↗</button>
          )}
          {notice && <p role="status" className="text-xs text-[var(--muted)]">{notice}</p>}
          {error && <p role="alert" className="text-xs text-[var(--accent)]">{error}</p>}
        </div>
      </main>

      <footer className="mono-num text-[11px] text-[var(--muted)]">
        L2. ARCHIVE CARD ENGINE
      </footer>
    </div>
  );
}
