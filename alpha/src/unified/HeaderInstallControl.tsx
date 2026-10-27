'use client';
import {useEffect,useState} from 'react';
import {ArrowUpFromLine,Check,Copy,Download,Ellipsis,Monitor,PlusSquare,Share,Smartphone} from 'lucide-react';
import AccessibleDialog from '@/components/AccessibleDialog';
import type {PwaPlatform,PwaState} from '@/components/PwaInstallControl';
import './HeaderInstallControl.css';

const guides={
 ios:[{icon:Share,title:'Safari에서 공유 열기',body:'공유 버튼이 안 보이면 메뉴 안에서 찾아요.'},{icon:PlusSquare,title:'홈 화면에 추가',body:'공유 목록을 아래로 내려 선택해요.'},{icon:Smartphone,title:'추가한 아이콘으로 실행',body:'‘웹 앱으로 열기’가 보이면 켜고 추가해요.'}],
 android:[{icon:Ellipsis,title:'Chrome 메뉴 열기',body:'주소창 옆 ⋮ 버튼을 눌러요.'},{icon:Download,title:'앱 설치 · 홈 화면에 추가',body:'메뉴에서 선택하고 설치를 확인해요.'},{icon:Smartphone,title:'추가한 아이콘으로 실행',body:'홈 화면에서 앱처럼 바로 열어요.'}],
 desktop:[{icon:Monitor,title:'Chrome · Edge에서 열기',body:'이 사이트를 지원 브라우저에서 열어요.'},{icon:Download,title:'주소창의 설치 아이콘',body:'아이콘이나 브라우저 메뉴에서 앱 설치를 골라요.'},{icon:Check,title:'설치한 앱으로 실행',body:'시작 메뉴나 앱 목록에서 바로 열어요.'}],
};

export default function HeaderInstallControl({pwa}:{pwa:PwaState}){
 const [platform,setPlatform]=useState<PwaPlatform>(pwa.platform),[copy,setCopy]=useState<'idle'|'done'|'manual'>('idle'),[address,setAddress]=useState(''),[installing,setInstalling]=useState(false);
 useEffect(()=>{setPlatform(pwa.platform);},[pwa.platform]);
 useEffect(()=>{if(pwa.guideOpen){setCopy('idle');setAddress(`${location.origin}${location.pathname}`);}},[pwa.guideOpen]);
 const copyAddress=async()=>{try{await navigator.clipboard.writeText(address);setCopy('done');}catch{setCopy('manual');}};
 const install=async()=>{if(installing)return;setInstalling(true);try{await pwa.triggerInstall();}finally{setInstalling(false);}};
 if(!pwa.ready||pwa.isStandalone)return null;
 return <>
  <button type="button" className="un-install-trigger" aria-label="웹앱 설치 안내" aria-haspopup="dialog" onClick={pwa.openGuide}><ArrowUpFromLine size={15} strokeWidth={1.7}/><span>앱 설치</span></button>
  <AccessibleDialog open={pwa.guideOpen} title="홈 화면에서 더 편하게" onClose={pwa.closeGuide} closeLabel="설치 안내 닫기" panelClassName="lab-dialog un-install-dialog">
   <p className="un-install-lead">웹앱에 맞춘 화면으로, 주소창 없이 넓게 써보세요.</p>
   {pwa.inAppName&&<div className="un-install-inapp"><Smartphone size={18}/><p>{pwa.inAppName} 안에서는 먼저 <strong>{pwa.platform==='ios'?'Safari':'Chrome'}</strong>로 열어주세요.<small>브라우저 메뉴의 ‘다른 브라우저로 열기’를 이용해요.</small></p></div>}
   <div className="un-install-platforms" role="group" aria-label="설치할 기기">{([['ios','iPhone · iPad'],['android','Android'],['desktop','PC']] as const).map(([id,label])=><button type="button" key={id} aria-pressed={platform===id} onClick={()=>setPlatform(id)}>{label}</button>)}</div>
   <ol className="un-install-steps">{guides[platform].map(({icon:Icon,title,body},index)=><li key={title}><span className="un-install-step-icon" aria-hidden="true"><Icon size={19} strokeWidth={1.65}/></span><div><strong>{index+1}. {title}</strong><p>{body}</p></div></li>)}</ol>
   {pwa.canPromptNative&&!pwa.inAppName&&platform===pwa.platform&&<button type="button" className="un-primary un-install-native" disabled={installing} onClick={()=>void install()}><Download size={17}/>{installing?'설치 창을 확인해주세요':'앱 설치'}</button>}
   {pwa.inAppName&&<><button type="button" className="un-outline un-install-copy" onClick={()=>void copyAddress()}>{copy==='done'?<Check size={15}/>:<Copy size={15}/>} {copy==='done'?'주소를 복사했어요':'주소 복사'}</button>{copy==='manual'&&<label className="un-install-address">주소를 길게 눌러 복사해주세요.<input readOnly aria-label="외부 브라우저에서 열 주소" value={address} onFocus={event=>event.currentTarget.select()}/></label>}</>}
  </AccessibleDialog>
 </>;
}
