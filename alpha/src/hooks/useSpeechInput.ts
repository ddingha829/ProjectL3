'use client';

import { useCallback, useEffect, useRef, useState, type RefObject } from 'react';

// Web Speech is not in TypeScript's cross-browser DOM types. Keep the optional API local.
interface SpeechResult { isFinal: boolean; 0?: { transcript: string } }
interface SpeechSession {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onresult: ((event: { results: ArrayLike<SpeechResult> }) => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}
type SpeechWindow = Window & {
  SpeechRecognition?: new () => SpeechSession;
  webkitSpeechRecognition?: new () => SpeechSession;
};
type Phase = 'idle' | 'starting' | 'listening' | 'stopping';
const FALLBACK = '키보드의 마이크 버튼으로도 음성을 입력할 수 있어요.';
export const SPEECH_FALLBACK = FALLBACK;

function recognitionType() {
  const browser = window as SpeechWindow;
  return browser.SpeechRecognition || browser.webkitSpeechRecognition;
}

export function useSpeechInput({ onText, blocked, scope }: {
  onText: (text: string) => void;
  blocked: boolean;
  scope: RefObject<HTMLElement | null>;
}) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [interim, setInterim] = useState('');
  const [notice, setNotice] = useState('');
  const [supported, setSupported] = useState<boolean | null>(null);
  const session = useRef<SpeechSession | null>(null);
  const stopping = useRef(false);
  const pendingRef = useRef('');
  const onTextRef = useRef(onText);
  onTextRef.current = onText;
  const blockedRef = useRef(blocked);
  blockedRef.current = blocked;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const clearTimers = useCallback(() => { timers.current.forEach(clearTimeout); timers.current = []; }, []);

  const abort = useCallback((message = '', keepPending = false) => {
    const current = session.current;
    session.current = null; // Discard delayed results from a suspended/unmounted session.
    stopping.current = false;
    clearTimers();
    if (current) {
      current.onstart = current.onend = current.onerror = current.onresult = null;
      try { current.abort(); } catch { /* Some browsers already ended the session. */ }
    }
    setPhase('idle');
    if (!keepPending) pendingRef.current = '';
    setInterim(pendingRef.current);
    if (message && current) setNotice(message);
  }, [clearTimers]);

  const stop = useCallback(() => {
    const current = session.current;
    if (!current) return;
    stopping.current = true;
    setPhase('stopping');
    clearTimers();
    // stop() allows the browser to send its final result; never restart automatically.
    timers.current.push(setTimeout(() => abort('음성 입력을 마쳤어요. 내용과 확인할 문구를 살펴봐 주세요.', true), 3500));
    try { current.stop(); } catch { abort('음성 입력을 마쳤어요. 내용과 확인할 문구를 살펴봐 주세요.', true); }
  }, [abort, clearTimers]);

  const start = useCallback(() => {
    if (blockedRef.current || session.current) return;
    setNotice('');
    if (!window.isSecureContext) { setSupported(false); setNotice(`보안 연결에서 음성 입력을 사용할 수 있어요. ${FALLBACK}`); return; }
    const Recognition = recognitionType();
    if (!Recognition) { setSupported(false); setNotice(`이 브라우저에서는 음성 입력을 지원하지 않아요. ${FALLBACK}`); return; }
    if (document.hidden || scope.current?.closest('[inert]')) return;
    setSupported(true);
    let current: SpeechSession;
    try { current = new Recognition(); } catch { setNotice(`음성 인식을 시작하지 못했어요. ${FALLBACK}`); return; }
    session.current = current;
    stopping.current = false;
    const consumed = new Set<number>();
    let received = false;
    let failed = false;
    current.lang = 'ko-KR';
    current.continuous = true;
    current.interimResults = true;
    current.maxAlternatives = 1;
    pendingRef.current = ''; setInterim('');
    setPhase('starting');
    current.onstart = () => {
      if (session.current !== current || stopping.current) return;
      clearTimers(); setPhase('listening');
      timers.current.push(setTimeout(stop, 120000));
    };
    current.onresult = event => {
      if (session.current !== current || blockedRef.current) return;
      const final: string[] = [], pending: string[] = [];
      for (let index = 0; index < event.results.length; index++) {
        const result = event.results[index];
        const text = result?.[0]?.transcript?.trim();
        if (!text) continue;
        if (result.isFinal) {
          if (!consumed.has(index)) { consumed.add(index); final.push(text); }
        } else pending.push(text);
      }
      if (final.length) { received = true; onTextRef.current(final.join(' ')); }
      const pendingText = pending.join(' ');
      setInterim(pendingText);
      // Keep uncertain text separate from the log until the user explicitly accepts it.
      pendingRef.current = pendingText;
    };
    current.onerror = event => {
      if (session.current !== current) return;
      failed = true;
      const messages: Record<string, string> = {
        'not-allowed': '마이크 권한이 필요해요. 브라우저의 사이트 설정에서 마이크를 허용한 뒤 다시 시도해 주세요.',
        'service-not-allowed': '이 환경에서는 브라우저 음성 인식 서비스를 사용할 수 없어요.',
        'audio-capture': '마이크를 찾지 못했어요. 연결과 다른 앱의 마이크 사용 여부를 확인해 주세요.',
        network: '음성 인식 서비스에 연결하지 못했어요. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.',
        'no-speech': '말소리를 듣지 못했어요. 마이크를 누르고 다시 말해 주세요.',
        'language-not-supported': '이 브라우저에서는 한국어 음성 인식을 사용할 수 없어요.',
        aborted: '음성 입력이 중단됐어요. 반영된 내용은 그대로 남아있어요.',
      };
      const message = messages[event.error] || '음성 인식을 마치지 못했어요. 반영된 내용은 그대로 남아있어요.';
      abort('', true); setNotice(`${message} ${FALLBACK}`);
    };
    current.onend = () => {
      if (session.current !== current) return;
      abort('', true);
      if (!failed) setNotice(pendingRef.current ? '확정되지 않은 문구가 남아있어요. 확인 후 내용에 추가하거나 지워 주세요.' : received ? '음성 입력을 마쳤어요. 내용을 확인한 뒤 저장해 주세요.' : '입력된 문구가 없어요. 다시 말하거나 키보드로 입력해 주세요.');
    };
    timers.current.push(setTimeout(() => abort(`음성 인식이 시작되지 않았어요. 마이크 권한과 연결을 확인해 주세요. ${FALLBACK}`), 25000));
    try { current.start(); } catch { abort(); setNotice(`음성 인식을 시작하지 못했어요. ${FALLBACK}`); }
  }, [abort, clearTimers, scope, stop]);

  useEffect(() => { setSupported(window.isSecureContext && Boolean(recognitionType())); }, []);
  useEffect(() => { if (blocked) abort('음성 입력을 멈췄어요. 반영된 내용은 그대로 남아있어요.'); }, [blocked, abort]);
  useEffect(() => {
    const hidden = () => { if (document.hidden) abort('음성 입력을 멈췄어요. 반영된 내용은 그대로 남아있어요.'); };
    const leave = () => abort();
    // Settings/guides make the composer inert without unmounting it.
    const observer = new MutationObserver(() => { if (scope.current?.closest('[inert]')) abort('음성 입력을 멈췄어요. 반영된 내용은 그대로 남아있어요.'); });
    observer.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['inert'] });
    document.addEventListener('visibilitychange', hidden);
    window.addEventListener('pagehide', leave);
    return () => { observer.disconnect(); document.removeEventListener('visibilitychange', hidden); window.removeEventListener('pagehide', leave); abort(); };
  }, [abort, scope]);

  const dismissInterim = () => { pendingRef.current = ''; setInterim(''); };
  const applyInterim = () => {
    if (session.current || blockedRef.current || !pendingRef.current) return;
    onTextRef.current(pendingRef.current); dismissInterim();
    setNotice('내용에 추가했어요. 문구를 확인한 뒤 저장해 주세요.');
  };
  return { phase, active: phase !== 'idle', interim, notice, supported, start, stop, applyInterim, dismissInterim, dismiss: () => setNotice('') };
}
