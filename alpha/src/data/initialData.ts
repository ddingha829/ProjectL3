import { ArchiveItem, MapApiPlace, PresetSlot, SkinTheme } from '@/types/l2';

export const INITIAL_ARCHIVES: ArchiveItem[] = [
  {
    id: 'k1',
    num: '01',
    cat: 'DINING',
    sub: 'DINING · SUNCHEON',
    title: '작은부엌',
    loc: 'SUNCHEON',
    addressShort: '전남 순천시 향교동',
    fullAddress: '전라남도 순천시 향교길 39',
    date: '26.10.14',
    timestamp: 20261014,
    score: '4.5',
    quote:
      '‘진짜’ 전라도 한식 한상차림을 먹을 수 있는 현지인 맛집. 수제 떡갈비 육즙과 계란찜이 일품이지만 주말 점심엔 웨이팅이 있으니 오픈런을 추천합니다.',
    good: '수제 떡갈비 육즙과 보들보들한 계란찜, 7종 찬의 완벽한 조화',
    bad: '주말 점심 피크타임 웨이팅 30분 이상',
    note: '주말 피크타임 웨이팅 필수 · 오픈런 권장',
    link: 'https://map.kakao.com/link/search/순천작은부엌',
    img: '/images/korean.jpg',
    cropX: 50,
    cropY: 50,
    mapX: 32,
    mapY: 72,
    author: '여수피카츄',
  },
  {
    id: 'a1',
    num: '02',
    cat: 'DINING',
    sub: 'DINING · SEONGSU',
    title: '우디집 성수',
    loc: 'SEONGSU',
    addressShort: '서울 성동구 성수동',
    fullAddress: '서울 성동구 둘레7길 15 2층',
    date: '26.10.11',
    timestamp: 20261011,
    score: '4.8',
    quote:
      '성수동 골목 숨은 우드톤 와인바. 바질 들기름 파스타와 앰버 와인 페어링의 정점.',
    good: '통창 채광과 소믈리에의 정교한 내추럴 와인 큐레이션',
    bad: '예약 오픈 직후 마감 · 워크인 어려움',
    note: '2인석 위주라 단체보단 프라이빗 데이트에 최적',
    link: 'https://map.kakao.com/link/search/우디집성수',
    img: '/images/wine.jpg',
    cropX: 50,
    cropY: 50,
    mapX: 65,
    mapY: 38,
    author: '여수피카츄',
  },
  {
    id: 'a2',
    num: '03',
    cat: 'CINEMA',
    sub: 'CINEMA · FILM',
    title: 'THE SUBSTANCE',
    loc: 'DIRECTOR CORALIE FARGEAT',
    addressShort: '서울 용산구 한강로동',
    fullAddress: '감독 코랄리 파르자 · 데미 무어 주연',
    date: '26.10.04',
    timestamp: 20261004,
    score: '4.7',
    quote:
      '젊음이라는 욕망을 향해 폭주하는 광기의 미장센. 올해 가장 강렬한 극장 체험.',
    good: '데미 무어의 압도적 연기와 심장을 타격하는 사운드 디자인',
    bad: '후반 20분 바디호러 수위가 매우 높음',
    note: '돌비 애트모스 또는 사운드 특화관 관람 필수',
    link: 'https://www.themoviedb.org/movie/933260-the-substance',
    img: '/images/cinema.jpg',
    cropX: 50,
    cropY: 50,
    mapX: 42,
    mapY: 54,
    author: '여수피카츄',
  },
  {
    id: 'a3',
    num: '04',
    cat: 'ART',
    sub: 'EXHIBITION · LEEUM',
    title: 'VOICES',
    loc: 'LEEUM MUSEUM',
    addressShort: '서울 용산구 한남동',
    fullAddress: '서울 용산구 이태원로55길 60-16 리움미술관',
    date: '26.09.28',
    timestamp: 20260928,
    score: '4.9',
    quote:
      '전시장이 살아 숨 쉬는 유기체처럼 반응하는 공감각적 현대미술의 끝판왕.',
    good: '거대한 발광 구체와 공간 사운드가 만드는 초현실적 몰입감',
    bad: '주말 오후 관람객 밀집',
    note: '리움 공식 사이트 사전 예매 필수 · 평일 오후 추천',
    link: 'https://www.leeumhoam.org/',
    img: '/images/museum.jpg',
    cropX: 50,
    cropY: 50,
    mapX: 48,
    mapY: 34,
    author: '여수피카츄',
  },
];

export const PRESET_SLOTS: PresetSlot[] = [
  {
    id: '01',
    name: 'KAKAO',
    ratio: '3:4',
    skinId: 'signal',
    layout: 'spec',
    showScore: true,
    showProsCons: true,
    showLocation: true,
    showSignature: true,
    showGrain: false,
  },
  {
    id: '02',
    name: 'INSTA',
    ratio: '1:1',
    skinId: 'noir',
    layout: 'cover',
    showScore: true,
    showProsCons: false,
    showLocation: true,
    showSignature: true,
    showGrain: false,
  },
  {
    id: '03',
    name: 'TICKET',
    ratio: '9:16',
    skinId: 'signal',
    layout: 'ticket',
    showScore: true,
    showProsCons: true,
    showLocation: true,
    showSignature: true,
    showGrain: false,
  },
  {
    id: '04',
    name: 'LIST',
    ratio: '3:4',
    skinId: 'paper',
    layout: 'curation',
    showScore: true,
    showProsCons: true,
    showLocation: true,
    showSignature: true,
    showGrain: true,
  },
  { id: '05', name: 'TYPE', ratio: '3:4', skinId: 'paper', layout: 'broadside', showScore: true, showProsCons: true, showLocation: true, showSignature: true, showGrain: false },
  { id: '06', name: 'POSTER', ratio: '3:4', skinId: 'noir', layout: 'cover', showScore: true, showProsCons: false, showLocation: true, showSignature: true, showGrain: false },
];

export const INITIAL_SKINS: Record<string, SkinTheme> = {
  signal: {
    id: 'signal', name: 'L2 SIGNAL', bg: '#E12D00', text: '#FFFFFF', sub: '#FFFFFF',
    headerBg: '#E12D00', headerText: '#FFFFFF', border: '#F57B5F', accent: '#000000', chipBg: '#E12D00',
  },
  noir: {
    id: 'noir', name: 'AFTER DARK', bg: '#0B0B0C', text: '#FFFFFF', sub: '#C7C5C0',
    headerBg: '#FF4500', headerText: '#FFFFFF', border: '#3A3836', accent: '#FF4500', chipBg: '#19191A',
  },
  paper: {
    id: 'paper',
    name: 'SWISS PAPER',
    bg: '#F6F3EC',
    headerBg: '#FF3B00',
    headerText: '#FFFFFF',
    text: '#0E0E0E',
    sub: '#5A5751',
    border: '#DDD7CC',
    accent: '#FF3B00',
    chipBg: '#EDE7DC',
  },
  obsidian: {
    id: 'obsidian',
    name: 'OBSIDIAN NOIR',
    bg: '#0E0E11',
    headerBg: '#16161A',
    headerText: '#F5F4F0',
    text: '#F5F4F0',
    sub: 'rgba(245,244,240,0.62)',
    border: 'rgba(245,244,240,0.16)',
    accent: '#FF3B00',
    chipBg: 'rgba(255,255,255,0.06)',
  },
  crimson: {
    id: 'crimson',
    name: 'VERMILION POSTER',
    bg: '#FF3B00',
    headerBg: '#0E0E0E',
    headerText: '#FFFFFF',
    text: '#FFFFFF',
    sub: '#FFE4DC',
    border: '#FF6A3D',
    accent: '#0E0E0E',
    chipBg: '#E03200',
  },
  sage: {
    id: 'sage',
    name: 'FOREST SAGE',
    bg: '#102118',
    headerBg: '#E6F4EA',
    headerText: '#102118',
    text: '#E6F4EA',
    sub: '#8AB09B',
    border: '#203E2E',
    accent: '#3CE68A',
    chipBg: '#172E22',
  },
  cobalt: {
    id: 'cobalt',
    name: 'ROYAL COBALT',
    bg: '#091326',
    headerBg: '#4D8BFF',
    headerText: '#FFFFFF',
    text: '#EEF4FF',
    sub: 'rgba(238,244,255,0.65)',
    border: 'rgba(120,170,255,0.24)',
    accent: '#4D8BFF',
    chipBg: 'rgba(77,139,255,0.14)',
  },
};

export const MAP_API_PLACES: MapApiPlace[] = [
  {
    id: 'p1',
    name: '작은부엌',
    short: '전남 순천시 향교동',
    fullAddress: '전라남도 순천시 향교길 39',
    loc: 'SUNCHEON',
    category: 'DINING',
    link: 'https://map.kakao.com/link/search/순천작은부엌',
    x: 32,
    y: 72,
    source: 'KAKAO',
  },
  {
    id: 'p2',
    name: '우디집 성수',
    short: '서울 성동구 성수동',
    fullAddress: '서울 성동구 둘레7길 15 2층',
    loc: 'SEONGSU',
    category: 'DINING',
    link: 'https://map.kakao.com/link/search/우디집성수',
    x: 65,
    y: 38,
    source: 'KAKAO',
  },
  {
    id: 'p3',
    name: '야키토리 묵 성수',
    short: '서울 성동구 성수동',
    fullAddress: '서울 성동구 상원1길 35-1',
    loc: 'SEONGSU',
    category: 'DINING',
    link: 'https://map.naver.com/p/search/야키토리묵',
    x: 58,
    y: 42,
    source: 'NAVER',
  },
  {
    id: 'p4',
    name: '리움미술관 (VOICES)',
    short: '서울 용산구 한남동',
    fullAddress: '서울 용산구 이태원로55길 60-16',
    loc: 'LEEUM MUSEUM',
    category: 'ART',
    link: 'https://www.leeumhoam.org/',
    x: 48,
    y: 34,
    source: 'KAKAO',
  },
  {
    id: 'p5',
    name: 'CGV 용산아이파크몰 IMAX',
    short: '서울 용산구 한강로동',
    fullAddress: '서울 용산구 한강대로23길 55 6층',
    loc: 'CGV YONGSAN',
    category: 'CINEMA',
    link: 'https://map.kakao.com/link/search/CGV용산아이파크몰',
    x: 42,
    y: 54,
    source: 'KAKAO',
  },
  {
    id: 'p6',
    name: '서초 면서초 본점',
    short: '서울 서초구 서초동',
    fullAddress: '서울 서초구 서초대로 318',
    loc: 'SEOCHO',
    category: 'DINING',
    link: 'https://map.kakao.com/link/search/서초동맛집',
    x: 51,
    y: 66,
    source: 'KAKAO',
  },
  {
    id: 'p7',
    name: '오스테리아 오르조 한남',
    short: '서울 용산구 한남동',
    fullAddress: '서울 용산구 한남대로20길 47',
    loc: 'HANNAM',
    category: 'DINING',
    link: 'https://map.kakao.com/link/search/오스테리아오르조',
    x: 46,
    y: 49,
    source: 'KAKAO',
  },
  {
    id: 'p8',
    name: 'THE SUBSTANCE (서브스턴스)',
    short: '감독 코랄리 파르자',
    fullAddress: '감독 코랄리 파르자 · 데미 무어 주연',
    loc: 'CINEMA · FILM',
    category: 'CINEMA',
    link: 'https://www.themoviedb.org/movie/933260-the-substance',
    x: 40,
    y: 50,
    source: 'TMDB',
  },
  {
    id: 'p9',
    name: 'DUNE: PART TWO (듄: 파트 2)',
    short: '감독 드니 빌뇌브',
    fullAddress: '감독 드니 빌뇌브 · 티모시 샬라메 주연',
    loc: 'CINEMA · IMAX',
    category: 'CINEMA',
    link: 'https://www.themoviedb.org/movie/693134-dune-part-two',
    x: 36,
    y: 48,
    source: 'TMDB',
  },
];

export function extractGoodFromText(quote: string, title: string): string {
  const cleaned = quote.trim();
  if (!cleaned) return `${title}의 인상적인 시그니처 경험과 분위기`;

  const contrastSplit = cleaned
    .split(/이지만|지만|다만|아쉬운|반면|[.!?\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (contrastSplit.length > 0) {
    const first = contrastSplit[0];
    return first.length > 44 ? `${first.slice(0, 44)}...` : first;
  }
  return `${title} 시그니처 경험 & 완성도`;
}

export function extractNoteFromText(quote: string, loc: string): string {
  const cleaned = quote.trim();
  const parts = cleaned
    .split(/이지만|지만|다만|[.!?\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (parts.length > 1) {
    const second = parts[parts.length - 1];
    return second.length > 44 ? `${second.slice(0, 44)}...` : second;
  }
  return `${loc} 방문 전 사전 예약 및 피크타임 확인 권장`;
}

export function extractBadFromText(quote: string): string {
  const match = quote.match(
    /(웨이팅[^.!?\n]*|주차[^.!?\n]*|비싼[^.!?\n]*|아쉬운[^.!?\n]*|복잡[^.!?\n]*)/
  );
  return match ? match[1].trim() : '';
}
