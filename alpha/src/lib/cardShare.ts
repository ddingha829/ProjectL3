import type { ArchiveItem } from '@/types/l2';

type ShareableLog = Pick<ArchiveItem, 'link' | 'coordinates'>;

/** Share an actual selected map link or recorded coordinates; never infer from memo text. */
export function googleMapShareUrl(item: ShareableLog): string | null {
  try {
    const url = new URL(item.link);
    const host = url.hostname.toLowerCase();
    const mapsHost = /^(?:maps\.)google\.(?:com|co\.kr)$/.test(host);
    const googleMaps = /^(?:www\.)?google\.(?:com|co\.kr)$/.test(host) && /^\/maps(?:\/|$)/.test(url.pathname);
    const shortMaps = host === 'maps.app.goo.gl' || host === 'goo.gl' && /^\/maps\//.test(url.pathname);
    if (url.protocol === 'https:' && !url.username && !url.password && (mapsHost || googleMaps || shortMaps)) return url.href;
  } catch { /* Coordinates can still produce a real map link. */ }
  const point = item.coordinates;
  if (point && Number.isFinite(point.lat) && Number.isFinite(point.lng) && Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${point.lat},${point.lng}`)}`;
  }
  return null;
}

export function cardShareData(item: ShareableLog, file: File): ShareData {
  const mapUrl = googleMapShareUrl(item);
  // Native targets receive the image and, only when linked, the map URL as text.
  // Do not include the log title, quote, an app share page, or any other memo text.
  return { files: [file], ...(mapUrl ? { text: mapUrl } : {}) };
}
