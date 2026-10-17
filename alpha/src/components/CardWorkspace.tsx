'use client';
import { useState, type RefObject } from 'react';
import { Check, Share2, PencilLine, LoaderCircle, Layers } from 'lucide-react';
import type { ArchiveItem, CardLayoutType, PresetSlot, SkinTheme } from '@/types/l2';
import { INITIAL_SKINS } from '@/data/initialData';
import { CARD_LAYOUTS, getCardLayout } from '@/lib/cardLayouts';
import { isLogGroup } from '@/lib/logGroups';
import CardStage from './CardStage';
import FitCard from './FitCard';
import AccessibleDialog from './AccessibleDialog';
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
  hasPendingChange?: boolean;
  onApplyPreset: (preset: PresetSlot) => void;
  onApplyLayout?: (layout: CardLayoutType) => void;
  onEdit: () => void;
  onSaveCard: () => void;
  onShare: () => void;
  onRetryExport: () => void;
  onOpenMember: (item: ArchiveItem) => void;
}

const NO_PHOTO_LAYOUTS = CARD_LAYOUTS.filter(entry => entry.isNoPhoto);

export default function CardWorkspace(p: Props) {
  const [membersOpen, setMembersOpen] = useState(false);
  const shareReady = p.exportState === 'ready' && !p.applying;
  const isNoPhoto = (p.item.hasPhoto === false || !p.item.img) && !isLogGroup(p.item);
  const allSkins = { ...INITIAL_SKINS, ...(p.skins || {}) };

  return (
    <section className="record-card" aria-label="로그 카드">
      <div className="record-card-split">
        <div className="record-card-stage">
          <FitCard
            ratio={p.slot.ratio}
            animationKey={`${p.item.id}-${p.slot.layout}-${p.slot.skinId}-${p.slot.ratio}`}
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

        <aside className="record-preset-picker" aria-label="카드 스타일 선택">
          <div className="record-preset-head">
            <div className="record-preset-title-row">
              <span>프리셋</span>
              {p.hasPendingChange && <em className="record-pending-badge">미저장</em>}
            </div>
            {isNoPhoto && p.onApplyLayout && (
              <div className="record-nophoto-layouts" role="group" aria-label="글 전용 카드 도안">
                {NO_PHOTO_LAYOUTS.map(layout => (
                  <button
                    type="button"
                    key={layout.id}
                    aria-pressed={p.slot.layout === layout.id}
                    disabled={p.applying}
                    onClick={() => p.onApplyLayout?.(layout.id)}
                  >
                    {layout.sub.replace('형', '')}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="record-preset-scroll" role="group" aria-label="로그에 적용할 프리셋">
            {p.presets.map(preset => {
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
                  onClick={() => p.onApplyPreset(preset)}
                  className="record-preset-item"
                >
                  <div className="record-preset-item-top">
                    <span className="record-preset-swatches" aria-hidden="true">
                      <i style={{ background: presetSkin.bg }} />
                      <i style={{ background: presetSkin.text }} />
                      <i style={{ background: presetSkin.accent }} />
                    </span>
                    <small>{presetLayout.sub.replace('형', '')}</small>
                  </div>
                  <div className="record-preset-item-bottom">
                    <strong>{preset.name}</strong>
                    {isSelected && <Check size={12} className="record-preset-check" />}
                  </div>
                </button>
              );
            })}
          </div>
        </aside>
      </div>

      {p.exportState === 'error' && (
        <div className="record-card-error" role="alert">
          <span>{p.exportError}</span>
          <button type="button" onClick={p.onRetryExport}>
            다시 준비
          </button>
        </div>
      )}

      <div className="record-card-actions" role="group" aria-label="카드 작업">
        <button type="button" onClick={p.onEdit}>
          <PencilLine size={17} />
          <span>내용 수정</span>
        </button>
        <button
          type="button"
          className={`record-card-save ${p.hasPendingChange ? 'is-dirty' : ''}`}
          disabled={p.applying}
          onClick={p.onSaveCard}
        >
          {p.applying ? <LoaderCircle size={17} className="preset-spinner" /> : <Check size={17} />}
          <span>{p.hasPendingChange ? '카드 저장' : '카드 확정'}</span>
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
