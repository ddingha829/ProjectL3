import type { ArchiveCategory, PresetSlot } from '@/types/l2';
import { ARCHIVE_CATEGORIES } from '@/lib/archiveCategories';

export type PresetDefaultScope = 'ALL' | Exclude<ArchiveCategory, 'GROUP'>;
export const PRESET_DEFAULT_SCOPES = [{ id: 'ALL', label: '전체 기본' }, ...ARCHIVE_CATEGORIES] as const;

export function defaultPresetFor(category: ArchiveCategory, presets: readonly PresetSlot[], fallbackId: string): PresetSlot {
  if (category === 'GROUP') return presets.find(slot => slot.layout === 'curation') || presets[0];
  return presets.find(slot => slot.layout !== 'curation' && slot.defaultFor?.includes(category))
    || presets.find(slot => slot.id === fallbackId && slot.layout !== 'curation')
    || presets.find(slot => slot.layout !== 'curation') || presets[0];
}

/** Resolve duplicate legacy assignments deterministically; custom order is preserved. */
export function normalizeCategoryDefaults(presets: PresetSlot[]): PresetSlot[] {
  const seen = new Set<string>();
  return presets.map(slot => {
    if (!slot.defaultFor) return slot;
    const defaultFor = slot.layout === 'curation' ? [] : slot.defaultFor.filter(category => {
      if (seen.has(category)) return false;
      seen.add(category); return true;
    });
    return { ...slot, defaultFor };
  });
}

/** Only rearranges existing entries; missing/stale IDs cannot delete or duplicate presets. */
export function reorderPresets(presets: readonly PresetSlot[], ids: readonly string[]): PresetSlot[] {
  const rank = new Map([...new Set(ids)].map((id, index) => [id, index]));
  return [...presets].sort((a, b) => (rank.get(a.id) ?? ids.length) - (rank.get(b.id) ?? ids.length));
}

export function assignDefault(presets: PresetSlot[], target: PresetSlot, scope: PresetDefaultScope): PresetSlot[] {
  if (target.layout === 'curation') throw new Error('LIST는 그룹 전용 프리셋이에요.');
  const previous = presets.find(slot => slot.id === target.id);
  const committed = { ...target, ...(previous?.defaultFor ? { defaultFor: [...previous.defaultFor] } : {}) };
  const slots = presets.some(slot => slot.id === target.id) ? presets.map(slot => slot.id === target.id ? committed : slot) : [...presets, committed];
  const assigned = scope === 'ALL' ? slots : slots.map(slot => ({ ...slot, defaultFor: [...(slot.defaultFor || []).filter(category => category !== scope), ...(slot.id === target.id ? [scope] : [])] }));
  // Setting a default brings it to the front once. Subsequent manual dragging wins.
  return reorderPresets(assigned, [target.id, ...assigned.map(slot => slot.id)]);
}
