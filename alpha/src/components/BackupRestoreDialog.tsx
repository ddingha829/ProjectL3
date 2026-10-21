'use client';
import { useEffect, useRef, useState } from 'react';
import type { ArchiveItem } from '@/types/l2';
import { prepareBackupRestore, type BackupRestorePlan } from '@/lib/backupRestore';
import type { BackupProgress } from '@/lib/logBackup';
import AccessibleDialog from './AccessibleDialog';
import './BackupRestoreDialog.css';

export default function BackupRestoreDialog({open,scope,archives,onClose,onRestore}:{open:boolean;scope:string;archives:ArchiveItem[];onClose:()=>void;onRestore:(plan:BackupRestorePlan)=>Promise<{added:number;skipped:number}>}) {
  const [plan,setPlan]=useState<BackupRestorePlan|null>(null),[progress,setProgress]=useState<BackupProgress|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[done,setDone]=useState('');
  const input=useRef<HTMLInputElement>(null),token=useRef(0),lock=useRef(false);
  useEffect(()=>{if(!open){token.current++;setPlan(null);setProgress(null);setError('');setDone('');}},[open]);
  useEffect(()=>()=>{token.current++;},[]);
  const read=async(file?:File)=>{
    if(!file||lock.current)return;const current=++token.current;setPlan(null);setError('');setDone('');
    try{const result=await prepareBackupRestore(file,archives,scope,value=>{if(current===token.current)setProgress(value);});if(current===token.current)setPlan(result);}
    catch(e){if(current===token.current)setError(e instanceof Error?e.message:'백업 파일을 읽지 못했어요.');}
    finally{if(current===token.current)setProgress(null);}
  };
  const restore=async()=>{
    if(!plan||lock.current)return;lock.current=true;setBusy(true);setError('');
    try{const result=await onRestore(plan);setDone(`${result.added}개를 기기에 복원했어요.${result.skipped?` 이미 있는 ${result.skipped}개는 건너뛰었어요.`:''} 서버 동기화 상태는 설정에서 확인할 수 있어요.`);setPlan(null);}
    catch(e){setError(e instanceof Error?e.message:'복원하지 못했어요. 기존 로그는 유지됩니다.');}
    finally{lock.current=false;setBusy(false);}
  };
  return <AccessibleDialog open={open} onClose={()=>{if(!busy)onClose();}} title="백업 파일 복원" description="ZIP 또는 JSON 백업에서 새 로그만 추가해요. 기존 로그는 덮어쓰지 않아요.">
    <div className="backup-restore">
      <input ref={input} type="file" accept=".zip,.json,application/zip,application/json" multiple={false} hidden aria-label="L2 백업 파일 선택" onChange={event=>{const file=event.target.files?.[0];event.target.value='';void read(file);}}/>
      <button type="button" className="test-button" disabled={busy||Boolean(progress)||!scope} onClick={()=>input.current?.click()}>백업 파일 선택</button>
      {progress&&<div className="backup-restore-progress" role="status"><strong>{progress.percent}%</strong><progress max={100} value={progress.percent} aria-label="백업 검사 진행률"/><span>{progress.label}</span></div>}
      {plan&&<><p className="backup-restore-filename">{plan.filename}</p><dl><div><dt>추가할 로그</dt><dd>{plan.items.length}</dd></div><div><dt>중복 · 건너뛰기</dt><dd>{plan.duplicates}</dd></div><div><dt>형식 확인 필요</dt><dd>{plan.invalid}</dd></div><div><dt>파일 없는 사진</dt><dd>{plan.missingImages}</dd></div></dl>
        {(plan.missingImages>0||plan.missingMembers>0)&&<p className="backup-restore-hint">{plan.missingImages>0?'사진 파일이 없는 항목은 가능한 경우 원본 이미지 링크를 유지해요. ':''}{plan.missingMembers>0?`그룹의 누락된 항목 ${plan.missingMembers}개는 제외해요.`:''}</p>}
        <ul aria-label="복원할 로그 미리보기">{plan.items.slice(0,6).map(item=><li key={item.id}>{item.title}</li>)}{plan.items.length>6&&<li>외 {plan.items.length-6}개</li>}</ul>
        <button type="button" className="test-button primary" disabled={busy||!plan.items.length} onClick={()=>void restore()}>{busy?'복원 중…':`${plan.items.length}개 로그 복원하기`}</button></>}
      {error&&<p role="alert" className="backup-restore-error">{error}</p>}{done&&<p role="status">{done}</p>}
    </div>
  </AccessibleDialog>;
}
