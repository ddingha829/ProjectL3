'use client';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { GuideScreen } from '@/hooks/useFirstVisitGuides';
import './FirstVisitGuide.css';

type Hint = { text: string; detail?: string; selector?: string };
type GuidePage = { label: string; hints: Hint[] };
const guides: Record<GuideScreen, GuidePage[]> = {
  log: [{ label: '첫 로그', hints: [
    { text: '제목 입력', selector: '.quick-title input' },
    { text: '내용 입력', detail: '직접 쓰거나 마이크로 말해 보세요.\n음성 입력을 마친 뒤 내용을 확인하고 저장해요.', selector: '.photo-memo-panel, .voice-log-input' },
    { text: '사진 한 장 추가', detail: '작성 칸 왼쪽 아래 카메라를 눌러\n앨범에서 고르거나 바로 촬영해요.', selector: '.quick-camera-button' },
    { text: '영화 · 드라마 포스터', detail: '작품을 검색해 포스터와 짧은 소개를 담아요.', selector: '.quick-movie-button' },
    { text: '책 표지 추가', detail: '제목·저자·ISBN으로 찾아 표지와 소개를 담아요.', selector: '.quick-book-button' },
    { text: '장소 추가', selector: '.quick-actions button:nth-of-type(3)' },
    { text: '별점 · 일어난 날짜', detail: '실제 일어난 날짜와 시간을 정할 수 있어요.\n비워두면 저장한 시간을 사용해요.', selector: '.quick-actions button:nth-of-type(4)' },
    { text: '로그 저장하기', selector: '.quick-save-button' },
  ] }],
  archive: [
    { label: '메뉴', hints: [
      { text: '로그 추가', selector: '.test-header nav button:nth-child(1)' },
      { text: '올린 로그 리스트', selector: '.test-header nav button:nth-child(2)' },
      { text: '본인 스타일로\n카드를 디자인하는 곳', selector: '.test-header nav button:nth-child(3)' },
      { text: '날짜별로 다시 보는 일상', detail: '달력 아이콘을 눌러 날짜와 기간별로\n로그와 장소의 흐름을 볼 수 있어요.', selector: '.test-calendar-button' },
      { text: '설정', selector: '.test-settings-button' },
    ] },
    { label: '찾기 · 정리', hints: [
      { text: '로그 · 키워드 검색', detail: '제목과 내용 속 키워드로 찾아요.', selector: '.logbook-search' },
      { text: '보기 방식 변경', detail: '리스트 / 카드 / 지도', selector: '.logbook-views' },
      { text: '정렬 순서 변경', detail: '최신순과 오래된순으로 바꿔요.', selector: '.logbook-sort' },
      { text: '그룹 만들기', detail: '여러 로그를 골라 이름을 붙여 저장해요.', selector: '.logbook-group' },
    ] },
  ],
  calendar: [{ label: '일상을 다시 펼치기', hints: [
    { text: '사진으로 채워지는 달력', detail: '사진이 있는 날은 대표 사진이 보여요.\n날짜를 누르면 시간순 로그가 펼쳐져요.', selector: '.calendar-days' },
    { text: '하루 또는 원하는 기간', detail: '기간을 선택해 여러 날의 로그를 한 번에 모아보세요.', selector: '.calendar-range-button' },
    { text: '기록한 장소를 따라가기', detail: '로그에 연결한 장소를 시간순으로 이어요.\n경로 재생으로 다시 따라가 볼 수 있어요.', selector: '.calendar-map-panel' },
  ] }],
  card: [{ label: '이 로그만 꾸미기', hints: [
    { text: '이 로그의 카드 미리 보기', detail: '카드가 천천히 움직이며 입체감을 보여줘요.\n모바일에서는 카드를 눌러 수정 메뉴를 열고 닫을 수 있어요.\n꾸민 디자인은 이 로그에만 적용돼요.', selector: '.record-card-stage .fit-card-artwork' },
    { text: '카드 수정 메뉴 열기', detail: '모바일에서는 카드를 누르거나 아래 화살표를 눌러 편집해요. 위로 밀어도 열려요.\n넓은 화면에서는 오른쪽 메뉴를 사용해요.', selector: '.record-editor-handle, .record-edit-drawer' },
    { text: '프리셋을 골라 시작하기', detail: '프리셋 보관함을 열거나 디자인 썸네일로 고르세요.\n색상·세부사항도 이 로그에만 적용돼요.', selector: '.record-preset-controls' },
    { text: '이 로그만 더 꾸미기', detail: '디자인·색상·비율·사진 채도·명도·밝기를 바꿔도\n원본 프리셋은 그대로예요.', selector: '.record-design-tools .preset-tabs' },
    { text: '내용 수정', detail: '제목·메모·사진·장소를 수정해요.', selector: '.record-card-actions button:nth-child(1)' },
    { text: '이 카드에 변경 저장', detail: '미리 본 디자인을 로그북에 저장해요.\n되돌리기로 한 단계씩, 원본 비교로 저장 전 모습을 확인해요.', selector: '.record-card-actions button:nth-child(2)' },
    { text: '공유 · 이미지 저장', detail: '위치 문구·지도 링크·서명을 고른 뒤 공유해요.\n이번 공유에만 적용되고 원본은 유지돼요.', selector: '.record-card-actions button:nth-child(3)' },
  ] }],
  studio: [
    { label: '다시 쓸 프리셋 만들기', hints: [
      { text: '프리셋 미리 보기', detail: '여기서 저장하는 것은 재사용할 디자인이에요.\n이미 올린 로그의 카드는 바뀌지 않아요.', selector: '.preset-preview .fit-card-artwork' },
      { text: '프리셋 보관함', detail: '눌러서 썸네일로 고르세요.\n보관함의 ‘정리’로 순서를 바꾸고\n‘새 프리셋’으로 이름을 정해 만들어요.', selector: '.preset-library' },
      { text: '이름 정하기', detail: '나중에 찾기 쉬운 이름을 붙여주세요.', selector: '#preset-name' },
      { text: '사진용 / 텍스트용', detail: '프리셋에 맞는 예시로 디자인해요.\n그룹용은 LIST로 고정돼요.', selector: '.preset-photo-mode' },
    ] },
    { label: '편집 · 저장', hints: [
      { text: '디자인 / 색상 / 세부사항', detail: '디자인은 썸네일로, 색상은 글자 예시로 골라요.\n세부사항에서는 카드를 보면서 표시·사진 보정을 조절해요.', selector: '.preset-tabs' },
      { text: '새 로그의 기본 디자인', detail: '전체 또는 분류별 기본 프리셋으로 지정해요.', selector: '.preset-default' },
      { text: '프리셋 저장', detail: '디자인·색상·세부사항을 고르고 저장해요.\n되돌리기·원본 비교로 확인하고, 새 로그 기본값도 지정할 수 있어요.', selector: '.preset-save' },
    ] },
  ],
  settings: [
    { label: '계정 · 화면', hints: [
      { text: '다른 기기에서도 이어 쓰기', detail: '구글 또는 아이디·비밀번호로 연결해요.\n비회원으로 쓴 로그도 함께 이어집니다.', selector: '.modern-settings .settings-card:nth-of-type(1)' },
      { text: '화면 · 프로필', detail: '테마와 카드에 표시할 닉네임·서명을 설정해요.', selector: '.modern-settings .settings-card:nth-of-type(2)' },
      { text: '환경 설정', detail: '목록 표시, 장소 추천, 모션·진동 등\n앱 이용을 위한 세부 설정이에요.', selector: '.modern-settings .settings-card:nth-of-type(3)' },
    ] },
    { label: '설치 · 백업', hints: [
      { text: '홈 화면에 바로 설치', detail: '홈 화면에서 앱처럼 빠르게 열어보세요.', selector: '.settings-pwa-actions' },
      { text: '백업 · 복원 · 지도 연동', detail: '로그와 사진을 ZIP으로 보관하고\nZIP·JSON 백업을 다시 불러올 수 있어요.\n복원 전 중복과 누락 사진을 확인해요.', selector: '.settings-accordion-trigger' },
    ] },
  ],
};

interface Props { screen: GuideScreen; mode?:'intro'|'full'; onDismiss: () => void }
type Box = { left: number; top: number; width: number; height: number };

/** One real target per step; measurements follow the current viewport and scroll. */
export default function FirstVisitGuide({ screen, mode='intro', onDismiss }: Props) {
  const allSteps = guides[screen].flatMap(page => page.hints.map(hint => ({ ...hint, label: page.label })));
  const introSelectors:Record<GuideScreen,string[]>={
    log:['.quick-title input','.photo-memo-panel, .voice-log-input','.quick-save-button'],
    archive:['.logbook-search','.logbook-views','.logbook-group'],
    calendar:['.calendar-days','.calendar-range-button','.calendar-map-panel'],
    card:['.record-card-stage .fit-card-artwork','.record-preset-controls','.record-card-actions button:nth-child(2)'],
    studio:['.preset-preview .fit-card-artwork','.preset-library','.preset-save'],
    settings:['.modern-settings .settings-card:nth-of-type(1)','.modern-settings .settings-card:nth-of-type(2)','.settings-accordion-trigger'],
  };
  const steps=mode==='full'?allSteps:introSelectors[screen].map(selector=>allSteps.find(step=>step.selector===selector)!).filter(Boolean);
  const [step, setStep] = useState(0), [visible, setVisible] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const [caption, setCaption] = useState({ left: 16, top: 120, width: 320 });
  const overlay = useRef<HTMLDivElement>(null), label = useRef<HTMLDivElement>(null);
  const current = steps[step] || steps[0];
  const next = useCallback(() => {
    if (step < steps.length - 1) setStep(value => value + 1);
    else onDismiss();
  }, [step, steps.length, onDismiss]);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const check = () => {
      const competing = document.querySelector('.pwa-top-popup') || screen==='calendar'&&document.querySelector('.calendar-timeline') || Array.from(document.querySelectorAll('[data-dialog-overlay]')).some(element => screen !== 'settings' || !element.querySelector('.modern-settings'));
      if (competing || /^(INPUT|TEXTAREA)$/.test(document.activeElement?.tagName || '')) {
        clearTimeout(timer); timer = undefined; setVisible(false); return;
      }
      if (!timer) timer = setTimeout(() => setVisible(true), 450);
    };
    const observer = new MutationObserver(check); observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('focusin', check); document.addEventListener('focusout', check); check();
    return () => { observer.disconnect(); clearTimeout(timer); document.removeEventListener('focusin', check); document.removeEventListener('focusout', check); };
  }, [screen]);
  useEffect(() => {
    if (!visible || !overlay.current) return;
    const previousFocus = document.activeElement as HTMLElement | null;
    const siblings = Array.from(document.body.children).filter((el): el is HTMLElement => el instanceof HTMLElement && el !== overlay.current && !['SCRIPT','STYLE','LINK'].includes(el.tagName)).map(el => ({ el, inert: el.inert }));
    siblings.forEach(({ el }) => { el.inert = true; });
    overlay.current.focus({ preventScroll: true });
    return () => { siblings.forEach(({ el, inert }) => { el.inert = inert; }); if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true }); };
  }, [visible]);
  useEffect(() => {
    if (!visible) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.preventDefault(); onDismiss(); }
      if (event.target === overlay.current && ['Enter',' '].includes(event.key)) { event.preventDefault(); next(); }
      if (event.key === 'Tab') {
        const buttons = Array.from(overlay.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') || []);
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && (document.activeElement === first || document.activeElement === overlay.current)) { event.preventDefault(); last?.focus(); }
        if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
    document.addEventListener('keydown', key); return () => document.removeEventListener('keydown', key);
  }, [visible, next, onDismiss]);
  useLayoutEffect(() => {
    if (!visible) return;
    if(screen==='card')window.dispatchEvent(new CustomEvent('l2:card-guide-editor',{detail:!['.record-card-stage .fit-card-artwork','.record-editor-handle, .record-edit-drawer'].includes(current.selector||'')}));
    const target = current.selector ? Array.from(document.querySelectorAll<HTMLElement>(current.selector)).find(el => !el.closest('.test-outgoing-host,.fit-card-outgoing') && (!current.selector?.includes(',') || el.getClientRects().length)) : null;
    if (target) {
      const r = target.getBoundingClientRect();
      if (r.top < 12 || r.bottom > window.innerHeight - 86) target.scrollIntoView({ block: 'center', behavior: 'instant' });
    }
    let frame = 0;
    const measure = () => {
      cancelAnimationFrame(frame); frame = requestAnimationFrame(() => {
        const w = window.innerWidth, h = window.innerHeight;
        const r = target?.getBoundingClientRect();
        const b = r && r.width && r.height ? { left: Math.max(8, r.left - 4), top: Math.max(8, r.top - 4), width: Math.min(w - 16, r.width + 8), height: Math.min(h - 100, r.height + 8) } : null;
        setBox(b);
        const width = Math.min(340, w - 40), height = label.current?.offsetHeight || 140;
        const inside = b && b.height > height + 32 && b.width > width;
        const top = !b ? (h - height) / 2 : inside ? b.top + (b.height - height) / 2 : b.top + b.height + height + 24 < h - 86 ? b.top + b.height + 16 : b.top - height - 16;
        setCaption({ left: Math.max(20, Math.min(w - width - 20, b ? b.left + (b.width - width) / 2 : (w - width) / 2)), top: Math.max(16, Math.min(h - height - 90, top)), width });
      });
    };
    const observer = new ResizeObserver(measure); if (target) observer.observe(target); if (label.current) observer.observe(label.current);
    window.addEventListener('resize', measure); window.addEventListener('scroll', measure, true); window.visualViewport?.addEventListener('resize', measure);
    measure();
    return () => { observer.disconnect(); cancelAnimationFrame(frame); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); window.visualViewport?.removeEventListener('resize', measure); };
  }, [visible, screen, step, current.selector]);
  if (!visible) return null;
  return createPortal(<div ref={overlay} className={`first-visit-guide guide-${screen} ${box ? '' : 'without-target'}`} role="dialog" aria-modal="true" aria-label={`${current.label} 사용 가이드`} aria-describedby="first-guide-description" tabIndex={-1} onClick={next}>
    {box && <div className="first-guide-highlight" style={box} aria-hidden="true"/>}
    <div ref={label} id="first-guide-description" className="first-guide-label" style={caption} key={`${screen}-${step}`} aria-live="polite"><small>{current.label} · {step + 1} / {steps.length}</small><strong>{current.text}</strong>{current.detail && <p>{current.detail}</p>}</div>
    <div className="first-guide-footer" onClick={event => event.stopPropagation()}>
      <button type="button" onClick={onDismiss}>건너뛰기</button><button type="button" disabled={step === 0} onClick={() => setStep(value => Math.max(0, value - 1))}>이전</button><button type="button" className="first-guide-next" onClick={next}>{step === steps.length - 1 ? '시작하기' : '다음'}</button>
      <span>{step === steps.length - 1 ? '누르면 가이드가 끝나요' : '화면을 누르면 다음 안내로'}</span>
    </div>
  </div>, document.body);
}
