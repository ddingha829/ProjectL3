'use client';

import { useEffect, useState } from 'react';
import { Download, ExternalLink, Share, PlusSquare, Smartphone, CheckCircle2, Sparkles } from 'lucide-react';
import AccessibleDialog from './AccessibleDialog';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
  prompt(): Promise<void>;
}

export type PwaPlatform = 'ios' | 'android' | 'desktop';

export interface PwaState {
  isStandalone: boolean;
  canPromptNative: boolean;
  platform: PwaPlatform;
  inAppName: string | null;
  triggerInstall: () => Promise<'installed' | 'guide'>;
  openGuide: () => void;
  closeGuide: () => void;
  guideOpen: boolean;
}

const DISMISS_KEY = 'l2_pwa_banner_dismissed_v1';

export function usePwaInstall(): PwaState {
  const [isStandalone, setIsStandalone] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<PwaPlatform>('desktop');
  const [inAppName, setInAppName] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkStandalone = () => {
      const standalone =
        Boolean((window.navigator as unknown as { standalone?: boolean }).standalone) ||
        window.matchMedia('(display-mode: standalone)').matches;
      setIsStandalone(standalone);
      if (standalone) {
        document.documentElement.dataset.standalone = 'true';
      } else {
        delete document.documentElement.dataset.standalone;
      }
    };

    checkStandalone();
    const media = window.matchMedia('(display-mode: standalone)');
    media.addEventListener?.('change', checkStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS =
      /iphone|ipad|ipod/.test(ua) ||
      (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
    const isAndroid = /android/.test(ua);

    if (isIOS) setPlatform('ios');
    else if (isAndroid) setPlatform('android');
    else setPlatform('desktop');

    if (ua.includes('kakaotalk')) setInAppName('카카오톡');
    else if (ua.includes('instagram')) setInAppName('인스타그램');
    else if (ua.includes('naver')) setInAppName('네이버');
    else if (ua.includes('fban') || ua.includes('fbav')) setInAppName('페이스북');
    else if (ua.includes('line/')) setInAppName('라인');

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsStandalone(true);
      setDeferredPrompt(null);
      setGuideOpen(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      media.removeEventListener?.('change', checkStandalone);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const triggerInstall = async (): Promise<'installed' | 'guide'> => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === 'accepted') {
          setDeferredPrompt(null);
          return 'installed';
        }
      } catch {
        // Fallback to guide modal
      }
    }
    setGuideOpen(true);
    return 'guide';
  };

  return {
    isStandalone,
    canPromptNative: Boolean(deferredPrompt),
    platform,
    inAppName,
    triggerInstall,
    openGuide: () => setGuideOpen(true),
    closeGuide: () => setGuideOpen(false),
    guideOpen,
  };
}

export function PwaInstallBanner({ pwa }: { pwa: PwaState }) {
  const [dismissed, setDismissed] = useState(true);
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = localStorage.getItem(DISMISS_KEY) === '1';
      setDismissed(saved);
      if (!saved) {
        const timer = setTimeout(() => setVisible(true), 280);
        return () => clearTimeout(timer);
      }
    } catch {
      setDismissed(false);
      setVisible(true);
    }
  }, []);

  if (pwa.isStandalone || dismissed || !visible) return null;

  const dismiss = () => {
    setClosing(true);
    try {
      localStorage.setItem(DISMISS_KEY, '1');
    } catch {
      /* ignore */
    }
    setTimeout(() => {
      setDismissed(true);
      setClosing(false);
    }, 260);
  };

  return (
    <aside
      className={`pwa-top-popup ${closing ? 'is-closing' : ''}`}
      role="region"
      aria-label="홈 화면에 앱 설치 안내"
    >
      <div className="pwa-floating-icon" aria-hidden="true">
        L2<span>.</span>
      </div>
      <div className="pwa-floating-copy">
        <strong>
          {pwa.inAppName
            ? `${pwa.inAppName} 인앱 브라우저 접속 중`
            : '홈 화면에 L2. 앱으로 추가해보세요'}
        </strong>
        <span>
          {pwa.inAppName === '카카오톡'
            ? '우측 하단 공유[↑] → [Safari로 열기]에서 설치 가능'
            : pwa.inAppName
            ? '외부 브라우저(Safari·Chrome)로 열면 설치할 수 있어요'
            : '주소창 없는 전체화면·오프라인 보관을 지원해요'}
        </span>
      </div>
      <div className="pwa-floating-actions">
        {pwa.canPromptNative && (
          <button
            type="button"
            className="pwa-floating-primary"
            onClick={() => void pwa.triggerInstall()}
          >
            바로 설치
          </button>
        )}
        <button
          type="button"
          className={pwa.canPromptNative ? 'pwa-floating-secondary' : 'pwa-floating-primary'}
          onClick={pwa.openGuide}
        >
          설치 가이드
        </button>
        <button
          type="button"
          className="pwa-floating-close"
          onClick={dismiss}
          aria-label="설치 안내 끄기"
          title="설치 안내 끄기"
        >
          끄기 ×
        </button>
      </div>
    </aside>
  );
}

export function PwaInstallGuideDialog({ pwa }: { pwa: PwaState }) {
  const [tab, setTab] = useState<'ios' | 'android'>(
    pwa.platform === 'android' ? 'android' : 'ios'
  );
  const [copiedUrl, setCopiedUrl] = useState(false);

  useEffect(() => {
    if (pwa.platform === 'android') setTab('android');
    else setTab('ios');
  }, [pwa.platform]);

  const openInExternalBrowser = () => {
    if (typeof window === 'undefined') return;
    const currentUrl = window.location.href;
    if (pwa.inAppName === '카카오톡') {
      window.location.href = `kakaotalk://web/openExternal?url=${encodeURIComponent(currentUrl)}`;
      return;
    }
    if (pwa.platform === 'android') {
      const noProtocol = currentUrl.replace(/^https?:\/\//i, '');
      window.location.href = `intent://${noProtocol}#Intent;scheme=https;package=com.android.chrome;end`;
      return;
    }
    copyCurrentUrl();
  };

  const copyCurrentUrl = () => {
    if (typeof window === 'undefined') return;
    const currentUrl = window.location.href;
    void navigator.clipboard?.writeText(currentUrl).then(() => {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2500);
    });
  };

  return (
    <AccessibleDialog
      open={pwa.guideOpen}
      onClose={pwa.closeGuide}
      title="홈 화면에 L2. 앱 설치하기"
    >
      <div className="pwa-guide">
        {pwa.isStandalone ? (
          <div className="pwa-guide-status is-installed">
            <CheckCircle2 size={18} />
            <div>
              <strong>현재 홈 화면 앱(PWA) 모드로 실행 중입니다</strong>
              <p>전체화면 모드와 오프라인 캐시가 활성화되어 있습니다.</p>
            </div>
          </div>
        ) : pwa.inAppName ? (
          <div className="pwa-guide-status is-inapp">
            <ExternalLink size={18} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <strong>1단계: 먼저 Safari / Chrome 외부 브라우저로 열어주세요</strong>
              <p>
                현재 <b>{pwa.inAppName}</b> 내부 브라우저에서는 홈 화면 추가 버튼이 숨겨져 있습니다.
              </p>
              <p style={{ marginTop: 6, color: 'var(--text)' }}>
                • <b>방법 1 (추천)</b>: 화면 <b>우측 하단의 공유 아이콘 [↑]</b> (또는 <b>[⋮]</b>)을 누른 뒤{' '}
                <b>[Safari로 열기] / [다른 브라우저로 열기]</b>를 눌러주세요.
              </p>
              <p style={{ marginTop: 4, color: 'var(--text)' }}>
                • <b>방법 2</b>: 아래 버튼으로 바로 외부 브라우저를 열거나, 주소를 복사해 Safari 주소창에 붙여넣어 주세요.
              </p>
              <div style={{ display: 'grid', gap: 6, marginTop: 10 }}>
                {(pwa.inAppName === '카카오톡' || pwa.platform === 'android') && (
                  <button
                    type="button"
                    className="test-button"
                    style={{ minHeight: 38 }}
                    onClick={openInExternalBrowser}
                  >
                    {pwa.platform === 'ios'
                      ? 'Safari 외부 브라우저로 바로 열기'
                      : '외부 브라우저(Chrome)로 바로 열기'}
                  </button>
                )}
                <button
                  type="button"
                  className="test-button"
                  style={{
                    minHeight: 36,
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    border: '1px solid var(--line-strong)',
                  }}
                  onClick={copyCurrentUrl}
                >
                  {copiedUrl
                    ? '✓ 주소 복사 완료! Safari 주소창에 붙여넣어 주세요'
                    : '현재 주소 복사하기'}
                </button>
              </div>
            </div>
          </div>
        ) : null}

        {pwa.canPromptNative && !pwa.isStandalone && (
          <div className="pwa-guide-native-box">
            <div>
              <strong>원탭 설치 지원 브라우저</strong>
              <p>아래 버튼을 누르면 즉시 홈 화면에 L2. 앱이 설치됩니다.</p>
            </div>
            <button
              type="button"
              className="test-button"
              onClick={() => void pwa.triggerInstall()}
            >
              <Download size={15} /> 지금 바로 앱 설치하기
            </button>
          </div>
        )}

        <div className="pwa-guide-tabs" role="tablist" aria-label="운영체제별 설치 방법">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'ios'}
            className={tab === 'ios' ? 'active' : ''}
            onClick={() => setTab('ios')}
          >
            iPhone · iPad (Safari)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'android'}
            className={tab === 'android' ? 'active' : ''}
            onClick={() => setTab('android')}
          >
            Android · PC (Chrome)
          </button>
        </div>

        {tab === 'ios' ? (
          <ol className="pwa-guide-steps">
            <li>
              <span className="pwa-step-num">1</span>
              <div>
                <strong>Safari 하단의 [공유] 버튼 탭</strong>
                <p>
                  하단 주소창 가운데(또는 우측)에 있는{' '}
                  <span className="pwa-inline-badge">
                    <Share size={12} /> 공유
                  </span>{' '}
                  아이콘을 눌러주세요.
                </p>
              </div>
            </li>
            <li>
              <span className="pwa-step-num">2</span>
              <div>
                <strong>[홈 화면에 추가] 선택</strong>
                <p>
                  공유 시트를 살짝 위로 올린 뒤{' '}
                  <span className="pwa-inline-badge">
                    <PlusSquare size={12} /> 홈 화면에 추가
                  </span>
                  를 눌러주세요.
                </p>
              </div>
            </li>
            <li>
              <span className="pwa-step-num">3</span>
              <div>
                <strong>우측 상단 [추가] 완료</strong>
                <p>
                  홈 화면에 생성된 <b>L2.</b> 아이콘으로 실행하면 상하단 주소창 없는 순수 앱 화면으로 작동합니다.
                </p>
              </div>
            </li>
          </ol>
        ) : (
          <ol className="pwa-guide-steps">
            <li>
              <span className="pwa-step-num">1</span>
              <div>
                <strong>브라우저 우측 상단 메뉴 [⋮] 탭</strong>
                <p>Chrome 또는 삼성 인터넷 우측 메뉴 버튼을 눌러주세요.</p>
              </div>
            </li>
            <li>
              <span className="pwa-step-num">2</span>
              <div>
                <strong>[앱 설치] 또는 [홈 화면에 추가] 선택</strong>
                <p>
                  확인 창에서{' '}
                  <span className="pwa-inline-badge">
                    <Smartphone size={12} /> 설치
                  </span>
                  를 누르면 홈 화면과 앱 서랍에 <b>L2.</b> 앱이 설치됩니다.
                </p>
              </div>
            </li>
            <li>
              <span className="pwa-step-num">3</span>
              <div>
                <strong>PC Chrome / Edge에서도 설치 가능</strong>
                <p>
                  데스크톱 주소창 우측의 <b>[앱 설치 ⊕]</b> 아이콘을 누르면 독립된 데스크톱 앱 창으로 실행됩니다.
                </p>
              </div>
            </li>
          </ol>
        )}

        <div className="pwa-guide-tip">
          <Sparkles size={15} />
          <div>
            <strong>설치 전 꼭 확인하세요 (기록 연동 안내)</strong>
            <p>
              아이폰(iOS)은 <b>Safari 브라우저</b>와 <b>홈 화면 앱</b>의 내부 저장소가 분리되어 있습니다.
              테스트 기록을 시작하기 전에 <b>먼저 홈 화면에 추가한 뒤 실행</b>하시거나, 이미 작성한 기록이 있다면{' '}
              <b>설정 ⚙ → 기기 복원 코드 복사 / JSON 백업</b>으로 홈 화면 앱에서 그대로 이어받을 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </AccessibleDialog>
  );
}
