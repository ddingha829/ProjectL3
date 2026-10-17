'use client';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GuideScreen } from '@/hooks/useFirstVisitGuides';
import './FirstVisitGuide.css';

type Hint = { text: string; detail?: string; selector?: string; x: number; y: number; w: number; edge?: 'left' | 'right'; fx?: number; fy?: number };
type GuidePage = { label: string; hints: Hint[] };
const guides: Record<GuideScreen, GuidePage[]> = {
  log: [{ label: '첫 로그', hints: [
    { text: '제목 입력', selector: '.quick-title input', x: 211, y: 133, w: 145, fx: .2 },
    { text: '내용 입력', selector: '.photo-memo-panel', x: 46, y: 286, w: 135, fx: .1, fy: .1 },
    { text: '사진 추가', selector: '.quick-actions button:nth-of-type(1)', x: 28, y: 612, w: 95 },
    { text: '장소 추가', selector: '.quick-actions button:nth-of-type(2)', x: 140, y: 612, w: 95 },
    { text: '별점 등\n세부사항 추가', selector: '.quick-actions button:nth-of-type(3)', x: 252, y: 592, w: 112 },
    { text: '로그 저장하기', selector: '.quick-save-button', x: 126, y: 786, w: 150, fx: .86 },
  ] }],
  archive: [
    { label: '메뉴', hints: [
      { text: '로그 추가', selector: '.test-header nav button:nth-child(1)', x: 25, y: 142, w: 124 },
      { text: '올린 로그 리스트', selector: '.test-header nav button:nth-child(2)', x: 170, y: 222, w: 190 },
      { text: '로그 카드 디자인을\n설정하는 스튜디오', selector: '.test-header nav button:nth-child(3)', x: 50, y: 352, w: 260, edge: 'right' },
      { text: '설정', selector: '.test-settings-button', x: 290, y: 115, w: 80 },
    ] },
    { label: '찾기 · 정리', hints: [
      { text: '로그 · 키워드 검색', detail: '제목과 내용 속 키워드로 찾아요.', selector: '.logbook-search', x: 130, y: 290, w: 235, fy: .5 },
      { text: '보기 방식 변경', detail: '리스트 / 카드 / 지도', selector: '.logbook-views', x: 26, y: 410, w: 220 },
      { text: '정렬 순서 변경', detail: '최신순과 오래된순으로 바꿔요.', selector: '.logbook-sort', x: 172, y: 525, w: 195, edge: 'right' },
      { text: '그룹 만들기', detail: '여러 로그를 골라 이름을 붙여 저장해요.', selector: '.logbook-group', x: 26, y: 655, w: 320, edge: 'left' },
    ] },
  ],
  card: [{ label: '로그 카드', hints: [
    { text: '로그로 저장되는\n카드 미리 보기', selector: '.record-card-stage .fit-card-artwork', x: 61, y: 280, w: 270, fx: .94, fy: .2 },
    { text: '카드 프리셋 디자인 선택', detail: '편집은 상단 스튜디오에서.\n왼쪽으로 스와이프해도 이동할 수 있어요.', selector: '.record-preset-controls', x: 29, y: 470, w: 330, fy: .05 },
    { text: '카드 내용\n수정', selector: '.record-card-actions button:nth-child(1)', x: 20, y: 581, w: 110, fy: .2 },
    { text: '카드\n저장', selector: '.record-card-actions button:nth-child(2)', x: 140, y: 581, w: 106, fy: .2 },
    { text: '카카오톡·SNS\n공유하기', selector: '.record-card-actions button:nth-child(3)', x: 255, y: 581, w: 118, fy: .2 },
  ] }],
  studio: [
    { label: '프리셋 목록', hints: [
      { text: '프리셋 목록', detail: '저장한 디자인을 고르거나 +로 추가해요.', selector: '.preset-library', x: 26, y: 290, w: 324, fx: .5, fy: .2 },
      { text: '프리셋 이름\n설정하기', selector: '#preset-name', x: 26, y: 405, w: 180, edge: 'left' },
      { text: '사진용 카드', selector: '.preset-photo-mode button:nth-child(1)', x: 224, y: 399, w: 150, edge: 'right' },
      { text: '텍스트용 카드', selector: '.preset-photo-mode button:nth-child(2)', x: 224, y: 482, w: 150, edge: 'right' },
      { text: '프리셋 설정 미리 보기', detail: '디자인을 바꾸면 카드도 함께 바뀌어요.', selector: '.preset-preview .fit-card-artwork', x: 35, y: 615, w: 320, fx: .94, fy: .7 },
    ] },
    { label: '편집 · 저장', hints: [
      { text: '카드 디자인을 만드는 곳', detail: '여기서 설정하고 저장한 프리셋을\n로그 카드에 적용할 수 있어요.', x: 27, y: 278, w: 330 },
      { text: '디자인 / 색상 / 세부사항', selector: '.preset-tabs', x: 27, y: 390, w: 330, edge: 'left' },
      { text: '원하는 디자인과 색상 선택', detail: '화살표나 목록으로 고를 수 있어요.\n색상 조합은 단어·문장으로도 만들 수 있어요.', selector: '.preset-control-panel', x: 27, y: 475, w: 330, edge: 'right' },
      { text: '카드 기본 프리셋으로', detail: '새 로그의 기본 디자인을 지정해요.', selector: '.preset-default', x: 22, y: 595, w: 170, fy: .2 },
      { text: '프리셋 저장', detail: '설정한 이름으로 디자인을 저장해요.', selector: '.preset-save', x: 205, y: 595, w: 165, fy: .2 },
    ] },
  ],
  settings: [
    { label: '계정 · 화면', hints: [
      { text: '다른 기기에서도 이어 쓰기', detail: '아이디·비밀번호로 데이터를 연동해요.\nSNS 로그인은 추후 지원 예정이에요.', selector: '.modern-settings .settings-card:nth-child(1)', x: 41, y: 271, w: 306, fx: .03, fy: .15 },
      { text: '화면 · 프로필', detail: '테마와 카드에 표시할 닉네임·서명을 설정해요.', selector: '.modern-settings .settings-card:nth-child(2)', x: 41, y: 485, w: 306, fx: .03, fy: .12 },
      { text: '환경 설정', detail: '목록 표시, 장소 추천, 모션·진동 등\n앱 이용을 위한 세부 설정이에요.', selector: '.modern-settings .settings-card:nth-child(3)', x: 41, y: 651, w: 306, fx: .03, fy: .12 },
    ] },
    { label: '설치 · 백업', hints: [
      { text: '홈 화면에 바로 설치', detail: '홈 화면에서 앱처럼 빠르게 열어보세요.', selector: '.settings-pwa-actions', x: 40, y: 311, w: 310, edge: 'right' },
      { text: '데이터 백업 · 구글 지도 연동', detail: '구글 지도 데이터를 가져오고 내보내요.\n내 로그를 JSON·CSV 등으로 보관할 수 있어요.', selector: '.settings-accordion-trigger', x: 40, y: 487, w: 310, edge: 'left' },
    ] },
  ],
};

interface Props { screen: GuideScreen; onDismiss: () => void }
type Leader = { path: string; x: number; y: number };

/** Preview-style coach marks. The whole backdrop dismisses; tabs are optional. */
export default function FirstVisitGuide({ screen, onDismiss }: Props) {
  const [page, setPage] = useState(0), [visible, setVisible] = useState(false), [leaders, setLeaders] = useState<Leader[]>([]);
  const overlay = useRef<HTMLDivElement>(null), labels = useRef<Array<HTMLDivElement | null>>([]);
  const pages = guides[screen], current = pages[page] || pages[0];
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const install = document.querySelector('.pwa-top-popup');
      const modal = Array.from(document.querySelectorAll('[data-dialog-overlay]')).some(element => screen !== 'settings' || !element.querySelector('.modern-settings'));
      if (install || modal || /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) { clearTimeout(timer); timer=undefined; setVisible(false); return; }
      if (!timer) timer = setTimeout(() => setVisible(true), 450);
    };
    const observer = new MutationObserver(check); observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('focusin', check); check();
    return () => { observer.disconnect(); clearTimeout(timer); document.removeEventListener('focusin', check); };
  }, [screen]);
  useEffect(() => {
    if (screen !== 'settings' || !visible) return;
    const panel = document.querySelector<HTMLElement>('.quick-dialog-panel');
    panel?.scrollTo({ top: page === 0 ? 0 : panel.scrollHeight, behavior: 'instant' });
  }, [screen, page, visible]);
  useEffect(() => {
    if (!visible || !overlay.current) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const siblings = Array.from(document.body.children).filter((el): el is HTMLElement => el instanceof HTMLElement && el !== overlay.current && !['SCRIPT','STYLE','LINK'].includes(el.tagName)).map(el => ({ el, inert: el.inert }));
    siblings.forEach(({ el }) => { el.inert = true; });
    overlay.current.focus({ preventScroll: true });
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || (event.target === overlay.current && ['Enter',' '].includes(event.key))) { event.preventDefault(); onDismiss(); }
      if (event.key === 'Tab') {
        const buttons = Array.from(overlay.current?.querySelectorAll<HTMLButtonElement>('button') || []);
        const first=buttons[0],last=buttons.at(-1);
        if (!first) { event.preventDefault(); return; }
        if (event.shiftKey && (document.activeElement===first||document.activeElement===overlay.current)) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement===last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown',key);
    return () => { document.removeEventListener('keydown',key); siblings.forEach(({el,inert})=>{el.inert=inert;}); if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true}); };
  }, [visible, onDismiss]);
  useLayoutEffect(() => {
    if (!visible) return;
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame); frame=requestAnimationFrame(()=>{
        const w=window.innerWidth,h=window.innerHeight,scale=Math.min(1,Math.max(.76,h/844));
        overlay.current?.style.setProperty('--guide-scale',String(scale));
        const scope = (selector: string) => Array.from(document.querySelectorAll<HTMLElement>(selector)).find(el=>!el.closest('.test-outgoing-host,.fit-card-outgoing'));
        const next: Leader[]=[];
        current.hints.forEach((hint,index)=>{
          const label=labels.current[index];if(!label)return;
          const columnWidth=Math.min(390,w),left=(w-columnWidth)/2;
          let x=left+hint.x*columnWidth/390,y=hint.y*h/844;
          label.style.width=`${Math.min(hint.w*columnWidth/390,w-32)}px`;label.style.left=`${x}px`;label.style.top=`${y}px`;
          let r=label.getBoundingClientRect();
          if(r.right>w-12){x-=r.right-w+12;label.style.left=`${x}px`;}
          const bottomGap=screen==='archive'?58:12;
          if(r.bottom>h-bottomGap){y-=r.bottom-h+bottomGap;label.style.top=`${y}px`;}
          r=label.getBoundingClientRect();
          const target=hint.selector?scope(hint.selector):null;if(!target)return;
          const t=target.getBoundingClientRect();if(t.bottom<0||t.top>h)return;
          const end={x:t.x+t.width*(hint.fx??.5),y:Math.min(h-20,Math.max(12,t.y+t.height*(hint.fy??.5)))};
          const above=end.y<r.top,below=end.y>r.bottom;
          let start={x:Math.max(r.left+12,Math.min(r.right-12,end.x)),y:above?r.top-7:below?r.bottom+7:r.top+r.height/2};
          if(!above&&!below)start={x:end.x<r.left?r.left-8:r.right+8,y:r.top+r.height/2};
          let path=`M ${start.x} ${start.y} L ${end.x} ${end.y}`;
          if(hint.edge){const edge=hint.edge==='left'?Math.max(8,left+7):Math.min(w-8,left+383);start={x:hint.edge==='left'?r.left-7:r.right+7,y:r.top+r.height/2};const approach=end.y+(above?30:-30);path=`M ${start.x} ${start.y} L ${edge} ${start.y} L ${edge} ${approach} L ${end.x} ${approach} L ${end.x} ${end.y}`;}
          next.push({path,...end});
        });
        setLeaders(next);
      });
    };
    const observer=new ResizeObserver(measure);document.querySelectorAll('.test-header,.test-main,.modern-settings,.quick-dialog-panel').forEach(el=>observer.observe(el));
    window.addEventListener('resize',measure);window.addEventListener('scroll',measure,true);window.visualViewport?.addEventListener('resize',measure);
    void document.fonts.ready.then(measure);measure();
    return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',measure);window.removeEventListener('scroll',measure,true);window.visualViewport?.removeEventListener('resize',measure);};
  }, [visible, current]);
  if (!visible) return null;
  return createPortal(<div ref={overlay} className={`first-visit-guide guide-${screen}`} role="dialog" aria-modal="true" aria-label={`${current.label} 사용 가이드`} tabIndex={-1} onClick={onDismiss}>
    <svg className="first-guide-lines" aria-hidden="true">{leaders.map((line,index)=><g key={index}><path d={line.path}/><circle cx={line.x} cy={line.y} r="2.6"/></g>)}</svg>
    {current.hints.map((hint,index)=><div className="first-guide-label" ref={element=>{labels.current[index]=element;}} key={`${screen}-${page}-${index}`}><strong>{hint.text}</strong>{hint.detail&&<p>{hint.detail}</p>}</div>)}
    <div className="first-guide-footer" onClick={event=>event.stopPropagation()}>
      {pages.length>1&&<nav aria-label="가이드 내용">{pages.map((entry,index)=><button type="button" key={entry.label} aria-pressed={page===index} onClick={()=>setPage(index)}>{entry.label}</button>)}</nav>}
      <button type="button" className="first-guide-close" onClick={onDismiss}>한 번 누르면 닫혀요 ×</button>
    </div>
  </div>,document.body);
}
