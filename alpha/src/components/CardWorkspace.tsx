'use client';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { Check, Share2, PencilLine, LoaderCircle, Layers, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ArchiveItem, PresetSlot, SkinTheme } from '@/types/l2';
import { PRESET_SLOTS, INITIAL_SKINS } from '@/data/initialData';
import { getCardLayout } from '@/lib/cardLayouts';
import { isLogGroup } from '@/lib/logGroups';
import CardStage from './CardStage';
import FitCard from './FitCard';
import AccessibleDialog from './AccessibleDialog';
import SaveFeedback from './SaveFeedback';
import { useDragScrollRail } from '@/hooks/useDragScrollRail';
import { allowsMotion } from '@/lib/motion';
import './CardWorkspace.css';

interface Props {
  item: ArchiveItem;
  slot: PresetSlot;
  skin: SkinTheme;
  authorName: string;
  members: ArchiveItem[];
  presets: PresetSlot[];
  skins?: Record<string, SkinTheme>;
  captureRef: RefObject<HTMLDivElement | null>;
  exportState: 'idle' | 'preparing' | 'ready' | 'error';
  exportError: string;
  applying: boolean;
  saved?: boolean;
  hasPendingChange?: boolean;
  onApplyPreset: (preset: PresetSlot) => void;
  onEdit: () => void;
  onSaveCard: () => void;
  onShare: () => void;
  onRetryExport: () => void;
  onOpenMember: (item: ArchiveItem) => void;
}

export default function CardWorkspace(p: Props) {
  const [membersOpen, setMembersOpen] = useState(false);
  const [direction, setDirection] = useState(1);
  const railRef = useRef<HTMLDivElement>(null);
  const railDrag = useDragScrollRail(railRef);
  const shareReady = p.exportState === 'ready' && !p.applying;
  const allSkins = { ...INITIAL_SKINS, ...(p.skins || {}) };

  const compatible = p.presets.filter(preset => isLogGroup(p.item) ? preset.layout === 'curation' : preset.layout !== 'curation');
  const presets = compatible.length ? compatible : PRESET_SLOTS.filter(preset => isLogGroup(p.item) ? preset.layout === 'curation' : preset.layout !== 'curation');
  const activeIndex = Math.max(
    0,
    presets.findIndex(
      preset =>
        p.slot.id === preset.id &&
        p.slot.skinId === preset.skinId &&
        (!!p.item.img ? p.slot.layout === preset.layout : true)
    )
  );

  useEffect(() => {
    const rail = railRef.current;
    if (!rail) return;
    const activeBtn = rail.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (activeBtn) {
      activeBtn.scrollIntoView({ behavior: allowsMotion() ? 'smooth' : 'instant', inline: 'center', block: 'nearest' });
    }
  }, [p.slot.id, p.slot.skinId, p.slot.layout]);

  const selectPresetAt = (nextIdx: number, stepDir?: number) => {
    if (!presets.length || p.applying) return;
    const wrapped = (nextIdx + presets.length) % presets.length;
    const dir = stepDir ?? (wrapped < activeIndex ? -1 : 1);
    setDirection(dir);
    p.onApplyPreset(presets[wrapped]);
  };

  return (
    <section className="record-card" aria-label="로그 카드">
      <div className="record-card-stage">
        <FitCard
          ratio={p.slot.ratio}
          transition="slide"
          direction={direction}
          animationKey={`${p.item.id}-${p.slot.id}-${p.slot.layout}-${p.slot.skinId}-${p.slot.ratio}`}
        >
          <CardStage
            item={p.item}
            slot={p.slot}
            skin={p.skin}
            authorName={p.authorName}
            selectedItems={p.members}
            curationTitle={p.item.title}
            cardCaptureRef={p.captureRef}
          />
        </FitCard>
        {isLogGroup(p.item) && (
          <button
            type="button"
            className="record-group-members"
            onClick={() => setMembersOpen(true)}
          >
            <Layers size={13} />
            담긴 로그 {p.members.length}개
          </button>
        )}
      </div>

      {p.exportState === 'error' && (
        <div className="record-card-error" role="alert">
          <span>{p.exportError}</span>
          <button type="button" onClick={p.onRetryExport}>
            다시 준비
          </button>
        </div>
      )}

      <div className="record-preset-controls" aria-label="카드 프리셋 선택">
        <div className="record-preset-bar-head">
          <div className="record-preset-title-group">
            <span>프리셋</span>
            <small>{activeIndex + 1} / {presets.length}</small>
            {p.hasPendingChange && <em className="record-pending-badge">미저장</em>}
          </div>

          <div className="record-preset-head-right">
            <div className="record-preset-arrows" role="group" aria-label="프리셋 이전 다음 이동">
              <button
                type="button"
                aria-label="이전 프리셋"
                disabled={p.applying || presets.length <= 1}
                onClick={() => selectPresetAt(activeIndex - 1, -1)}
              >
                <ChevronLeft size={16} />
              </button>
              <button
                type="button"
                aria-label="다음 프리셋"
                disabled={p.applying || presets.length <= 1}
                onClick={() => selectPresetAt(activeIndex + 1, 1)}
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <div
          ref={railRef}
          {...railDrag}
          className="preset-rail record-preset-rail"
          role="group"
          aria-label="옆으로 스와이프하여 프리셋 선택"
        >
          {presets.map((preset, index) => {
            const isSelected =
              p.slot.id === preset.id &&
              p.slot.skinId === preset.skinId &&
              (!!p.item.img ? p.slot.layout === preset.layout : true);
            const presetSkin = allSkins[preset.skinId] || INITIAL_SKINS.paper;
            const presetLayout = getCardLayout(preset.layout);

            return (
              <button
                type="button"
                key={preset.id}
                aria-pressed={isSelected}
                disabled={p.applying}
                onClick={() => selectPresetAt(index)}
                className={`record-preset-chip ${isSelected ? 'selected' : ''}`}
              >
                <div className="record-preset-chip-top">
                  <span className="record-preset-swatches" aria-hidden="true">
                    <i style={{ background: presetSkin.bg }} />
                    <i style={{ background: presetSkin.text }} />
                    <i style={{ background: presetSkin.accent }} />
                  </span>
                  <small>{presetLayout.sub.replace('형', '')}</small>
                </div>
                <div className="record-preset-chip-bottom">
                  <strong>{preset.name}</strong>
                  {isSelected && <Check size={12} className="record-preset-check" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="record-card-actions" role="group" aria-label="카드 작업">
        <button type="button" onClick={p.onEdit}>
          <PencilLine size={17} />
          <span>내용 수정</span>
        </button>
        <button
          type="button"
          className={`record-card-save ${p.hasPendingChange ? 'is-dirty' : ''}`}
          data-save-state={p.saved ? 'saved' : p.applying ? 'saving' : 'idle'}
          disabled={p.applying || !p.hasPendingChange}
          onClick={p.onSaveCard}
        >
          <SaveFeedback state={p.saved ? 'saved' : p.applying ? 'saving' : 'idle'} label="카드 저장" idleIcon={<Check size={17} />} />
        </button>
        <button type="button" disabled={!shareReady} onClick={p.onShare}>
          {!shareReady ? <LoaderCircle size={17} className="preset-spinner" /> : <Share2 size={17} />}
          <span>공유하기</span>
        </button>
      </div>

      <AccessibleDialog
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        title={p.item.title}
      >
        <div className="group-members-list">
          {p.members.length ? (
            p.members.map((member, index) => (
              <button
                type="button"
                key={member.id}
                onClick={() => {
                  setMembersOpen(false);
                  p.onOpenMember(member);
                }}
              >
                <small>{String(index + 1).padStart(2, '0')}</small>
                <span>{member.title}</span>
              </button>
            ))
          ) : (
            <p>담긴 로그가 없어요.</p>
          )}
        </div>
      </AccessibleDialog>
    </section>
  );
}
