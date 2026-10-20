'use client';

import { useEffect, useId, useRef } from 'react';
import { Mic, Square, X } from 'lucide-react';
import { useSpeechInput, SPEECH_FALLBACK } from '@/hooks/useSpeechInput';
import './VoiceLogInput.css';

export default function VoiceLogInput({ blocked, full, onText, onActiveChange }: {
  blocked: boolean;
  full: boolean;
  onText: (text: string) => void;
  onActiveChange: (active: boolean) => void;
}) {
  const scope = useRef<HTMLDivElement>(null);
  const speech = useSpeechInput({ onText, blocked: blocked || full, scope });
  const id = useId();
  useEffect(() => { onActiveChange(speech.active); return () => onActiveChange(false); }, [speech.active, onActiveChange]);
  const label = speech.phase === 'starting' ? '마이크 연결 중 · 중지' : speech.phase === 'stopping' ? '음성 입력 마치는 중' : speech.active ? '음성 입력 완료' : '음성 입력';
  return <div ref={scope} className="voice-log-input" data-active={speech.active} data-no-swipe>
    <div className="voice-log-toolbar">
      <span id={`${id}-status`} role="status" aria-live="polite">{speech.active ? speech.phase === 'starting' ? '마이크를 연결하고 있어요' : speech.phase === 'stopping' ? '마지막 문구를 반영하고 있어요' : '듣고 있어요 · 한국어' : ''}</span>
      <button type="button" className="quick-control voice-log-button" title={label} aria-label={label} aria-pressed={speech.active} aria-describedby={`${id}-help`} disabled={speech.phase === 'stopping' || (!speech.active && (blocked || full))} onClick={speech.active ? speech.stop : speech.start}>
        {speech.active ? <Square size={15} fill="currentColor" aria-hidden="true"/> : <Mic size={22} strokeWidth={1.7} aria-hidden="true"/>}
      </button>
    </div>
    <p id={`${id}-help`} className={speech.active || speech.supported === false || full ? 'voice-log-help' : 'sr-only'}>{full ? '내용은 최대 5,000자까지 입력할 수 있어요.' : speech.supported === false ? `이 브라우저에서 지원하지 않을 수 있어요. ${SPEECH_FALLBACK}` : '확정된 문구가 내용 뒤에 추가돼요. 브라우저 서비스로 음성이 전달될 수 있어요.'}</p>
    {speech.interim && <div className="voice-log-interim" aria-label={speech.active ? '인식 중인 문구' : '확인할 문구'}><span>{speech.active ? '인식 중' : '확인할 문구'}</span><p>{speech.interim}</p>{!speech.active && <div className="voice-log-recovery"><button type="button" disabled={blocked || full} onClick={speech.applyInterim}>내용에 추가</button><button type="button" onClick={speech.dismissInterim}>문구 지우기</button></div>}</div>}
    {speech.notice && <div className="voice-log-notice"><p role="status">{speech.notice}</p><button type="button" aria-label="음성 입력 안내 닫기" onClick={speech.dismiss}><X size={16} aria-hidden="true"/></button></div>}
  </div>;
}
