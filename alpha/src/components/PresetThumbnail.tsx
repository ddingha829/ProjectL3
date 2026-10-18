'use client';
import type { ArchiveItem, PresetSlot, SkinTheme } from '@/types/l2';
import { STUDIO_PHOTO_SAMPLE, STUDIO_TEXT_SAMPLE } from '@/data/studioSamples';
import { getCardLayout, resolveEffectiveSlot } from '@/lib/cardLayouts';
import CardStage from './CardStage';
import FitCard from './FitCard';

export default function PresetThumbnail({preset,skin,item,authorName}:{preset:PresetSlot;skin:SkinTheme;item?:ArchiveItem;authorName:string}) {
  const sample=item||{...(getCardLayout(preset.layout).isNoPhoto?STUDIO_TEXT_SAMPLE:STUDIO_PHOTO_SAMPLE),...(preset.layout==='curation'?{cat:'GROUP' as const,title:'좋아하는 오후',kind:'group' as const}:{} )};
  const slot=resolveEffectiveSlot(sample,preset);
  return <div className="preset-thumbnail" aria-hidden="true" inert><FitCard ratio={slot.ratio}><CardStage item={sample} slot={slot} skin={skin} authorName={authorName} selectedItems={sample.cat==='GROUP'?[STUDIO_PHOTO_SAMPLE,STUDIO_TEXT_SAMPLE]:[]} curationTitle={sample.title}/></FitCard></div>;
}
