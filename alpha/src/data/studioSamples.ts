import type { ArchiveItem } from '@/types/l2';

const common = { num: '01', date: '26.10.18', timestamp: 1792281600000, cropX: 50, cropY: 50, mapX: 50, mapY: 50, link: '', coordinates: null };

/** Fictional samples, deliberately separate from a user's records and initial demo data. */
export const STUDIO_PHOTO_SAMPLE: ArchiveItem = {
  ...common, id: 'studio-photo-sample', cat: 'DINING', sub: 'DINING · CAFE',
  title: '오후의 한 잔', loc: '창가 카페', addressShort: '창가 카페 · 가상 예시', fullAddress: '가상 카페 예시',
  score: '4.5', quote: '따뜻한 라테와 피낭시에. 잠깐 쉬어 가기 좋은 오후였다.',
  good: '고소한 라테와 촉촉한 버터 피낭시에', bad: '창가 자리는 두 테이블뿐', note: '책 한 권과 함께 보내고 싶은 시간',
  img: '/images/studio-cafe.png', hasPhoto: true, author: '나의 기록',
};

export const STUDIO_TEXT_SAMPLE: ArchiveItem = {
  ...common, id: 'studio-text-sample', cat: 'OTHER', sub: 'OTHER · DAILY',
  title: '천천히 걸은 저녁', loc: '', addressShort: '', fullAddress: '', score: '',
  quote: '익숙한 길을 조금 천천히 걸었다. 이어폰을 빼니 바람 소리가 들렸다. 평범해서 오래 기억하고 싶은 하루.',
  good: '서두르지 않고 걸을 수 있었던 시간', bad: '', note: '다음에도 가끔은 한 정거장 먼저 내리기',
  img: '', hasPhoto: false, author: '나의 기록',
};
