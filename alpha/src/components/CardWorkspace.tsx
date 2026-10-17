'use client';
import { useState, type RefObject } from 'react';
import { Download, Share2, PencilLine, LoaderCircle, Layers } from 'lucide-react';
import type { ArchiveItem, CardLayoutType, PresetSlot, SkinTheme } from '@/types/l2';
import { CARD_LAYOUTS } from '@/lib/cardLayouts';
import { isLogGroup } from '@/lib/logGroups';
import CardStage from './CardStage';
import FitCard from './FitCard';
import AccessibleDialog from './AccessibleDialog';
import './CardWorkspace.css';

interface Props {
  item: ArchiveItem;
  slot: PresetSlot;
  skin: SkinTheme;
  authorName: string;
  members: ArchiveItem[];
  presets: PresetSlot[];
  captureRef: RefObject<HTMLDivElement | null>;
  exportState: 'idle' | 'preparing' | 'ready' | 'error';
  exportError: string;
  applying: boolean;
  onApplyPreset: (preset: PresetSlot) => void;
  onApplyLayout?: (layout: CardLayoutType) => void;
  onEdit: () => void;
  onDownload: () => void;
  onShare: () => void;
  onRetryExport: () => void;
  onOpenMember: (item: ArchiveItem) => void;
}

const NO_PHOTO_LAYOUTS = CARD_LAYOUTS.filter(entry => entry.isNoPhoto);

export default function CardWorkspace(p:Props){
  const [membersOpen,setMembersOpen]=useState(false);
  const ready=p.exportState==='ready'&&!p.applying;
  const isNoPhoto=(p.item.hasPhoto===false||!p.item.img)&&!isLogGroup(p.item);
  return <section className="record-card" aria-label="로그 카드">
    <div className="record-card-stage"><FitCard ratio={p.slot.ratio} animationKey={`${p.item.id}-${p.slot.layout}-${p.slot.skinId}-${p.slot.ratio}`}><CardStage item={p.item} slot={p.slot} skin={p.skin} authorName={p.authorName} selectedItems={p.members} curationTitle={p.item.title} cardCaptureRef={p.captureRef}/></FitCard>{isLogGroup(p.item)&&<button type="button" className="record-group-members" onClick={()=>setMembersOpen(true)}><Layers size={13}/>담긴 로그 {p.members.length}개</button>}</div>
    <div className="record-preset-picker">
      <div className="record-preset-head">
        <span>카드 프리셋</span>
        {isNoPhoto&&p.onApplyLayout&&<div className="record-nophoto-layouts" role="group" aria-label="글 전용 카드 도안">
          {NO_PHOTO_LAYOUTS.map(layout=><button type="button" key={layout.id} aria-pressed={p.slot.layout===layout.id} disabled={p.applying} onClick={()=>p.onApplyLayout?.(layout.id)}>{layout.sub.replace('형','')}</button>)}
        </div>}
      </div>
      <div role="group" aria-label="로그에 적용할 프리셋">{p.presets.map(preset=><button type="button" key={preset.id} aria-pressed={p.slot.id===preset.id&&p.slot.skinId===preset.skinId&&(! !p.item.img ? p.slot.layout===preset.layout : true)} disabled={p.applying} onClick={()=>p.onApplyPreset(preset)}>{preset.name}</button>)}</div>
    </div>
    {p.exportState==='error'&&<div className="record-card-error" role="alert"><span>{p.exportError}</span><button type="button" onClick={p.onRetryExport}>다시 준비</button></div>}
    <div className="record-card-actions" role="group" aria-label="카드 작업"><button type="button" onClick={p.onEdit}><PencilLine size={17}/><span>내용 수정</span></button><button type="button" className="record-card-save" disabled={!ready} onClick={p.onDownload}>{!ready?<LoaderCircle size={17} className="preset-spinner"/>:<Download size={17}/>}<span>카드 저장</span></button><button type="button" disabled={!ready} onClick={p.onShare}><Share2 size={17}/><span>공유하기</span></button></div>
    <AccessibleDialog open={membersOpen} onClose={()=>setMembersOpen(false)} title={p.item.title}><div className="group-members-list">{p.members.length?p.members.map((member,index)=><button type="button" key={member.id} onClick={()=>{setMembersOpen(false);p.onOpenMember(member);}}><small>{String(index+1).padStart(2,'0')}</small><span>{member.title}</span></button>):<p>담긴 로그가 없어요.</p>}</div></AccessibleDialog>
  </section>;
}
