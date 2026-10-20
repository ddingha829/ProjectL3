import type { ArchiveCategory, ArchiveItem } from '@/types/l2';
import { isUuid, newId } from './util';
import { isArchiveCategory } from '@/lib/archiveCategories';
import { normalizeCardAppearance } from '@/lib/cardAppearance';
import {photoCrop} from '@/lib/photoCrop';
import { isGeoPoint } from '@/lib/mapLocations';
import { normalizeLogMedia } from '@/lib/media';

function text(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value.trim() : fallback;
}
function position(value: unknown, fallback = 50): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback;
}

/** Validates input without converting placeholders into experience data. */
export function normalizeLogInput(raw: unknown, existing?: ArchiveItem): ArchiveItem {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('올바른 기록을 보내주세요.');
  const input = raw as Record<string, unknown>;
  const body = { ...existing, ...input };
  if (!isArchiveCategory(body.cat)) throw new Error('기록의 분류를 선택해주세요.');
  if (input.id !== undefined && !isUuid(input.id)) throw new Error('기록 ID가 올바르지 않습니다.');
  const quote = text(body.quote);
  const image = body.hasPhoto === false ? '' : text(body.img);
  const title = text(body.title) || quote.split('\n')[0].slice(0, 60) || (image ? '사진 기록' : '');
  if (!title && !quote && !image) throw new Error('한 줄 메모나 사진을 먼저 남겨주세요.');
  if (title.length > 200 || quote.length > 10000) throw new Error('제목은 200자, 메모는 10,000자까지 저장할 수 있습니다.');
  const score = text(body.score);
  if (score && (!Number.isFinite(Number(score)) || Number(score) < 0 || Number(score) > 5)) throw new Error('평점은 0~5 사이로 입력해주세요.');
  const timestamp = existing?.timestamp || (typeof body.timestamp === 'number' && Number.isFinite(body.timestamp) ? body.timestamp : Date.now());
  const date = existing?.date || text(body.date) || new Date(timestamp).toLocaleDateString('sv-SE', { timeZone: 'Asia/Seoul' }).slice(2).replaceAll('-', '.');
  const cat = body.cat as ArchiveCategory;
  const loc = text(body.loc);
  if (body.coordinates !== undefined && body.coordinates !== null && !isGeoPoint(body.coordinates)) throw new Error('장소의 지도 좌표를 확인해주세요.');
  const grouped = body.kind === 'group' || cat === 'GROUP';
  let memberIds: string[] | undefined;
  if (grouped) {
    if (cat !== 'GROUP' || !Array.isArray(body.memberIds) || body.memberIds.length < 1 || body.memberIds.length > 20 || body.memberIds.some(id => !isUuid(id) || id === body.id)) throw new Error('그룹에는 로그를 1~20개 담아주세요.');
    memberIds = [...new Set(body.memberIds as string[])];
  } else if (body.memberIds !== undefined) throw new Error('일반 로그에는 그룹 항목을 추가할 수 없습니다.');
  const cardAppearance = body.cardAppearance === undefined ? undefined : normalizeCardAppearance(body.cardAppearance, { img: image, hasPhoto: Boolean(image), cat });
  if (body.cardAppearance !== undefined && !cardAppearance) throw new Error('카드 스타일 정보를 확인해주세요.');
  return {
    id: existing?.id || (isUuid(body.id) ? body.id : newId()), num: existing?.num || '', cat,
    sub: loc ? `${cat} · ${loc}` : cat, title, loc,
    addressShort: text(body.addressShort), fullAddress: text(body.fullAddress), date, timestamp,
    score, quote, good: text(body.good), bad: text(body.bad), note: text(body.note),
    link: text(body.link), img: image, hasPhoto: Boolean(image),
    ...photoCrop(body as Partial<ArchiveItem>), mapX: position(body.mapX), mapY: position(body.mapY), author: text(body.author),
    ...(cardAppearance ? { cardAppearance } : {}),
    ...(normalizeLogMedia(body.media) ? { media: normalizeLogMedia(body.media) } : {}),
    ...(grouped ? { kind: 'group' as const, memberIds } : {}),
    ...(isGeoPoint(body.coordinates) ? { coordinates: { lat: body.coordinates.lat, lng: body.coordinates.lng } } : {}),
  };
}
