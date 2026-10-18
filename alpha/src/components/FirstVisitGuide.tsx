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
    { text: '내용 입력', selector: '.photo-memo-panel' },
    { text: '사진 추가', selector: '.quick-actions button:nth-of-type(1)' },
    { text: '장소 추가', selector: '.quick-actions button:nth-of-type(2)' },
    { text: '별점 등\n세부사항 추가', selector: '.quick-actions button:nth-of-type(3)' },
    { text: '로그 저장하기', selector: '.quick-save-button' },
  ] }],
  archive: [
    { label: '메뉴', hints: [
      { text: '로그 추가', selector: '.test-header nav button:nth-child(1)' },
      { text: '올린 로그 리스트', selector: '.test-header nav button:nth-child(2)' },
      { text: '로그 카드 디자인을\n설정하는 스튜디오', selector: '.test-header nav button:nth-child(3)' },
      { text: '설정', selector: '.test-settings-button' },
    ] },
    { label: '찾기 · 정리', hints: [
      { text: '로그 · 키워드 검색', detail: '제목과 내용 속 키워드로 찾아요.', selector: '.logbook-search' },
      { text: '보기 방식 변경', detail: '리스트 / 카드 / 지도', selector: '.logbook-views' },
      { text: '정렬 순서 변경', detail: '최신순과 오래된순으로 바꿔요.', selector: '.logbook-sort' },
      { text: '그룹 만들기', detail: '여러 로그를 골라 이름을 붙여 저장해요.', selector: '.logbook-group' },
    ] },
  ],
  card: [{ label: '로그 카드', hints: [
    { text: '로그로 저장되는\n카드 미리 보기', selector: '.record-card-stage .fit-card-artwork' },
    { text: '카드 프리셋 디자인 선택', detail: '편집은 상단 스튜디오에서.\n왼쪽으로 스와이프해도 이동할 수 있어요.', selector: '.record-preset-controls' },
    { text: '카드 내용\n수정', selector: '.record-card-actions button:nth-child(1)' },
    { text: '카드\n저장', selector: '.record-card-actions button:nth-child(2)' },
    { text: '카카오톡·SNS\n공유하기', selector: '.record-card-actions button:nth-child(3)' },
  ] }],
  studio: [
    { label: '프리셋 목록', hints: [
      { text: '프리셋 목록', detail: '저장한 디자인을 고르거나 +로 추가해요.\n옆의 손잡이를 드래그하면 순서를 바꿔요.', selector: '.preset-library' },
      { text: '프리셋 이름\n설정하기', selector: '#preset-name' },
      { text: '사진용 카드', selector: '.preset-photo-mode button:nth-child(1)' },
      { text: '텍스트용 카드', selector: '.preset-photo-mode button:nth-child(2)' },
      { text: '프리셋 설정 미리 보기', detail: '디자인을 바꾸면 카드도 함께 바뀌어요.', selector: '.preset-preview .fit-card-artwork' },
    ] },
    { label: '편집 · 저장', hints: [
      { text: '카드 디자인을 만드는 곳', detail: '여기서 설정하고 저장한 프리셋을\n로그 카드에 적용할 수 있어요.' },
      { text: '디자인 / 색상 / 세부사항', selector: '.preset-tabs' },
      { text: '원하는 디자인과 색상 선택', detail: '화살표나 목록으로 고를 수 있어요.\n색상 조합은 단어·문장으로도 만들 수 있어요.', selector: '.preset-control-panel' },
      { text: '카드 기본 프리셋으로', detail: '전체 또는 카테고리별로 기본 디자인을 지정해요.', selector: '.preset-default' },
      { text: '프리셋 저장', detail: '설정한 이름으로 디자인을 저장해요.', selector: '.preset-save' },
    ] },
  ],
  settings: [
    { label: '계정 · 화면', hints: [
      { text: '다른 기기에서도 이어 쓰기', detail: '아이디·비밀번호로 데이터를 연동해요.\nSNS 로그인은 추후 지원 예정이에요.', selector: '.modern-settings .settings-card:nth-child(1)' },
      { text: '화면 · 프로필', detail: '테마와 카드에 표시할 닉네임·서명을 설정해요.', selector: '.modern-settings .settings-card:nth-child(2)' },
      { text: '환경 설정', detail: '목록 표시, 장소 추천, 모션·진동 등\n앱 이용을 위한 세부 설정이에요.', selector: '.modern-settings .settings-card:nth-child(3)' },
    ] },
    { label: '설치 · 백업', hints: [
      { text: '홈 화면에 바로 설치', detail: '홈 화면에서 앱처럼 빠르게 열어보세요.', selector: '.settings-pwa-actions' },
      { text: '데이터 백업 · 구글 지도 연동', detail: '구글 지도 데이터를 가져오고 내보내요.\n로그와 사진을 ZIP으로 보관할 수 있어요.', selector: '.settings-accordion-trigger' },
    ] },
  ],
};

interface Props { screen: GuideScreen; onDismiss: () => void }
type Box = { left: number; top: number; width: number; height: number };

/** One real target per step; measurements follow the current viewport and scroll. */
export default function FirstVisitGuide({ screen, onDismiss }: Props) {
  const steps = guides[screen].flatMap(page => page.hints.map(hint => ({ ...hint, label: page.label })));
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
      const competing = document.querySelector('.pwa-top-popup') || Array.from(document.querySelectorAll('[data-dialog-overlay]')).some(element => screen !== 'settings' || !element.querySelector('.modern-settings'));
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
    const target = current.selector ? Array.from(document.querySelectorAll<HTMLElement>(current.selector)).find(el => !el.closest('.test-outgoing-host,.fit-card-outgoing')) : null;
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
