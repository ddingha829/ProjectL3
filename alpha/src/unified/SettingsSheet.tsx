'use client';
import {useEffect,useState,type CSSProperties} from 'react';
import {ArrowLeft,ArrowUpRight,CalendarDays,ChevronRight,Download,KeyRound,HelpCircle,LogOut,Monitor,Moon,Palette,Plug,Sun,Users} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import IntegrationStatus from '@/social/IntegrationStatus';
import {NicknameForm} from './NicknameForm';
import PasswordChangeForm from './PasswordChangeForm';
import NotificationSettings from './NotificationSettings';
import type useNotifications from './useNotifications';
import type {Person} from '@/social/model';
export type SettingsAction='studio'|'calendar'|'groups'|'backup'|'guide'|'alpha'|'logout';
export default function SettingsSheet({open,onClose,actor,email,cloud,notifications,theme,onTheme,onInstall,onAction,onNickname,nicknameBusy,onChangePassword}:{open:boolean;onClose:()=>void;actor:Person;email?:string;cloud:boolean;notifications:ReturnType<typeof useNotifications>;theme:'auto'|'light'|'dark';onTheme:(theme:'auto'|'light'|'dark')=>void;onInstall:()=>void;onAction:(action:SettingsAction)=>void;onNickname:(name:string)=>Promise<void>;nicknameBusy:boolean;onChangePassword:(current:string,password:string,confirmation:string)=>Promise<void>}){
 const [passwordOpen,setPasswordOpen]=useState(false),[passwordBusy,setPasswordBusy]=useState(false),[editing,setEditing]=useState(false),[integrationsOpen,setIntegrationsOpen]=useState(false);
 useEffect(()=>{if(!open){setEditing(false);setIntegrationsOpen(false);setPasswordOpen(false);setPasswordBusy(false);}},[open]);
 return <AccessibleDialog open={open} scrollBody title="설정" closeLabel="설정 닫기" onClose={onClose} panelClassName="lab-dialog un-settings">
  <button className="un-profile un-profile-edit" onClick={()=>setEditing(true)} aria-label="닉네임 변경"><span className="un-avatar" style={{'--person':actor.color} as CSSProperties}>{actor.initial}</span><span><strong>{actor.name}</strong><small>{cloud?email:'예시 계정 · 기기에만 저장'}</small></span><span>닉네임 변경 ↗</span></button>{editing&&<AccessibleDialog open title="닉네임 변경" onClose={()=>{if(!nicknameBusy)setEditing(false);}} panelClassName="lab-dialog"><NicknameForm initialName={actor.name} busy={nicknameBusy} onSave={async name=>{await onNickname(name);setEditing(false);}}/></AccessibleDialog>}
  <NotificationSettings controller={notifications} cloud={cloud} onInstall={onInstall}/>
  <div className="un-settings-section"><h3>화면</h3><div className="un-theme-choice">{([['auto','시스템',Monitor],['light','라이트',Sun],['dark','다크',Moon]] as const).map(([id,label,Icon])=><button key={id} aria-pressed={theme===id} onClick={()=>onTheme(id)}><Icon size={17}/>{label}</button>)}</div></div>
  <div className="un-settings-links">{cloud&&<button type="button" onClick={()=>setPasswordOpen(true)} aria-haspopup="dialog"><KeyRound size={18}/>비밀번호 변경<ChevronRight size={16}/></button>}{([['studio','내 카드 디자인',Palette],['calendar','개인 캘린더',CalendarDays],['groups','모임 관리',Users],['backup','내 기록 백업',Download],['guide','사용 안내 다시 보기',HelpCircle],['alpha','알파테스트 · 문제 알리기',HelpCircle],['logout','로그아웃',LogOut]] as const).map(([id,label,Icon])=><button key={id} onClick={()=>onAction(id)}><Icon size={18}/>{label}<ArrowUpRight size={16}/></button>)}<button type="button" onClick={()=>setIntegrationsOpen(true)} aria-haspopup="dialog"><Plug size={18}/>서비스 연동<ChevronRight size={16}/></button></div>
  {passwordOpen&&<AccessibleDialog open title="비밀번호 변경" closeLabel="설정으로 돌아가기" closeIcon={<ArrowLeft size={20}/>} onClose={()=>{if(!passwordBusy)setPasswordOpen(false);}} panelClassName="lab-dialog" scrollBody><PasswordChangeForm onChangePassword={onChangePassword} onDone={()=>setPasswordOpen(false)} onBusyChange={setPasswordBusy}/></AccessibleDialog>}
  {integrationsOpen&&<AccessibleDialog open title="서비스 연동" description="작품 검색과 AI 소개 요약의 연결 상태를 확인해요." closeLabel="설정으로 돌아가기" closeIcon={<ArrowLeft size={20}/>} onClose={()=>setIntegrationsOpen(false)} panelClassName="lab-dialog un-settings-integrations" scrollBody><IntegrationStatus/></AccessibleDialog>}
  <p className="un-preview-disclosure">{cloud?'실제 계정 · 티끌과 모임은 서버에 저장됩니다.':'예시 화면 · 기록은 이 브라우저에만 저장됩니다.'}<br/>작품 검색·소개 요약은 실제 API를 사용합니다.</p><footer>alpha · {process.env.NEXT_PUBLIC_APP_REVISION||'local'}</footer>
 </AccessibleDialog>;
}
