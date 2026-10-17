import type { ArchiveItem, CardLayoutType, PresetSlot } from '@/types/l2';

export type CardRatio = PresetSlot['ratio'];
export type CardElement = 'showScore' | 'showProsCons' | 'showLocation' | 'showSignature' | 'showGrain' | 'showDecorations';

export interface CardLayoutDefinition {
  id: CardLayoutType;
  name: string;
  sub: string;
  ratio: CardRatio;
  isNoPhoto: boolean;
  supportedRatios: readonly CardRatio[];
  supportedElements: readonly CardElement[];
}

const ratios: readonly CardRatio[] = ['3:4', '1:1', '9:16'];
const elements: readonly CardElement[] = ['showScore', 'showProsCons', 'showLocation', 'showSignature', 'showGrain', 'showDecorations'];
const metadataElements = elements.filter((element) => element !== 'showProsCons');

export const CARD_LAYOUTS: readonly CardLayoutDefinition[] = [
  { id: 'spec', name: 'KAKAO', sub: '에디토리얼 리뷰', ratio: '3:4', isNoPhoto: false, supportedRatios: ratios, supportedElements: elements },
  { id: 'cover', name: 'INSTA', sub: '풀블리드 포스터', ratio: '1:1', isNoPhoto: false, supportedRatios: ratios, supportedElements: metadataElements },
  { id: 'ticket', name: 'TICKET', sub: '입장권 티켓 스텁', ratio: '9:16', isNoPhoto: false, supportedRatios: ratios, supportedElements: elements },
  { id: 'curation', name: 'LIST', sub: '멀티 큐레이션', ratio: '3:4', isNoPhoto: false, supportedRatios: ratios, supportedElements: metadataElements },
  { id: 'receipt', name: 'RECEIPT', sub: '비스트로 감열 영수증', ratio: '3:4', isNoPhoto: false, supportedRatios: ratios, supportedElements: elements },
  { id: 'polaroid', name: 'POLAROID', sub: '35mm 필름 콘택트', ratio: '3:4', isNoPhoto: false, supportedRatios: ratios, supportedElements: elements },
  { id: 'magazine', name: 'MAGAZINE', sub: '매거진 커버', ratio: '3:4', isNoPhoto: false, supportedRatios: ratios, supportedElements: elements },
  { id: 'passport', name: 'PASSPORT', sub: '여권 비자 스탬프', ratio: '3:4', isNoPhoto: true, supportedRatios: ratios, supportedElements: metadataElements },
  { id: 'vinyl', name: 'VINYL LP', sub: '33⅓ RPM 자켓·트랙', ratio: '1:1', isNoPhoto: true, supportedRatios: ratios, supportedElements: elements },
  { id: 'library', name: 'LIBRARY', sub: '도서관 대출 카드', ratio: '3:4', isNoPhoto: true, supportedRatios: ratios, supportedElements: metadataElements },
  { id: 'broadside', name: 'BROADSIDE', sub: '스위스 타이포 포스터', ratio: '3:4', isNoPhoto: true, supportedRatios: ratios, supportedElements: elements },
];

export function getCardLayout(id: CardLayoutType): CardLayoutDefinition {
  return CARD_LAYOUTS.find((layout) => layout.id === id) ?? CARD_LAYOUTS[0];
}

export function itemHasPhoto(item: Pick<ArchiveItem, 'hasPhoto' | 'img'>): boolean {
  return item.hasPhoto !== false && Boolean(item.img);
}

/** Derive a compatible view without changing the user's saved preset. */
export function resolveEffectiveSlot(item: Pick<ArchiveItem, 'hasPhoto' | 'img'> & Partial<Pick<ArchiveItem, 'cat'>>, preferred: PresetSlot): PresetSlot {
  const photo = itemHasPhoto(item);
  const preferredLayout = getCardLayout(preferred.layout);
  const layout = !photo && !preferredLayout.isNoPhoto && !(item.cat === 'GROUP' && preferred.layout === 'curation') ? getCardLayout('broadside') : preferredLayout;
  return {
    ...preferred,
    layout: layout.id,
    ratio: layout.supportedRatios.includes(preferred.ratio) ? preferred.ratio : layout.ratio,
  };
}

export const CARD_LOGICAL_WIDTH = 420;

export function getCardDimensions(ratio: CardRatio) {
  return { width: CARD_LOGICAL_WIDTH, height: ratio === '1:1' ? 420 : ratio === '9:16' ? 2240 / 3 : 560 };
}
