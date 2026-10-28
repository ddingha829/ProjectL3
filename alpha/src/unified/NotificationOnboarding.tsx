'use client';
import {ArrowUpRight,Bell,MapPin} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import './NotificationOnboarding.css';

export default function NotificationOnboarding({open,onLater,onConfigure}:{open:boolean;onLater:()=>void;onConfigure:()=>void}){
 return <AccessibleDialog open={open} onClose={onLater} title="알림을 켜둘까요?" closeLabel="나중에 알림 설정" scrollBody panelClassName="lab-dialog un-notification-onboarding">
  <p className="un-notification-intro">원하는 소식만 골라 받아보세요.</p>
  <div className="un-notification-features">
   <div><span><Bell size={20} strokeWidth={1.6} aria-hidden="true"/></span><div><strong>모임의 새 기록</strong><p>모임원이 공유한 티끌을 알려드려요.</p></div></div>
   <div><span><MapPin size={20} strokeWidth={1.6} aria-hidden="true"/></span><div><strong>내 주변의 기록</strong><p>앱을 볼 때, 약 100m 안의 기록을 알려요.</p></div></div>
  </div>
  <p className="un-notification-intro-note">근처 알림은 6시간에 한 번, 같은 장소는 다시 알리지 않아요.</p>
  <button type="button" className="un-primary un-notification-intro-primary" onClick={onConfigure}>알림 설정하기<ArrowUpRight size={17} aria-hidden="true"/></button>
  <button type="button" className="un-notification-intro-later" onClick={onLater}>나중에</button>
 </AccessibleDialog>;
}
