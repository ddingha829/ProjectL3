import type { ArchiveCategory } from '@/types/l2';

export const ARCHIVE_CATEGORIES = [
  { id: 'DINING', label: '미식', icon: 'dining', hint: '음식, 카페, 한 잔의 기억' },
  { id: 'CINEMA', label: '영화', icon: 'cinema', hint: '영화와 상영관에서의 감상' },
  { id: 'ART', label: '장소', icon: 'place', hint: '전시, 공간, 여행지에서의 순간' },
  { id: 'OTHER', label: '기타', icon: 'other', hint: '분류에 얽매이지 않는 나만의 기록' },
] as const satisfies readonly { id: ArchiveCategory; label: string; icon: 'dining' | 'cinema' | 'place' | 'other'; hint: string }[];

export function isArchiveCategory(value: unknown): value is ArchiveCategory {
  return value === 'GROUP' || ARCHIVE_CATEGORIES.some(category => category.id === value);
}

export function getArchiveCategory(id: ArchiveCategory) {
  if (id === 'GROUP') return { id: 'GROUP', label: '그룹', icon: 'other', hint: '모아 둔 로그' } as const;
  return ARCHIVE_CATEGORIES.find(category => category.id === id) || ARCHIVE_CATEGORIES[3];
}
