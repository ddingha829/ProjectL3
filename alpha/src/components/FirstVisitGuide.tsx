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
      { text: '본인 스타일로\n카드를 디자인하는 곳', selector: '.test-header nav button:nth-child(3)' },
      { text: '설정', selector: '.test-settings-button' },
    ] },
    { label: '찾기 · 정리', hints: [
      { text: '로그 · 키워드 검색', detail: '제목과 내용 속 키워드로 찾아요.', selector: '.logbook-search' },
      { text: '보기 방식 변경', detail: '리스트 / 카드 / 지도', selector: '.logbook-views' },
      { text: '정렬 순서 변경', detail: '최신순과 오래된순으로 바꿔요.', selector: '.logbook-sort' },
      { text: '그룹 만들기', detail: '여러 로그를 골라 이름을 붙여 저장해요.', selector: '.logbook-group' },
    ] },
  ],
  card: [{ label: '이 로그만 꾸미기', hints: [
    { text: '이 로그의 카드 미리 보기', detail: '꾸민 디자인은 이 로그에만 적용돼요.\n‘사진 조정’에서 확대하고 드래그할 수 있어요.', selector: '.record-card-stage .fit-card-artwork' },
    { text: '프리셋을 골라 시작하기', detail: '보관함의 디자인을 골라 바로 적용해 보세요.', selector: '.record-preset-controls' },
    { text: '이 로그만 더 꾸미기', detail: '디자인·색상·비율·표시 항목을 바꿔도\n원본 프리셋은 그대로예요.', selector: '.record-design-tools .preset-tabs' },
    { text: '내용 수정', detail: '제목·메모·사진·장소를 수정해요.', selector: '.record-card-actions button:nth-child(1)' },
    { text: '이 카드에 변경 저장', detail: '미리 본 디자인을 로그북에 저장해요.\n변경 취소를 누르면 저장 전 모양으로 돌아가요.', selector: '.record-card-actions button:nth-child(2)' },
    { text: '공유 · 이미지 저장', detail: '완성한 카드 이미지와 연결한 지도 주소를 공유해요.', selector: '.record-card-actions button:nth-child(3)' },
  ] }],
  studio: [
    { label: '다시 쓸 프리셋 만들기', hints: [
      { text: '프리셋 미리 보기', detail: '여기서 저장하는 것은 재사용할 디자인이에요.\n이미 올린 로그의 카드는 바뀌지 않아요.', selector: '.preset-preview .fit-card-artwork' },
      { text: '프리셋 보관함', detail: '눌러서 썸네일로 고르세요.\n보관함의 ‘정리’로 순서를 바꾸고\n‘새 프리셋’으로 이름을 정해 만들어요.', selector: '.preset-library' },
      { text: '이름 정하기', detail: '나중에 찾기 쉬운 이름을 붙여주세요.', selector: '#preset-name' },
      { text: '사진용 / 텍스트용', detail: '프리셋에 맞는 예시로 디자인해요.\n그룹용은 LIST로 고정돼요.', selector: '.preset-photo-mode' },
    ] },
    { label: '편집 · 저장', hints: [
      { text: '디자인 / 색상 / 세부사항', detail: '화살표로 넘기거나 눌러서 고르세요.\n팔레트 만들기는 색상 목록에 있어요.', selector: '.preset-tabs' },
      { text: '새 로그의 기본 디자인', detail: '전체 또는 분류별 기본 프리셋으로 지정해요.', selector: '.preset-default' },
      { text: '프리셋 저장', detail: '저장한 디자인은 카드 상세의\n프리셋 보관함에서 고를 수 있어요.', selector: '.preset-save' },
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
