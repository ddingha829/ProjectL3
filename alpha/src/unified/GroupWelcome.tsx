'use client';
import {useState} from 'react';
import {ChevronDown,Users} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import GroupCodeJoin from './GroupCodeJoin';
import './GroupWelcome.css';

export default function GroupWelcome({open,pending,join,onJoined,onLater}:{open:boolean;pending:boolean;join:(code:string)=>Promise<string>;onJoined:(id:string)=>void;onLater:()=>void}){
 const [busy,setBusy]=useState(false);
 return <AccessibleDialog open={open} title="초대받으셨나요?" closeLabel="모임 참여는 나중에" onClose={()=>{if(!busy&&!pending)onLater();}} scrollBody panelClassName="lab-dialog un-group-welcome">
  <p className="un-group-welcome-intro">친구에게 받은 초대 코드를 입력하면<br/>같은 모임에서 티끌을 나눌 수 있어요.</p>
  <GroupCodeJoin enabled pending={pending} join={join} onJoined={onJoined} onBusyChange={setBusy}/>
  <aside className="un-group-welcome-hint"><span aria-hidden="true"><Users size={16}/>상단 모임 선택<ChevronDown size={14}/></span><p>언제든 화면 위쪽의 <strong>내 티끌 · 모임 이름</strong>을 눌러<br/>초대 코드로 참여하거나 새 모임을 만들 수 있어요.</p></aside>
  <button type="button" className="un-group-welcome-later" disabled={busy||pending} onClick={onLater}>나중에 할게요</button>
 </AccessibleDialog>;
}
