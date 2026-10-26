'use client';
import {Check,Users,X,ShieldCheck,Clock3} from 'lucide-react';
import type {Circle,Person} from './model';
import {circleOwner,isCircleOwner,MEMBER_LIMIT} from './membership';

export default function MembersPanel({circle,people,actorId,onDecide,onInvite}:{circle:Circle;people:Person[];actorId:string;onDecide:(personId:string,approve:boolean)=>void;onInvite:()=>void}){
 const owner=isCircleOwner(circle,actorId),pending=people.filter(p=>circle.pending?.includes(p.id));
 return <div className="lab-members-panel">
  <div className="lab-members-heading"><div><span className="lab-eyebrow">모임</span><h3>{circle.name}</h3></div><span>{circle.members.length} / {MEMBER_LIMIT}명</span></div>
  {owner&&pending.length>0&&<section className="lab-pending-section" aria-label="참여 요청"><h4><Clock3 size={16}/>참여 요청 <span>{pending.length}</span></h4>{pending.map(p=><div key={p.id} className="lab-request-card"><div className="lab-member-row"><span aria-hidden="true" className="lab-member-initial" style={{background:p.color}}>{p.initial}</span><span className="lab-member-name"><strong>{p.name}</strong><small>승인 대기 · 로그와 지도 열람 불가</small></span></div><div className="lab-request-actions"><button className="lab-member-reject" aria-label={`${p.name} 참여 거절`} onClick={()=>onDecide(p.id,false)}><X size={17}/><span>거절</span></button><button className="lab-member-approve" aria-label={`${p.name} 참여 승인`} onClick={()=>onDecide(p.id,true)}><Check size={17}/><span>승인</span></button></div></div>)}</section>}
  <section aria-label="현재 멤버"><h4><Users size={16}/>멤버</h4>{circle.members.map(id=>{const p=people.find(p=>p.id===id);if(!p)return null;return <div className="lab-member-row" key={id}><span aria-hidden="true" className="lab-member-initial" style={{background:p.color}}>{p.initial}</span><span className="lab-member-name"><strong>{p.name}{id===actorId&&<small> 나</small>}</strong><small>{p.note}</small></span>{id===circleOwner(circle)&&<span className="lab-owner-badge"><ShieldCheck size={14}/>모임장</span>}</div>;})}</section>
  <div className="lab-members-policy"><ShieldCheck size={17}/><p>새 멤버는 승인된 이후에 올라온 로그부터 볼 수 있어요.</p></div>
  {owner?<button className="lab-primary" disabled={circle.members.length>=MEMBER_LIMIT} onClick={onInvite}>{circle.members.length>=MEMBER_LIMIT?'8명이 모두 함께하고 있어요':'친구 초대'}</button>:<p className="lab-local-note">초대와 참여 승인은 모임장이 관리해요.</p>}
  <p className="lab-local-note">가상 멤버 테스트 · 실제 계정과 기기 간 공유는 아직 연결하지 않았어요.</p>
 </div>;
}
