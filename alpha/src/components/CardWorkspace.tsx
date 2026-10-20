'use client';
import { useEffect, useRef, useState, type RefObject, type PointerEvent } from 'react';
import { Check, Share2, PencilLine, LoaderCircle, Layers, ChevronLeft, ChevronRight, ChevronUp, ChevronDown, Crop } from 'lucide-react';
import type { ArchiveItem, PresetSlot, SkinTheme } from '@/types/l2';
import { PRESET_SLOTS, INITIAL_SKINS } from '@/data/initialData';
import { isLogGroup } from '@/lib/logGroups';
import CardStage from './CardStage';
import FitCard from './FitCard';
import AccessibleDialog from './AccessibleDialog';
import SaveFeedback from './SaveFeedback';
import { createCardAppearance } from '@/lib/cardAppearance';
import { cardStyleKey } from '@/lib/cardStyle';
import PresetLibrary from './PresetLibrary';
import CardStyleControls from './CardStyleControls';
import './CardWorkspace.css';
import PhotoAdjustDialog from './PhotoAdjustDialog';
import {getCardLayout,itemHasPhoto} from '@/lib/cardLayouts';
import type {PhotoCrop} from '@/lib/photoCrop';

interface Props {
  item: ArchiveItem;
  slot: PresetSlot;
  skin: SkinTheme;
  authorName: string;
  members: ArchiveItem[];
  presets: PresetSlot[];
  skins?: Record<string, SkinTheme>;
  captureRef: RefObject<HTMLDivElement | null>;
  exportState: 'idle' | 'preparing' | 'ready' | 'error';
  exportError: string;
  applying: boolean;
  saved?: boolean;
  hasPendingChange?: boolean;
  onApplyPreset: (preset: PresetSlot) => void;
  onChangeStyle: (patch: Partial<PresetSlot>) => void;
  onResetStyle: () => void;
  onChangePhoto: (crop:PhotoCrop) => void;
  onEdit: () => void;
  onSaveCard: () => void;
  onShare: () => void;
  onRetryExport: () => void;
  onOpenMember: (item: ArchiveItem) => void;
}

export default function CardWorkspace(p: Props) {
  const [editorOpen,setEditorOpen]=useState(false);
  const swipe=useRef<{id:number;x:number;y:number}|null>(null);
  useEffect(()=>{setEditorOpen(false);swipe.current=null;},[p.item.id]);
  useEffect(()=>{
    const guide=(event:Event)=>setEditorOpen(Boolean((event as CustomEvent<boolean>).detail));
    window.addEventListener('l2:card-guide-editor',guide);
    return()=>window.removeEventListener('l2:card-guide-editor',guide);
  },[]);
  const startSwipe=(event:PointerEvent<HTMLElement>)=>{if(event.isPrimary&&event.button===0&&!(event.target as HTMLElement).closest('button,input,[data-crop-interactive]'))swipe.current={id:event.pointerId,x:event.clientX,y:event.clientY};};
  const moveSwipe=(event:PointerEvent<HTMLElement>)=>{
    const start=swipe.current;if(!start||start.id!==event.pointerId)return;
    const dx=event.clientX-start.x,dy=event.clientY-start.y;
    if(Math.abs(dy)>44&&Math.abs(dy)>Math.abs(dx)*1.4){event.preventDefault();event.stopPropagation();setEditorOpen(dy<0);swipe.current=null;}
  };
  const [membersOpen, setMembersOpen] = useState(false);
  const [photoOpen,setPhotoOpen]=useState(false);
  const canAdjustPhoto=!isLogGroup(p.item)&&itemHasPhoto(p.item)&&!getCardLayout(p.slot.layout).isNoPhoto;
  const [direction, setDirection] = useState(1);
  const shareReady = p.exportState === 'ready' && !p.applying;
  const allSkins = { ...INITIAL_SKINS, ...(p.skins || {}) };

  const compatible = p.presets.filter(preset => isLogGroup(p.item) ? preset.layout === 'curation' : preset.layout !== 'curation');
  const presets = compatible.length ? compatible : PRESET_SLOTS.filter(preset => isLogGroup(p.item) ? preset.layout === 'curation' : preset.layout !== 'curation');
  const sourceIndex=presets.findIndex(preset=>preset.id===p.slot.id);
  const activeIndex=presets.findIndex(preset=>{const appearance=createCardAppearance(p.item,preset,allSkins,p.authorName);return preset.id===p.slot.id&&cardStyleKey(appearance.slot,appearance.skin)===cardStyleKey(p.slot,p.skin);});
  const customized=activeIndex<0;
  const selectPresetAt = (nextIdx: number, stepDir?: number) => {
    if (!presets.length || p.applying) return;
    const wrapped = (nextIdx + presets.length) % presets.length;
    const dir = stepDir ?? (wrapped < sourceIndex ? -1 : 1);
    setDirection(dir);
    p.onApplyPreset(presets[wrapped]);
  };

  return (
    <section className={`record-card ${editorOpen?'is-editing-card':'is-viewing-card'}`} aria-label="로그 카드">
      <div className="record-card-stage" onPointerDown={startSwipe} onPointerMove={moveSwipe} onPointerUp={()=>{swipe.current=null;}} onPointerCancel={()=>{swipe.current=null;}}>
        <FitCard
          interactive
          ratio={p.slot.ratio}
          transition="slide"
          direction={direction}
          animationKey={`${p.item.id}-${p.slot.id}-${p.slot.layout}-${p.slot.skinId}-${p.slot.ratio}`}
        >
          <CardStage
            item={p.item}
            slot={p.slot}
            skin={p.skin}
            authorName={p.authorName}
            selectedItems={p.members}
            curationTitle={p.item.title}
            cardCaptureRef={p.captureRef}
          />
        </FitCard>
        {isLogGroup(p.item) && (
          <button
            type="button"
            className="record-group-members"
            onClick={() => setMembersOpen(true)}
          >
            <Layers size={13} />
            담긴 로그 {p.members.length}개
          </button>
        )}
      </div>

      {p.exportState === 'error' && (
        <div className="record-card-error" role="alert">
          <span>{p.exportError}</span>
          <button type="button" onClick={p.onRetryExport}>
            다시 준비
          </button>
        </div>
      )}

      <button type="button" className="record-editor-handle" aria-expanded={editorOpen} aria-controls="record-design-panel" onClick={()=>setEditorOpen(value=>!value)}>
        <i aria-hidden="true"/>{editorOpen?<ChevronDown size={17}/>:<ChevronUp size={17}/>}<strong>{editorOpen?'카드 크게 보기':'위로 밀어 카드 수정'}</strong><small>{editorOpen?'눌러서 편집 메뉴 접기':'눌러서도 열 수 있어요 · 프리셋 / 사진 보정 / 공유'}</small>
      </button>
      <div className="record-edit-drawer">
      <div id="record-design-panel" className="record-design-tools" data-guide="card-style">
        <div className="record-preset-controls" aria-label="카드 프리셋 선택">
          <PresetLibrary presets={presets} activeId={customized?'':p.slot.id} currentName={customized?'개별 디자인':undefined} skins={allSkins} authorName={p.authorName} item={p.item} dirty={p.hasPendingChange} disabled={p.applying} onSelect={(preset,dir)=>{setDirection(dir);p.onApplyPreset(preset);}}/>
          <div className="record-preset-arrows" role="group" aria-label="프리셋 이전 다음 이동"><button type="button" aria-label="이전 프리셋" disabled={p.applying||presets.length<2} onClick={()=>selectPresetAt((sourceIndex<0?0:sourceIndex)-1,-1)}><ChevronLeft size={17}/></button><button type="button" aria-label="다음 프리셋" disabled={p.applying||presets.length<2} onClick={()=>selectPresetAt((sourceIndex<0?-1:sourceIndex)+1,1)}><ChevronRight size={17}/></button></div>
        </div>
        <CardStyleControls slot={p.slot} skin={p.skin} item={p.item} skins={allSkins} disabled={p.applying} onChange={(patch,dir)=>{setDirection(dir||1);p.onChangeStyle(patch);}}/>
        <div className="record-style-status"><span>{customized?'이 로그만 꾸민 디자인':'프리셋을 고르거나 이 로그만 꾸며보세요'}</span><div className="record-style-buttons">{canAdjustPhoto&&<button type="button" className="record-photo-adjust" disabled={p.applying} onClick={()=>setPhotoOpen(true)}><Crop size={13}/>사진 조정</button>}{p.hasPendingChange&&<button type="button" disabled={p.applying} onClick={p.onResetStyle}>변경 취소</button>}</div></div>
        {photoOpen&&<PhotoAdjustDialog item={p.item} slot={p.slot} skin={p.skin} authorName={p.authorName} onApply={p.onChangePhoto} onClose={()=>setPhotoOpen(false)}/>}

      </div>

      <div className="record-card-actions" role="group" aria-label="카드 작업">
        <button type="button" onClick={p.onEdit}>
          <PencilLine size={17} />
          <span>내용 수정</span>
        </button>
        <button
          type="button"
          className={`record-card-save ${p.hasPendingChange ? 'is-dirty' : ''}`}
          data-save-state={p.saved ? 'saved' : p.applying ? 'saving' : 'idle'}
          disabled={p.applying || !p.hasPendingChange}
          onClick={p.onSaveCard}
        >
          <SaveFeedback state={p.saved ? 'saved' : p.applying ? 'saving' : 'idle'} label="카드 저장" idleIcon={<Check size={17} />} />
        </button>
        <button type="button" disabled={!shareReady} onClick={p.onShare}>
          {!shareReady ? <LoaderCircle size={17} className="preset-spinner" /> : <Share2 size={17} />}
          <span>공유하기</span>
        </button>
      </div>

      </div>
      <AccessibleDialog
        open={membersOpen}
        onClose={() => setMembersOpen(false)}
        title={p.item.title}
      >
        <div className="group-members-list">
          {p.members.length ? (
            p.members.map((member, index) => (
              <button
                type="button"
                key={member.id}
                onClick={() => {
                  setMembersOpen(false);
                  p.onOpenMember(member);
                }}
              >
                <small>{String(index + 1).padStart(2, '0')}</small>
                <span>{member.title}</span>
              </button>
            ))
          ) : (
            <p>담긴 로그가 없어요.</p>
          )}
        </div>
      </AccessibleDialog>
    </section>
  );
}
