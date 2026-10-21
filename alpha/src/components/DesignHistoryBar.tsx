'use client';
import {Undo2,Redo2,Columns2} from 'lucide-react';
import './DesignHistoryBar.css';
export default function DesignHistoryBar({canUndo,canRedo,changed,comparing,disabled,onUndo,onRedo,onCompare}:{canUndo:boolean;canRedo:boolean;changed:boolean;comparing:boolean;disabled?:boolean;onUndo:()=>void;onRedo:()=>void;onCompare:()=>void}){
 return <div className="design-history-bar" role="group" aria-label="디자인 변경 기록">
  <button type="button" aria-label="디자인 한 단계 되돌리기" title="되돌리기" disabled={disabled||!canUndo||comparing} onClick={onUndo}><Undo2 size={17}/></button>
  <button type="button" aria-label="디자인 다시 실행" title="다시 실행" disabled={disabled||!canRedo||comparing} onClick={onRedo}><Redo2 size={17}/></button>
  <button type="button" className="design-compare" aria-pressed={comparing} disabled={disabled||!changed&&!comparing} onClick={onCompare}><Columns2 size={16}/><span>{comparing?'편집본 보기':'원본 비교'}</span></button>
  <span className="sr-only" role="status">{comparing?'저장 전 원본을 보고 있어요':'현재 편집 중인 디자인'}</span>
 </div>;
}
