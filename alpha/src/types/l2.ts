import type { LogMedia } from '@/lib/media';
// ART remains the persisted ID for 장소 so existing records keep their category.
export type ArchiveCategory = 'DINING' | 'CINEMA' | 'ART' | 'OTHER' | 'GROUP';

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
  | 'broadside' // 11 SWISS Typographic Poster (NO-PHOTO)
  | 'doodle' // 12 DOODLE NOTE (NO-PHOTO)
  | 'feed' // 13 MINI FEED (Photo)
  | 'photocard' // 14 POCKET PHOTO (Photo)
  | 'day' // 15 DAY PAGE (NO-PHOTO)
  | 'paint' // 16 PAINT BADLY (NO-PHOTO)
  | 'arch' // 17 SLOW WINDOW (Photo)
  | 'orbit' // 18 ORBIT NOTE (Photo)
  | 'duo' // 19 TWO CUTS (Photo)
  | 'margin'; // 20 OPEN MARGIN (Photo)

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
  occurredAt?: number | null;
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
  cropZoom?: number;
  photoFit?: 'contain' | 'cover';
  mapX: number;
  mapY: number;
  author?: string;
  cardAppearance?: CardAppearance;
  kind?: 'log' | 'group';
  memberIds?: string[];
  coordinates?: GeoPoint | null;
  media?: LogMedia | null;
}

export interface GeoPoint { lat: number; lng: number }

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
  showDecorations?: boolean;
  showNumber?: boolean;
  photoSaturation?: number;
  photoLightness?: number;
  photoBrightness?: number;
  /** Category defaults live with the preset JSON, so they sync without a schema change. */
  defaultFor?: Exclude<ArchiveCategory, 'GROUP'>[];
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
  /** Library deletion marker; saved card snapshots remain independent. */
  hidden?: boolean;
}

/** A record owns its appearance independently from later Studio edits. */
export interface CardAppearance {
  slot: PresetSlot;
  skin: SkinTheme;
  authorName: string;
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
  source?: 'KAKAO' | 'NAVER' | 'TMDB' | 'LOCAL' | 'GOOGLE' | 'OSM';
  posterImg?: string;
  coordinates?: GeoPoint;
}

export interface PlaceInboxItem {
  id: string;
  title: string;
  address: string;
  addressShort: string;
  loc: string;
  lat: number;
  lng: number;
  googleMapsUrl: string;
  note?: string;
  category: ArchiveCategory;
  importedAt: number;
}

export interface L2DatabaseSchema {
  archives: ArchiveItem[];
  presetSlots: PresetSlot[];
  skins: Record<string, SkinTheme>;
  authorName: string;
  defaultPresetId?: string;
  updatedAt: string;
}
