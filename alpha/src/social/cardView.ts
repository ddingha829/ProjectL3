import {PRESET_SLOTS,INITIAL_SKINS} from '@/data/initialData';
import type {LabLog} from './model';
import type {PresetSlot} from '@/types/l2';

/** Shared by the actual grid card and its detail, so choosing a design never
 * substitutes an unrelated social-post layout in the collection. */
export function cardView(log:LabLog){
 const skinId=log.design==='polaroid'?'paper':log.design==='ticket'||log.image||log.authorId==='me'?'noir':'paper';
 const slot:PresetSlot={...(PRESET_SLOTS.find(p=>p.layout===log.design)||PRESET_SLOTS[1]),layout:log.design,ratio:log.design==='ticket'?'9:16':'3:4',skinId,showScore:false,showGrain:false};
 return {slot,skin:INITIAL_SKINS[skinId]||INITIAL_SKINS.oat};
}
