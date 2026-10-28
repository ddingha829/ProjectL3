'use client';
import {useState} from 'react';
import {KeyRound,Plus} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import GroupCodeJoin from './GroupCodeJoin';

export default function GroupEntrySheet({open,onClose,enabled,pending,join,onJoined,onCreate}:{open:boolean;onClose:()=>void;enabled:boolean;pending:boolean;join:(code:string)=>Promise<string>;onJoined:(id:string)=>void;onCreate:(name:string,capacity:number)=>boolean}){
 const [tab,setTab]=useState<'join'|'create'>('join'),[name,setName]=useState(''),[capacity,setCapacity]=useState(8);
 return <AccessibleDialog open={open} onClose={onClose} title="모임 참여 · 만들기" panelClassName="lab-dialog un-group-entry">
  <div className="un-group-entry-tabs" role="tablist" aria-label="모임 시작 방법">{([['join','초대 코드로 참여',KeyRound],['create','새 모임 만들기',Plus]] as const).map(([id,label,Icon])=><button type="button" key={id} role="tab" aria-selected={tab===id} tabIndex={tab===id?0:-1} onKeyDown={event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?'join':event.key==='End'?'create':tab==='join'?'create':'join';setTab(next);document.getElementById('group-tab-'+next)?.focus();}} aria-controls={'group-entry-'+id} id={'group-tab-'+id} onClick={()=>setTab(id)}><Icon size={16}/>{label}</button>)}</div>
  <div role="tabpanel" id={'group-entry-'+tab} aria-labelledby={'group-tab-'+tab}>
   {tab==='join'?<GroupCodeJoin enabled={enabled} pending={pending} join={join} onJoined={onJoined}/>:<form className="un-create-circle" onSubmit={e=>{e.preventDefault();if(name.trim().length>=2&&!pending&&onCreate(name.trim(),capacity))setName('');}}><label>모임 이름<input aria-label="새 모임 이름" value={name} maxLength={30} onChange={e=>setName(e.target.value)} placeholder="함께 기록할 모임"/></label><label>정원 <small>최대 20명</small><input aria-label="모임 정원" type="number" min={1} max={20} value={capacity} onChange={e=>setCapacity(Math.max(1,Math.min(20,Number(e.target.value)||1)))}/></label><button className="un-primary" disabled={name.trim().length<2||pending}>모임 만들기</button><p className="un-subtle">{enabled?'만들면 6자리 초대 코드로 친구를 부를 수 있어요.':'예시 모임은 이 브라우저에만 저장돼요.'}</p></form>}
  </div>
 </AccessibleDialog>;
}
