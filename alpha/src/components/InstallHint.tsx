'use client';

import React, { useEffect, useState } from 'react';

export default function InstallHint() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Only show if running in standard mobile browser, not standalone PWA
    const isStandalone =
      (window.navigator as unknown as { standalone?: boolean }).standalone ||
      window.matchMedia('(display-mode: standalone)').matches;

    if (isStandalone) return;

    // Check if dismissed in this session
    if (sessionStorage.getItem('l2_install_hint_dismissed')) return;

    // Check if iOS or mobile
    const ua = window.navigator.userAgent.toLowerCase();
    const isIOS = /iphone|ipad|ipod/.test(ua);
    const isMobile = /android|iphone|ipad|ipod/.test(ua);

    if (isIOS || isMobile) {
      const timer = setTimeout(() => setShow(true), 1200);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    sessionStorage.setItem('l2_install_hint_dismissed', 'true');
    setShow(false);
  };

  if (!show) return null;

  return (
    <aside
      aria-label="홈 화면에 추가 안내"
      className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto p-4 rounded-2xl border border-white/20 bg-black/90 text-white backdrop-blur-xl shadow-2xl animate-fade-in"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-[#08080A] border border-white/10 flex items-center justify-center shrink-0 font-black text-sm tracking-tighter">
          L2<span className="text-[#FF3B1D]">.</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline justify-between gap-2">
            <h4 className="font-black text-xs tracking-tight text-white/90">
              홈 화면에 앱으로 추가하기
            </h4>
            <button
              onClick={handleDismiss}
              className="text-[11px] font-bold opacity-60 hover:opacity-100 cursor-pointer"
            >
              닫기 ✕
            </button>
          </div>
          <p className="text-[11px] leading-relaxed text-white/75 mt-1">
            사파리 하단 공유 버튼(
            <svg
              className="inline w-3 h-3 align-sub"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
              <polyline points="16 6 12 2 8 6" />
              <line x1="12" y1="2" x2="12" y2="15" />
            </svg>
            ) 누른 뒤 <strong className="text-white font-black">[홈 화면에 추가]</strong>를 누르시면 주소창 없는 실제 앱으로 실행됩니다.
          </p>
        </div>
      </div>
    </aside>
  );
}
