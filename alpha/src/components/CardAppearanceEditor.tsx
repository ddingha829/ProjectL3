'use client';

import type { ArchiveItem, CardAppearance, PresetSlot, SkinTheme } from '@/types/l2';
import { CARD_LAYOUTS, getCardLayout, resolveEffectiveSlot } from '@/lib/cardLayouts';
import { createCardAppearance } from '@/lib/cardAppearance';
import './CardAppearanceEditor.css';

interface Props {
  item: ArchiveItem;
  appearance: CardAppearance;
  presets: PresetSlot[];
  skins: Record<string, SkinTheme>;
  onChange: (appearance: CardAppearance) => void;
}

const elements = [
  { key: 'showScore', label: '별점' },
  { key: 'showProsCons', label: '요약·포인트' },
  { key: 'showLocation', label: '장소' },
  { key: 'showSignature', label: '서명' },
  { key: 'showGrain', label: '종이 질감' },
] as const;

export default function CardAppearanceEditor({ item, appearance, presets, skins, onChange }: Props) {
  const slot = resolveEffectiveSlot(item, appearance.slot);
  const layout = getCardLayout(slot.layout);
  const noPhoto = item.hasPhoto === false || !item.img;
  const palettes = { ...skins, [appearance.skin.id]: appearance.skin };
  const updateSlot = (patch: Partial<PresetSlot>) => onChange({ ...appearance, slot: { ...appearance.slot, ...patch } });

  return (
    <details className="record-design-editor">
      <summary><span>카드 디자인</span><small>{layout.name} · {slot.ratio} · {appearance.skin.name}</small></summary>
      <div className="record-design-fields">
        <div>
          <span className="test-field-label">프리셋 적용</span>
          <div className="test-chips">{presets.map((preset, index) => (
            <button type="button" key={preset.id} className="test-chip" onClick={() => onChange(createCardAppearance(item, preset, skins, appearance.authorName))}>{preset.name || `프리셋 ${index + 1}`}</button>
          ))}</div>
        </div>
        <label className="record-design-field">디자인
          <select value={slot.layout} onChange={event => {
            const selected = getCardLayout(event.target.value as PresetSlot['layout']);
            updateSlot({ layout: selected.id });
          }}>
            {CARD_LAYOUTS.filter(option => !noPhoto || option.isNoPhoto).map(option => <option key={option.id} value={option.id}>{option.name} · {option.sub}</option>)}
          </select>
        </label>
        <div>
          <span className="test-field-label">비율</span>
          <div className="test-chips">{layout.supportedRatios.map(ratio => <button type="button" key={ratio} className={`test-chip ${ratio === slot.ratio ? 'selected' : ''}`} aria-pressed={ratio === slot.ratio} onClick={() => updateSlot({ ratio })}>{ratio}</button>)}</div>
        </div>
        <div>
          <span className="test-field-label">팔레트</span>
          <div className="record-design-palettes">{Object.values(palettes).map(skin => <button type="button" key={skin.id} aria-pressed={skin.id === appearance.skin.id} className={skin.id === appearance.skin.id ? 'selected' : ''} onClick={() => onChange({ ...appearance, slot: { ...appearance.slot, skinId: skin.id }, skin: { ...skin } })}>
            <span className="record-design-colors" aria-hidden="true">{[skin.bg, skin.text, skin.accent].map((color, index) => <i key={index} style={{ backgroundColor: color }} />)}</span><span>{skin.name}</span>
          </button>)}</div>
        </div>
        <label className="record-design-field">서명<input value={appearance.authorName} maxLength={32} onChange={event => onChange({ ...appearance, authorName: event.target.value })} /></label>
        <div className="record-design-elements">{elements.filter(element => layout.supportedElements.includes(element.key)).map(element => <label key={element.key}><span>{element.label}</span><input type="checkbox" checked={appearance.slot[element.key] !== false} onChange={event => updateSlot({ [element.key]: event.target.checked })} /></label>)}</div>
      </div>
    </details>
  );
}
