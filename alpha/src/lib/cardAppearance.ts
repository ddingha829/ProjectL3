import type { ArchiveItem, CardAppearance, PresetSlot, SkinTheme } from '@/types/l2';
import { DEFAULT_PRESET_ID, INITIAL_SKINS, PRESET_SLOTS } from '@/data/initialData';
import { CARD_LAYOUTS, resolveEffectiveSlot } from '@/lib/cardLayouts';
import { normalizeSkinTheme } from '@/lib/skinValidation';
import { fallbackSkinId } from '@/lib/skinLibrary';
import { photoTone } from '@/lib/photoTone';

const elementKeys = ['showScore', 'showProsCons', 'showLocation', 'showSignature', 'showGrain', 'showDecorations', 'showNumber'] as const;
const object = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const label = (value: string, maximum = 64) => value.replace(/[\u0000-\u001f]/g, '').slice(0, maximum);

export function normalizePresetSlot(value: unknown): PresetSlot | undefined {
  if (!object(value) || typeof value.id !== 'string' || !value.id.trim() || typeof value.skinId !== 'string' || !value.skinId.trim()) return undefined;
  const layout = CARD_LAYOUTS.find(entry => entry.id === value.layout);
  if (!layout) return undefined;
  const ratio = layout.supportedRatios.find(entry => entry === value.ratio) || layout.ratio;
  const slot: PresetSlot = { id: label(value.id), name: typeof value.name === 'string' ? label(value.name) : layout.name, skinId: label(value.skinId), layout: layout.id, ratio };
  for (const key of elementKeys) if (typeof value[key] === 'boolean') slot[key] = value[key];
  const tones = photoTone(value);
  for (const key of ['photoSaturation', 'photoLightness', 'photoBrightness'] as const) if (typeof value[key] === 'number') slot[key] = tones[key];
  if (layout.id !== 'curation' && Array.isArray(value.defaultFor)) slot.defaultFor = [...new Set(value.defaultFor.filter((category): category is Exclude<ArchiveItem['cat'], 'GROUP'> => ['DINING', 'CINEMA', 'ART', 'OTHER'].includes(category)))];
  return slot;
}

export function normalizeDefaultPresetId(value: unknown, slots: readonly PresetSlot[] = PRESET_SLOTS): string {
  if (typeof value === 'string' && slots.some(slot => slot.id === value && slot.layout !== 'curation')) return value;
  return slots.find(slot => slot.id === DEFAULT_PRESET_ID && slot.layout !== 'curation')?.id || slots.find(slot => slot.layout !== 'curation')?.id || DEFAULT_PRESET_ID;
}

export function cloneCardAppearance(appearance: CardAppearance): CardAppearance {
  return { slot: { ...appearance.slot, ...(appearance.slot.defaultFor ? { defaultFor: [...appearance.slot.defaultFor] } : {}) }, skin: { ...appearance.skin }, authorName: appearance.authorName };
}

/** Invalid structures are rejected; CSS values are sanitized and made readable. */
export function normalizeCardAppearance(value: unknown, item?: Pick<ArchiveItem, 'hasPhoto' | 'img'> & Partial<Pick<ArchiveItem, 'cat'>>): CardAppearance | undefined {
  if (!object(value) || !object(value.skin) || typeof value.authorName !== 'string') return undefined;
  const preferred = normalizePresetSlot(value.slot);
  const rawSkin = value.skin;
  if (!preferred || typeof rawSkin.id !== 'string' || !rawSkin.id.trim() || typeof rawSkin.name !== 'string' || typeof rawSkin.bg !== 'string' || typeof rawSkin.text !== 'string' || typeof rawSkin.accent !== 'string') return undefined;
  const skin = normalizeSkinTheme({ ...rawSkin, id: label(rawSkin.id), name: label(rawSkin.name, 32) } as Partial<SkinTheme>);
  const slot = item ? resolveEffectiveSlot(item, preferred) : preferred;
  return { slot: { ...slot, skinId: skin.id }, skin: { ...skin }, authorName: label(value.authorName) };
}

export function createCardAppearance(item: Pick<ArchiveItem, 'hasPhoto' | 'img'> & Partial<Pick<ArchiveItem, 'cat'>>, preferred: PresetSlot, skins: Record<string, SkinTheme>, authorName: string): CardAppearance {
  const safeSlot = normalizePresetSlot(preferred) || { ...PRESET_SLOTS[0] };
  const sourceSkin = skins[safeSlot.skinId] && !skins[safeSlot.skinId].hidden ? skins[safeSlot.skinId] : skins[fallbackSkinId(skins)] || INITIAL_SKINS.paper;
  return normalizeCardAppearance({ slot: safeSlot, skin: sourceSkin, authorName }, item)!;
}
