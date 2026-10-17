'use client';

import { useRef, useState } from 'react';
import { Upload, Download, Copy, MapPin, Smartphone, HelpCircle } from 'lucide-react';
import AccessibleDialog from './AccessibleDialog';
import type { ArchiveItem, PlaceInboxItem } from '@/types/l2';
import type { MotionPreference } from '@/lib/motion';
import { buildGoogleMapsCsv, buildNotionMarkdown, parseGoogleTakeoutPlaces } from '@/lib/googleMapsParser';
import type { PwaState } from './PwaInstallControl';

interface Props {
  open: boolean;
  onClose: () => void;
  light: boolean;
  onTheme: (value: boolean) => void;
  motion: MotionPreference;
  onMotion: (value: MotionPreference) => void;
  authorName: string;
  onAuthor: (value: string) => void;
  listDetailsOn: boolean;
  onListDetailsChange: (value: boolean) => void;
  autoPlaceLinkOn: boolean;
  onAutoPlaceLinkChange: (value: boolean) => void;
  recoveryCode: string;
  aiUsage: { used: number; limit: number };
  onRestore: (code: string) => Promise<void>;
  storageStatus: string;
  storageError?: string;
  onRetrySync: () => void;
  archives?: ArchiveItem[];
  inboxCount?: number;
  onImportPlaces?: (places: PlaceInboxItem[]) => void;
  pwa?: PwaState;
  username?: string | null;
}

export default function SettingsDialog(p: Props) {
  const [code, setCode] = useState('');
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const [haptics, setHaptics] = useState(() => {
    try { return typeof window === 'undefined' || localStorage.getItem('l2_test_haptics') !== 'off'; }
    catch { return false; }
  });

  const handleLogin = async () => {
    if (!loginId.trim() || !loginPw.trim()) return;
    setAuthBusy(true);
    setMessage('');
    try {
      const res = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginId.trim(), password: loginPw.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '로그인하지 못했어요.');
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '아이디/비밀번호를 확인해 주세요.');
    } finally {
      setAuthBusy(false);
    }
  };

  const handleLogout = async () => {
    setAuthBusy(true);
    try {
      await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      window.location.reload();
    } finally {
      setAuthBusy(false);
    }
  };

  const restore = async () => {
    if (!code.trim()) return;
    setRestoring(true);
    setMessage('');
    try {
      await p.onRestore(code.trim());
      setMessage('기록을 불러왔어요.');
      setCode('');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '코드를 확인하고 다시 시도해 주세요.');
    } finally { setRestoring(false); }
  };

  const triggerDownload = (content: string, filename: string, mime: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  return (
    <AccessibleDialog open={p.open} onClose={p.onClose} title="나의 기록 설정">
      <div className="test-settings">
        <div className="test-settings-status">
          <span className="test-version-badge">ALPHA VERSION</span>
          <div><span role="status">{p.storageStatus}</span><button className="test-text-button" onClick={p.onRetrySync}>다시 연결</button></div>
          {p.storageError && <p className="test-panel-note">{p.storageError}</p>}
        </div>
        <div className="test-recovery">
          <span className="test-field-label">계정 로그인 · 기기 간 동기화 (Supabase)</span>
          {p.username ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                <code>● {p.username} 계정 연동 중</code>
                <button
                  type="button"
                  className="test-text-button"
                  disabled={authBusy}
                  onClick={() => void handleLogout()}
                >
                  로그아웃
                </button>
              </div>
              <p className="test-panel-note">
                다른 기기나 홈 화면 앱(PWA)에서도 <b>{p.username}</b> 아이디로 로그인하면 사진과 기록이 똑같이 연동됩니다.
              </p>
            </>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                <input
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  placeholder="아이디 (2자 이상)"
                  autoComplete="username"
                  style={{ minHeight: 40, padding: '0 10px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg)' }}
                />
                <input
                  type="password"
                  value={loginPw}
                  onChange={e => setLoginPw(e.target.value)}
                  placeholder="비밀번호 (4자 이상)"
                  autoComplete="current-password"
                  onKeyDown={e => { if (e.key === 'Enter') void handleLogin(); }}
                  style={{ minHeight: 40, padding: '0 10px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--bg)' }}
                />
              </div>
              <button
                type="button"
                className="test-button"
                disabled={authBusy || loginId.trim().length < 2 || loginPw.trim().length < 4}
                onClick={() => void handleLogin()}
              >
                {authBusy ? '연결 중…' : '로그인 / 새 계정으로 연동'}
              </button>
              <p className="test-panel-note">
                처음 입력하는 아이디면 즉시 새 계정으로 생성되며, 지금 기기에 작성해 둔 기록도 함께 계정으로 묶입니다.
              </p>
            </>
          )}
        </div>
        {p.pwa && (
          <div className="test-recovery">
            <span className="test-field-label">홈 화면 앱 설치 (PWA)</span>
            <div className="test-chips" style={{ marginBottom: 6 }}>
              {p.pwa.isStandalone ? (
                <span className="test-chip selected" style={{ cursor: 'default' }}>
                  <Smartphone size={14} />홈 화면 앱 실행 중
                </span>
              ) : (
                <button
                  type="button"
                  className="test-chip selected"
                  onClick={() => {
                    p.onClose();
                    void p.pwa?.triggerInstall();
                  }}
                >
                  <Smartphone size={14} />
                  {p.pwa.canPromptNative ? '홈 화면에 바로 설치' : '홈 화면에 앱 추가'}
                </button>
              )}
              <button
                type="button"
                className="test-chip"
                onClick={() => {
                  p.onClose();
                  p.pwa?.openGuide();
                }}
              >
                <HelpCircle size={14} />설치 및 연동 가이드
              </button>
            </div>
            <p className="test-panel-note">
              {p.pwa.isStandalone
                ? '현재 주소창 없는 전체화면 앱(PWA) 모드로 작동하고 있어요.'
                : '모바일 홈 화면에 추가하면 실제 앱처럼 전체화면과 오프라인 보관을 지원해요.'}
            </p>
          </div>
        )}
        <div>
          <span className="test-field-label">화면</span>
          <div className="test-chips">
            <button className={`test-chip ${!p.light ? 'selected' : ''}`} aria-pressed={!p.light} onClick={() => p.onTheme(false)}>다크</button>
            <button className={`test-chip ${p.light ? 'selected' : ''}`} aria-pressed={p.light} onClick={() => p.onTheme(true)}>페이퍼</button>
          </div>
        </div>
        <div><span className="test-field-label">움직임</span><div className="test-chips" role="group" aria-label="애니메이션 설정">{([{value:'auto',label:'기기 설정'},{value:'on',label:'켜기'},{value:'off',label:'끄기'}] as const).map(option=><button type="button" key={option.value} className={`test-chip ${p.motion===option.value?'selected':''}`} aria-pressed={p.motion===option.value} onClick={()=>p.onMotion(option.value)}>{option.label}</button>)}</div></div>
        <label className="test-settings-field">카드에 남길 이름<input maxLength={32} value={p.authorName} onChange={e => p.onAuthor(e.target.value)} placeholder="나의 이름" /></label>
        <label className="test-settings-switch">
          <span>로그북 목록 상세 정보 표시<small>목록 뷰에서 별점(★)·카테고리·한 줄 평 프리뷰를 함께 표시해요.</small></span>
          <input type="checkbox" checked={p.listDetailsOn} onChange={e => p.onListDetailsChange(e.target.checked)} />
        </label>
        <label className="test-settings-switch">
          <span>지도 미연결 기록 원탭 연결<small>제목을 바탕으로 좌표를 바로 찾아 연결하는 배너와 칩을 표시해요.</small></span>
          <input type="checkbox" checked={p.autoPlaceLinkOn} onChange={e => p.onAutoPlaceLinkChange(e.target.checked)} />
        </label>
        <label className="test-settings-switch">
          <span>작은 진동 피드백<small>지원하는 기기에서만 작동해요.</small></span>
          <input type="checkbox" checked={haptics} onChange={e => {
            setHaptics(e.target.checked);
            try { localStorage.setItem('l2_test_haptics', e.target.checked ? 'on' : 'off'); } catch { /* Optional preference. */ }
          }} />
        </label>
        <div className="test-recovery">
          <span className="test-field-label">구글 지도 장소 가져오기 · 외부 내보내기</span>
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json,application/geo+json"
            hidden
            onChange={async e => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              try {
                const raw = await file.text();
                const places = parseGoogleTakeoutPlaces(raw);
                if (!places.length) {
                  setMessage('가져올 수 있는 구글 지도 장소가 없어요.');
                  return;
                }
                p.onImportPlaces?.(places);
                setMessage(`구글 지도 장소 ${places.length}곳을 대기열에 담았어요. + 로그 화면에서 바로 꺼내 쓸 수 있어요.`);
              } catch {
                setMessage('Saved Places.json 파일을 읽지 못했어요.');
              }
            }}
          />
          <div className="test-chips" style={{ marginBottom: 8 }}>
            <button type="button" className="test-chip" onClick={() => fileRef.current?.click()}>
              <Upload size={14} />구글 지도 JSON 업로드{p.inboxCount ? ` (${p.inboxCount})` : ''}
            </button>
            <button type="button" className="test-chip" onClick={() => {
              const csv = buildGoogleMapsCsv(p.archives || []);
              triggerDownload(csv, 'L2_GoogleMyMaps.csv', 'text/csv;charset=utf-8');
              setMessage('구글 내 지도용 CSV를 내려받았어요.');
            }}>
              <MapPin size={14} />구글 지도 CSV
            </button>
            <button type="button" className="test-chip" onClick={async () => {
              const md = buildNotionMarkdown(p.archives || []);
              try {
                await navigator.clipboard.writeText(md);
                setMessage('노션용 마크다운을 클립보드에 복사했어요.');
              } catch {
                triggerDownload(md, 'L2_Notion_Archive.md', 'text/markdown;charset=utf-8');
                setMessage('노션용 마크다운 파일을 내려받았어요.');
              }
            }}>
              <Copy size={14} />노션 마크다운
            </button>
            <button type="button" className="test-chip" onClick={() => {
              const json = JSON.stringify(p.archives || [], null, 2);
              triggerDownload(json, 'L2_Archive_Backup.json', 'application/json;charset=utf-8');
              setMessage('전체 JSON 백업 파일을 내려받았어요.');
            }}>
              <Download size={14} />JSON 백업
            </button>
          </div>
          <p className="test-panel-note">구글 테이크아웃의 Saved Places.json을 올리면 로그 작성 시 제목·좌표·주소가 자동으로 채워집니다.</p>
        </div>
        <div className="test-recovery">
          <span className="test-field-label">기기 복원 코드</span>
          <div>
            <code>{p.recoveryCode || '연결 후 확인할 수 있어요'}</code>
            <button className="test-text-button" disabled={!p.recoveryCode} onClick={async () => {
              try { await navigator.clipboard.writeText(p.recoveryCode); setMessage('코드를 복사했어요.'); }
              catch { setMessage('코드를 선택해서 복사해 주세요.'); }
            }}>복사</button>
          </div>
          <p className="test-panel-note">이 코드를 가진 사람은 기록을 불러올 수 있어요.</p>
        </div>
        <label className="test-settings-field">다른 기기의 기록 불러오기<input value={code} onChange={e => setCode(e.target.value)} placeholder="복원 코드" autoComplete="off" /></label>
        <button className="test-button" disabled={restoring || !code.trim()} onClick={restore}>{restoring ? '불러오는 중…' : '기록 복원'}</button>
        {message && <p role="status" className="test-panel-note">{message}</p>}
        <p className="test-panel-note">외부 API 미연결 상태에서는 로컬 검색·요약·팔레트를 사용합니다. AI 연결 시 오늘 사용량 {p.aiUsage.used}/{p.aiUsage.limit}.</p>
      </div>
    </AccessibleDialog>
  );
}
