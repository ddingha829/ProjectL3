'use client';
import {Check,Clock3,LoaderCircle,RotateCcw,Lock,TriangleAlert} from 'lucide-react';
import type {LabLog} from './model';
import {publicationLabel} from './publication';

export default function PublicationStatus({log,onRetry,onKeep}:{log:LabLog;onRetry?:()=>void;onKeep?:()=>void}){
 const p=log.publication;if(!p)return null;
 const Icon=p.status==='confirmed'?Check:p.status==='sending'?LoaderCircle:p.status==='failed'?TriangleAlert:Clock3;
 return <div className={`lab-publication-status is-${p.status}`} data-publication={p.status}>
  <div className="lab-publication-heading" role="status" aria-live="polite"><Icon size={17} className={p.status==='sending'?'lab-spin':undefined}/><strong>{publicationLabel(log)}</strong><span>기기 저장됨</span></div>
  <p role={p.status==='failed'?'alert':undefined}>{p.status==='failed'?p.error:p.status==='queued'?'전송을 기다리는 동안에도 글과 사진은 이 기기에 남아요.':p.status==='sending'?'입력한 내용은 보관했어요. 전송 결과를 확인하고 있어요.':p.mode==='simulation'?'이 브라우저의 가상 모임에 반영했어요.':'모임에 공유했어요.'}</p>
  {p.mode==='simulation'&&<small>서버 미연결 · 실제 다른 기기로 전송하지 않는 테스트예요.</small>}
  {p.status!=='confirmed'&&<div className="lab-publication-actions">{p.status==='failed'&&onRetry&&<button onClick={onRetry}><RotateCcw size={15}/>다시 시도</button>}{onKeep&&<button onClick={onKeep}><Lock size={15}/>나만 보관</button>}</div>}
 </div>;
}
