'use client';
import {useRef,useState} from 'react';
import AnimatedSaveButton from '@/social/AnimatedSaveButton';
import ShinyButton from '@/components/tweenui/shiny-button';
import {SaveIcon,type SaveIconHandle} from '@/components/icons/save';
import IconTrailButton from '@/components/tweenui/icon-trail-button';
import './preview.css';

export default function ButtonComparison(){
 const [notice,setNotice]=useState('버튼을 눌러 움직임을 확인하세요.'),[dark,setDark]=useState(false),icon=useRef<SaveIconHandle>(null);
 const preview=(name:string)=>setNotice(`${name} · 동작 미리보기입니다. 로그는 저장하지 않아요.`);
 return <main className={`l2-buttons-page ${dark?'is-dark':''}`}>
  <header><a href="/">← 로그로</a><button type="button" onClick={()=>setDark(v=>!v)} aria-pressed={dark}>{dark?'라이트':'다크'} 모드</button></header>
  <div className="l2-buttons-intro"><span>L2 · BUTTON STUDY</span><h1>작게 눌러,<br/>오늘을 남기기.</h1><p>기존 주황색과 세방고딕에 맞춘 Tween UI 버튼 세 가지.</p></div>
  <div className="l2-buttons-grid">
   <article><div className="l2-buttons-card-top"><b>A</b><span>은은한 강조</span></div><div className="l2-buttons-stage"><ShinyButton className="l2-tween-option l2-shiny-option" icon={<SaveIcon ref={icon} size={18} duration={.85} aria-hidden="true"/>} onPointerEnter={event=>{if(event.pointerType==='mouse')icon.current?.startAnimation();}} onPointerLeave={event=>{if(event.pointerType==='mouse')icon.current?.stopAnimation();}} onFocus={event=>{if(event.currentTarget.matches(':focus-visible'))icon.current?.startAnimation();}} onClick={()=>{icon.current?.startAnimation();preview('Shiny');}}>로그 저장</ShinyButton></div><h2>Shiny</h2><p>익숙한 형태에 빛이 한 번 스치는 효과.<br/>저장 아이콘을 가장 깔끔하게 담아요.</p><a href="https://tween-ui.vercel.app/component/shiny-button" target="_blank" rel="noreferrer">원본 보기 ↗</a></article>
   <article className="is-selected"><div className="l2-buttons-card-top"><b>B</b><span>현재 적용</span></div><div className="l2-buttons-stage"><AnimatedSaveButton className="l2-tween-option l2-slide-option" onClick={()=>preview('Slide Arrow')}>로그 저장</AnimatedSaveButton></div><h2>Slide Arrow</h2><p>작은 원 안의 화살표와 글자가 움직여요.<br/>다음 단계로 넘어가는 느낌이 강해요.</p><a href="https://tween-ui.vercel.app/component/slide-arrow-button" target="_blank" rel="noreferrer">원본 보기 ↗</a></article>
   <article><div className="l2-buttons-card-top"><b>C</b><span>조금 더 경쾌하게</span></div><div className="l2-buttons-stage"><IconTrailButton className="l2-tween-option l2-trail-option" labelClassName="l2-trail-label" onClick={()=>preview('Icon Trail')}>로그 저장</IconTrailButton></div><h2>Icon Trail</h2><p>아이콘 영역이 넓어졌다 반대편에 안착해요.<br/>세 가지 중 움직임이 가장 뚜렷해요.</p><a href="https://tween-ui.vercel.app/component/icon-trail-button" target="_blank" rel="noreferrer">원본 보기 ↗</a></article>
  </div>
  <p className="l2-buttons-notice" role="status">{notice}</p>
  <footer><a href="https://animateicons.in/icons/docs/react" target="_blank" rel="noreferrer">저장 아이콘 · AnimateIcons</a><span>모션 감소 설정에서는 움직임을 줄입니다.</span></footer>
 </main>;
}
