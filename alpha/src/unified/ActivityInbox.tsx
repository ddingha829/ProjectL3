'use client';
import {useState} from 'react';
import {ArrowUpRight,Bell,MessageCircle,CornerDownRight,LoaderCircle} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import {commentTime} from './commentTime';
import type useActivityInbox from './useActivityInbox';
import type {ActivityItem} from './useActivityInbox';
import './ActivityInbox.css';
export default function ActivityInbox({open,cloud,controller:n,onClose,onSelect}:{open:boolean;cloud:boolean;controller:ReturnType<typeof useActivityInbox>;onClose:()=>void;onSelect:(item:ActivityItem)=>Promise<void>}){
 const [opening,setOpening]=useState(''),[error,setError]=useState('');
 const select=async(item:ActivityItem)=>{if(opening)return;setOpening(item.id);setError('');try{await onSelect(item);}catch{setError('이 기록을 열지 못했어요. 공유 상태를 확인한 뒤 다시 시도해주세요.');}finally{setOpening('');}};
 return <AccessibleDialog open={open} title="알림" onClose={onClose} panelClassName="lab-dialog un-inbox-dialog"><p className="un-inbox-caption">최근 30일의 모임 활동 · 최대 50개</p>{!cloud?<p className="un-inbox-empty">로그인하면 모임의 새 글과 댓글 알림을 볼 수 있어요.</p>:<>{(n.error||error)&&<div className="un-inbox-error" role="alert"><p>{error||n.error}</p><button type="button" onClick={()=>void n.reload()}>다시 시도</button></div>}{n.busy&&!n.items.length?<p className="un-inbox-empty" role="status"><LoaderCircle size={18} className="lab-spin"/>알림을 불러오고 있어요.</p>:!n.items.length&&!n.error?<div className="un-inbox-empty"><Bell size={26}/><strong>아직 새로운 소식이 없어요</strong><p>모임의 새 글과 내 글·댓글에 달린 댓글을 여기에 모아드려요.</p></div>:null}<div className="un-inbox-list">{n.items.map(item=>{const Icon=item.kind==='post'?Bell:item.kind==='reply'?CornerDownRight:MessageCircle,time=commentTime(item.createdAt);return <button type="button" key={item.id} className="un-inbox-item" data-unread={item.unread||undefined} disabled={!!opening} onClick={()=>void select(item)}><span className="un-inbox-symbol"><Icon size={18} aria-hidden="true"/></span><span className="un-inbox-copy"><span className="un-inbox-context">{item.groupName}{time&&<time dateTime={time.dateTime} title={time.full}>{time.label}</time>}</span><strong>{item.actorName}님이 {item.kind==='post'?'새 티끌을 남겼어요':item.kind==='reply'?'내 댓글에 답글을 남겼어요':'내 티끌에 댓글을 남겼어요'}</strong><span className="un-inbox-title">{item.title}</span>{item.kind!=='post'&&<span className="un-inbox-body">{item.body}</span>}</span>{opening===item.id?<LoaderCircle size={16} className="lab-spin"/>:<ArrowUpRight size={15} aria-hidden="true"/>}</button>;})}</div></>}</AccessibleDialog>;
}
