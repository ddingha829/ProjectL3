'use client';
import {useEffect,useRef,useState} from 'react';
import {Check,Clock3,Lock,Plus,Users} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import {addsGroupShare,canAddGroupShare,groupShareDeadline,groupShareTimeLabel,SHARE_WINDOW_MESSAGE} from '@/lib/groupSharing';
import type {Circle} from '@/social/model';
import {audienceIds,type UnifiedLog} from './store';
import './ShareToGroupsSheet.css';

export default function ShareToGroupsSheet({log,circles,onSave,onClose}:{log:UnifiedLog;circles:Circle[];onSave:(ids:string[])=>Promise<void>;onClose:()=>void}){
 const current=audienceIds(log),[chosen,setChosen]=useState(()=>[...current]),[now,setNow]=useState(Date.now),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const mounted=useRef(true);useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),1000);return()=>clearInterval(timer);},[]);
 const allowed=canAddGroupShare(log,now),added=chosen.filter(id=>!current.includes(id)),removed=current.filter(id=>!chosen.includes(id)),changed=added.length+removed.length>0;
 const options=[...circles.map(circle=>({id:circle.id,name:circle.name,members:circle.members.length})),...current.filter(id=>!circles.some(c=>c.id===id)).map(id=>({id,name:'이전에 공유한 모임',members:undefined}))];
 const deadline=new Date(groupShareDeadline(log)).toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'});
 const submit=async()=>{
  if(saving||!changed)return;
  if(addsGroupShare(current,chosen)&&!canAddGroupShare(log)){setNow(Date.now());setError(SHARE_WINDOW_MESSAGE);return;}
  setSaving(true);setError('');try{await onSave([...chosen]);if(mounted.current)onClose();}catch(e){if(mounted.current)setError(e instanceof Error?e.message:'공유하지 못했어요. 다시 시도해주세요.');}finally{if(mounted.current)setSaving(false);}
 };
 return <AccessibleDialog open title="모임에 공유" onClose={onClose} closeLabel="모임 공유 닫기" scrollBody panelClassName="lab-dialog un-group-share-sheet">
  <div className="un-group-share-intro"><span><Clock3 size={17} aria-hidden="true"/>{groupShareTimeLabel(log,now)}</span><p>처음 등록한 뒤 <strong>48시간</strong> 동안 다른 모임에도 공유할 수 있어요. 같은 원본이 연결되어 수정 내용도 함께 반영돼요.</p><small>{allowed?`${deadline}까지 추가 공유 가능`:'기존 모임의 공유는 유지되며 언제든 해제할 수 있어요.'}</small></div>
  <div className="un-always-private"><Lock size={17} aria-hidden="true"/><span>내 티끌<small>항상 보관돼요</small></span><Check size={17} aria-hidden="true"/></div>
  <div className="un-share-options">{options.map(c=>{const existing=current.includes(c.id),blocked=saving||!allowed&&!existing&&!chosen.includes(c.id);return <button type="button" key={c.id} aria-pressed={chosen.includes(c.id)} disabled={blocked} onClick={()=>{setChosen(ids=>ids.includes(c.id)?ids.filter(id=>id!==c.id):[...ids,c.id]);setError('');}}><Users size={18} aria-hidden="true"/><span>{c.name}<small>{existing?'이미 공유한 모임':!allowed?'추가 공유 기한 만료':`${c.members}명 · 추가 공유`}</small></span>{chosen.includes(c.id)?<Check size={17} aria-hidden="true"/>:<Plus size={17} aria-hidden="true"/>}</button>;})}</div>
  {!options.length&&<p className="un-subtle">먼저 상단의 모임 메뉴에서 모임에 참여하거나 만들어주세요.</p>}
  {error&&<p className="lab-error" role="alert">{error}</p>}
  {!allowed&&added.length>0&&!error&&<p className="lab-error" role="status">공유 기한이 지났어요. 추가로 고른 모임의 선택을 해제해주세요.</p>}
  <div className="un-group-share-footer"><p>{added.length?`${added.length}개 모임에 추가로 공유해요.`:removed.length?`${removed.length}개 모임의 공유를 해제해요.`:'공유할 모임을 선택하세요.'}</p><button type="button" className="un-primary un-full" disabled={saving||!changed||!allowed&&added.length>0} onClick={()=>void submit()}>{saving?'저장 중…':added.length?'선택한 모임에 공유':'공유 변경 저장'}</button></div>
 </AccessibleDialog>;
}
