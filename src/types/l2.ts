export type ArchiveCategory = 'DINING' | 'CINEMA' | 'ART';

export type ArchiveViewMode = 'poster' | 'index' | 'map';

export type SortOrder = 'desc' | 'asc';

export type CardLayoutType = 'spec' | 'cover' | 'ticket' | 'curation';

export type OptionRowKey =
  | 'address'
  | 'score'
  | 'good'
  | 'bad'
  | 'note'
  | 'cat';

export interface ArchiveItem {
  id: string;
  num: string;
  cat: ArchiveCategory;
  sub: string;
  title: string;
  loc: string;
  addressShort: string;
  fullAddress?: string;
  date: string;
  timestamp: number;
  score: string;
  quote: string;
  good: string;
  bad: string;
  note: string;
  link: string;
  img: string;
  cropX: number;
  cropY: number;
  mapX: number;
  mapY: number;
  author?: string;
}

export interface PresetSlot {
  id: string;
  name: 'KAKAO' | 'INSTA' | 'TICKET' | 'LIST';
  ratio: '3:4' | '1:1' | '9:16';
  skinId: string;
  layout: CardLayoutType;
  showScore?: boolean;
  showProsCons?: boolean;
  showLocation?: boolean;
  showSignature?: boolean;
  showGrain?: boolean;
}

export interface SkinTheme {
  id: string;
  name: string;
  bg: string;
  text: string;
  sub: string;
  border: string;
  accent: string;
  chipBg: string;
  headerBg?: string;
  headerText?: string;
}

export interface MapApiPlace {
  id?: string;
  name: string;
  short: string;
  fullAddress?: string;
  loc: string;
  category?: ArchiveCategory;
  link: string;
  x: number;
  y: number;
  source?: 'KAKAO' | 'NAVER' | 'TMDB' | 'LOCAL';
  posterImg?: string;
}

export interface L2DatabaseSchema {
  archives: ArchiveItem[];
  presetSlots: PresetSlot[];
  skins: Record<string, SkinTheme>;
  authorName: string;
  updatedAt: string;
}
