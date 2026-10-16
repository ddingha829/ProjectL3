export type ArchiveCategory = 'DINING' | 'CINEMA' | 'ART';

export type ArchiveViewMode = 'poster' | 'index' | 'map';

export type SortOrder = 'desc' | 'asc';

export type CardLayoutType =
  | 'spec' // 01 KAKAO Editorial Review (Photo)
  | 'cover' // 02 INSTA Full Bleed (Photo)
  | 'ticket' // 03 TICKET Admission Stub (Photo)
  | 'curation' // 04 LIST Curated Picks (Photo)
  | 'receipt' // 05 BISTRO Thermal Receipt (Photo)
  | 'polaroid' // 06 35MM Contact Sheet (Photo)
  | 'magazine' // 07 MONOCLE Editorial Spread (Photo)
  | 'passport' // 08 TRAVEL Passport & Visa (NO-PHOTO)
  | 'vinyl' // 09 VINYL LP Sleeve & Liner (NO-PHOTO)
  | 'library' // 10 LIBRARY Index Catalog Card (NO-PHOTO)
  | 'broadside'; // 11 SWISS Typographic Poster (NO-PHOTO)

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
  hasPhoto?: boolean;
  cropX: number;
  cropY: number;
  mapX: number;
  mapY: number;
  author?: string;
}

export interface PresetSlot {
  id: string;
  name: string;
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
