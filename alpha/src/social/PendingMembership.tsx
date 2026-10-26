'use client';
import {Clock3,Users} from 'lucide-react';
import type {LabState,Person} from './model';

export default function PendingMembership({state,actor,onActor}:{state:LabState;actor:Person;onActor:(id:string)=>void}){
 const pending=state.circles.filter(c=>c.pending?.includes(actor.id));
 return <div className="lab-app lab-awaiting"><div className="lab-test-ribbon"><span>LOCAL SOCIAL LAB</span><span>가상 사용자 · 로컬 테스트</span></div><header className="lab-header"><span className="lab-brand">L2<span>.</span></span><span>{actor.name}</span></header><main className="lab-awaiting-content"><span className="lab-awaiting-icon">{pending.length?<Clock3 size={30}/>:<Users size={30}/>}</span><h1>{pending.length?'참여 승인을 기다리고 있어요':'아직 참여한 모임이 없어요'}</h1>{pending.map(c=><div className="lab-awaiting-circle" key={c.id}><strong>{c.name}</strong><span>승인 대기</span></div>)}<p>{pending.length?'모임장이 승인하면 함께할 수 있어요.':'초대를 받아 모임에 참여해 보세요.'}<br/>모임의 로그와 지도는 아직 보이지 않아요.</p><section className="lab-awaiting-roles" aria-label="테스트 역할 변경"><span className="lab-eyebrow">가상 사용자로 화면 확인</span><div className="lab-person-choices">{state.people.map(p=><button key={p.id} aria-pressed={p.id===actor.id} onClick={()=>onActor(p.id)}><span aria-hidden="true" className="lab-member-initial" style={{background:p.color}}>{p.initial}</span><span>{p.name}</span></button>)}</div></section><p className="lab-local-note">현재는 같은 브라우저에서 확인하는 시제품이에요.<br/>실제 로그인·초대 링크·다른 기기 공유는 미연결입니다.</p></main></div>;
}
