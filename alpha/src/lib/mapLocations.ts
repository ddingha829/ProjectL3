import type { ArchiveItem, GeoPoint } from '@/types/l2';

export function isGeoPoint(value: unknown): value is GeoPoint {
  if (!value || typeof value !== 'object') return false;
  const point = value as Partial<GeoPoint>;
  return typeof point.lat === 'number' && Number.isFinite(point.lat) && point.lat >= -90 && point.lat <= 90 &&
    typeof point.lng === 'number' && Number.isFinite(point.lng) && point.lng >= -180 && point.lng <= 180;
}

export function hasLinkedPlace(item: ArchiveItem): boolean {
  if (item.cat === 'GROUP') return false;
  if (isGeoPoint(item.coordinates)) return true;
  // A movie's synopsis/director is not a venue address.
  if (item.link.includes('themoviedb.org')) return false;
  return Boolean(item.fullAddress || item.addressShort || item.loc);
}

