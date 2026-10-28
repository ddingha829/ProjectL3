'use client';
import type {CSSProperties} from 'react';
import {ArrowUpRight,CalendarDays,Download,HelpCircle,LogOut,Monitor,Moon,Palette,Sun,Users} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import IntegrationStatus from '@/social/IntegrationStatus';
import NotificationSettings from './NotificationSettings';
import type useNotifications from './useNotifications';
import type {Person} from '@/social/model';
export type SettingsAction='studio'|'calendar'|'groups'|'backup'|'guide'|'alpha'|'logout';
export default function SettingsSheet({open,onClose,actor,email,cloud,notifications,theme,onTheme,onInstall,onAction}:{open:boolean;onClose:()=>void;actor:Person;email?:string;cloud:boolean;notifications:ReturnType<typeof useNotifications>;theme:'auto'|'light'|'dark';onTheme:(theme:'auto'|'light'|'dark')=>void;onInstall:()=>void;onAction:(action:SettingsAction)=>void}){
 return <AccessibleDialog open={open} scrollBody title="설정" closeLabel="설정 닫기" onClose={onClose} panelClassName="lab-dialog un-settings">
  <div className="un-profile"><span className="un-avatar" style={{'--person':actor.color} as CSSProperties}>{actor.initial}</span><span><strong>{actor.name}</strong><small>{cloud?email:'예시 계정 · 기기에만 저장'}</small></span></div>
  <IntegrationStatus/>
  <NotificationSettings controller={notifications} cloud={cloud} onInstall={onInstall}/>
  <div className="un-settings-section"><h3>화면</h3><div className="un-theme-choice">{([['auto','시스템',Monitor],['light','라이트',Sun],['dark','다크',Moon]] as const).map(([id,label,Icon])=><button key={id} aria-pressed={theme===id} onClick={()=>onTheme(id)}><Icon size={17}/>{label}</button>)}</div></div>
  <div className="un-settings-links">{([['studio','내 카드 디자인',Palette],['calendar','개인 캘린더',CalendarDays],['groups','모임 관리',Users],['backup','내 기록 백업',Download],['guide','사용 안내 다시 보기',HelpCircle],['alpha','알파테스트 · 문제 알리기',HelpCircle],['logout','로그아웃',LogOut]] as const).map(([id,label,Icon])=><button key={id} onClick={()=>onAction(id)}><Icon size={18}/>{label}<ArrowUpRight size={16}/></button>)}</div>
  <p className="un-preview-disclosure">{cloud?'실제 계정 · 티끌과 모임은 서버에 저장됩니다.':'예시 화면 · 기록은 이 브라우저에만 저장됩니다.'}<br/>작품 검색·소개 요약은 실제 API를 사용합니다.</p><footer>alpha · {process.env.NEXT_PUBLIC_APP_REVISION||'local'}</footer>
 </AccessibleDialog>;
}
