'use client';
import {Check,MapPin,ArrowUpRight,X,Lock} from 'lucide-react';
import type {SaveReceipt,SavedDongProgress} from './saveProgress';
import {isPublished,publicationLabel} from './publication';
import './SaveNotice.css';

export default function SaveNotice({receipt,progress,onMap,onClose,onRetry}:{receipt:SaveReceipt;progress:SavedDongProgress|null;onMap:()=>void;onClose:()=>void;onRetry?:()=>void}){
 const canViewMap=Boolean(isPublished(receipt.log)&&receipt.log.place);
 return <div className="lab-save-notice" data-saved-log={receipt.log.id} role="status" aria-live="polite">
  <span className="lab-save-check" aria-hidden="true"><Check size={20}/></span>
  <div className="lab-save-copy"><strong>로그를 기기에 저장했어요</strong><span>{receipt.audienceName||<><Lock size={11}/>나만의 로그북</>}</span>{receipt.log.publication&&<span className={`lab-save-phase is-${receipt.log.publication.status}`}>{publicationLabel(receipt.log)}</span>}{progress&&<small><MapPin size={11}/>{progress.name} · {progress.beforeStrength===progress.afterStrength?`로그 ${progress.after}개 · ${progress.afterStrength}%`:`${progress.beforeStrength}% → ${progress.afterStrength}%`}</small>}</div>
  {receipt.log.publication?.status==='failed'&&onRetry&&<button className="lab-save-retry" onClick={onRetry}>다시 시도</button>}
  {canViewMap&&<button className="lab-save-map" onClick={onMap}>지도 보기<ArrowUpRight size={15}/></button>}
  <button className="lab-save-dismiss" aria-label="저장 알림 닫기" onClick={onClose}><X size={16}/></button>
 </div>;
}
