import type { CardAppearance, PresetSlot, SkinTheme } from '@/types/l2';
import { photoTone } from './photoTone';

const elements=['showScore','showProsCons','showLocation','showSignature','showGrain','showDecorations','showNumber'] as const;
/** Compare rendered settings, independent of property order and default assignments. */
export function cardStyleKey(slot:PresetSlot,skin:SkinTheme):string {
  return JSON.stringify([slot.layout,slot.ratio,slot.skinId,...elements.map(key=>slot[key]!==false),...Object.values(photoTone(slot)),skin.bg,skin.text,skin.sub,skin.border,skin.accent,skin.chipBg,skin.headerBg||skin.bg,skin.headerText||skin.text]);
}
export function sameCardAppearance(a:CardAppearance,b:CardAppearance):boolean {
  return a.slot.id===b.slot.id&&a.authorName===b.authorName&&cardStyleKey(a.slot,a.skin)===cardStyleKey(b.slot,b.skin);
}
