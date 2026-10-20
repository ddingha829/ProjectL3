import type { PresetSlot } from '@/types/l2';

export type PhotoTone = Pick<PresetSlot, 'photoSaturation' | 'photoLightness' | 'photoBrightness'>;
const bounded = (value: unknown, fallback: number, min: number, max: number) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
export function photoTone(value: PhotoTone) {
  return { photoSaturation: bounded(value.photoSaturation, 100, 0, 200), photoLightness: bounded(value.photoLightness, 0, -50, 50), photoBrightness: bounded(value.photoBrightness, 100, 50, 150) };
}
/** Lightness blends toward white/black; brightness changes exposure independently. */
export function photoToneFilter(value: PhotoTone, base = ''): string | undefined {
  const tone = photoTone(value), light = tone.photoLightness / 100;
  const parts = [base];
  if (tone.photoSaturation !== 100) parts.push(`saturate(${tone.photoSaturation / 100})`);
  if (light > 0) parts.push(`contrast(${(1 - light) / (1 + light)}) brightness(${1 + light})`);
  if (light < 0) parts.push(`brightness(${1 + light})`);
  if (tone.photoBrightness !== 100) parts.push(`brightness(${tone.photoBrightness / 100})`);
  return parts.filter(Boolean).join(' ') || undefined;
}
