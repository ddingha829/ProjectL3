'use client';
import {useEffect,useRef,useState} from 'react';
import type { ArchiveItem, PresetSlot, SkinTheme } from '@/types/l2';
import { STUDIO_PHOTO_SAMPLE, STUDIO_TEXT_SAMPLE } from '@/data/studioSamples';
import { getCardLayout, resolveEffectiveSlot } from '@/lib/cardLayouts';
import CardStage from './CardStage';
import FitCard from './FitCard';

export default function PresetThumbnail({preset,skin,item,authorName,lazy=false,members}:{preset:PresetSlot;skin:SkinTheme;item?:ArchiveItem;authorName:string;lazy?:boolean;members?:ArchiveItem[]}) {
  const ref=useRef<HTMLDivElement>(null),[ready,setReady]=useState(!lazy);
  useEffect(()=>{if(ready||!ref.current)return;if(!('IntersectionObserver' in window)){setReady(true);return;}const observer=new IntersectionObserver(entries=>{if(entries.some(entry=>entry.isIntersecting)){setReady(true);observer.disconnect();}},{rootMargin:'100px'});observer.observe(ref.current);return()=>observer.disconnect();},[ready]);
  const sample=item||{...(getCardLayout(preset.layout).isNoPhoto?STUDIO_TEXT_SAMPLE:STUDIO_PHOTO_SAMPLE),...(preset.layout==='curation'?{cat:'GROUP' as const,title:'좋아하는 오후',kind:'group' as const}:{} )};
  const slot=resolveEffectiveSlot(sample,preset);
  return <div ref={ref} className="preset-thumbnail" aria-hidden="true" inert>{ready&&<FitCard ratio={slot.ratio}><CardStage item={sample} slot={slot} skin={skin} authorName={authorName} selectedItems={members||(sample.cat==='GROUP'?[STUDIO_PHOTO_SAMPLE,STUDIO_TEXT_SAMPLE]:[])} curationTitle={sample.title}/></FitCard>}</div>;
}
