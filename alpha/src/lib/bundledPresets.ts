import { PRESET_SLOTS } from '@/data/initialData';
import type { PresetSlot } from '@/types/l2';

const legacy: PresetSlot[] = [
  { id:'01',name:'KAKAO',ratio:'3:4',skinId:'paper',layout:'spec',showScore:true,showProsCons:true,showLocation:true,showSignature:true,showGrain:true },
  { id:'02',name:'INSTA',ratio:'1:1',skinId:'obsidian',layout:'cover',showScore:true,showProsCons:false,showLocation:true,showSignature:true,showGrain:true },
  { id:'03',name:'TICKET',ratio:'9:16',skinId:'crimson',layout:'ticket',showScore:true,showProsCons:true,showLocation:true,showSignature:true,showGrain:true },
  { id:'04',name:'LIST',ratio:'3:4',skinId:'obsidian',layout:'curation',showScore:true,showProsCons:true,showLocation:true,showSignature:true,showGrain:true },
];

/** Upgrade untouched bundled presets, leaving every edited preset and record snapshot alone. */
export function upgradeBundledPresets(slots: PresetSlot[]): PresetSlot[] {
  let upgraded = 0;
  const next = slots.map(slot => {
    const original = legacy.find(entry => entry.id === slot.id);
    if (!original || slot.showDecorations === false || Object.keys(original).some(key => original[key as keyof PresetSlot] !== slot[key as keyof PresetSlot])) return slot;
    upgraded++;
    return { ...PRESET_SLOTS.find(entry => entry.id === slot.id)! };
  });
  if (upgraded === 4 && slots.length === 4) next.push(...PRESET_SLOTS.slice(4).map(slot => ({ ...slot })));
  return next;
}
