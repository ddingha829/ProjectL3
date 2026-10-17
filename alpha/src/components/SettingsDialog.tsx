'use client';

import { useRef, useState } from 'react';
import { Upload, Download, Copy, MapPin, Smartphone, HelpCircle, ChevronDown, UserCheck, LogOut, RefreshCw } from 'lucide-react';
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
  onReplayGuide?: () => void;
}

export default function SettingsDialog(p: Props) {
  const [code, setCode] = useState('');
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
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
      const response = await fetch('/api/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'logout' }),
      });
      if (!response.ok) throw new Error('로그아웃하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '로그아웃하지 못했어요.');
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

  const motionAndHapticsOn = p.motion !== 'off' && haptics;
  const toggleMotionAndHaptics = (next: boolean) => {
    p.onMotion(next ? 'auto' : 'off');
    setHaptics(next);
    try { localStorage.setItem('l2_test_haptics', next ? 'on' : 'off'); } catch {}
  };

  return (
    <AccessibleDialog open={p.open} onClose={p.onClose} title="설정">
      <div className="modern-settings">
        {/* 1. 계정 & 클라우드 동기화 카드 */}
        <section className="settings-card">
          <div className="settings-card-header">
            <span className="settings-section-title">계정 · 클라우드 동기화</span>
            <button type="button" className="settings-sync-pill" onClick={p.onRetrySync} title="동기화 다시 시도">
              <span className={`settings-sync-dot ${p.storageError ? 'is-error' : 'is-ok'}`} />
              <span>{p.storageStatus}</span>
              <RefreshCw size={11} />
            </button>
          </div>

          {p.storageError && <p className="settings-alert">{p.storageError}</p>}

          {p.username ? (
            <div className="settings-account-connected">
              <div className="settings-account-badge">
                <UserCheck size={16} />
                <div>
                  <strong>{p.username}</strong>
                  <span>모든 기기에서 실시간 연동 중</span>
                </div>
              </div>
              <button
                type="button"
                className="settings-ghost-btn"
                disabled={authBusy}
                onClick={() => void handleLogout()}
              >
                <LogOut size={14} />
                <span>로그아웃</span>
              </button>
            </div>
          ) : (
            <div className="settings-auth-box">
              <div className="settings-auth-inputs">
                <input
                  value={loginId}
                  onChange={e => setLoginId(e.target.value)}
                  placeholder="아이디 (2자 이상)"
                  autoComplete="username"
                />
                <input
                  type="password"
                  value={loginPw}
                  onChange={e => setLoginPw(e.target.value)}
                  placeholder="비밀번호 (4자 이상)"
                  autoComplete="current-password"
                  onKeyDown={e => { if (e.key === 'Enter') void handleLogin(); }}
                />
              </div>
              <button
                type="button"
                className="settings-primary-btn"
                disabled={authBusy || loginId.trim().length < 2 || loginPw.trim().length < 4}
                onClick={() => void handleLogin()}
              >
                {authBusy ? '연결 중…' : '로그인 / 새 계정으로 연동'}
              </button>
              <p className="settings-hint">
                처음 입력하는 아이디면 바로 계정이 만들어지고 현재 기기 기록이 함께 연동됩니다.
              </p>
            </div>
          )}
        </section>

        {/* 2. 화면 · 프로필 */}
        <section className="settings-card">
          <span className="settings-section-title">화면 · 프로필</span>

          <div className="settings-row">
            <div className="settings-row-copy">
              <strong>테마 모드</strong>
              <span>화면 배경 톤을 선택합니다</span>
            </div>
            <div className="settings-segmented" role="group" aria-label="테마 선택">
              <button
                type="button"
                className={!p.light ? 'active' : ''}
                aria-pressed={!p.light}
                onClick={() => p.onTheme(false)}
              >
                다크
              </button>
              <button
                type="button"
                className={p.light ? 'active' : ''}
                aria-pressed={p.light}
                onClick={() => p.onTheme(true)}
              >
                페이퍼
              </button>
            </div>
          </div>

          <label className="settings-row settings-row-input">
            <div className="settings-row-copy">
              <strong>카드 서명</strong>
              <span>카드 하단에 표시될 작성자 이름</span>
            </div>
            <input
              maxLength={32}
              value={p.authorName}
              onChange={e => p.onAuthor(e.target.value)}
              placeholder="나의 이름"
              className="settings-inline-input"
            />
          </label>
        </section>

        {/* 3. 환경 설정 (모던 토글 스위치) */}
        <section className="settings-card">
          <span className="settings-section-title">환경 설정</span>

          <label className="settings-toggle-row">
            <div className="settings-row-copy">
              <strong>목록 상세 미리보기</strong>
              <span>로그북 목록에서 별점·카테고리·한줄평 표시</span>
            </div>
            <input
              type="checkbox"
              className="settings-switch"
              checked={p.listDetailsOn}
              onChange={e => p.onListDetailsChange(e.target.checked)}
            />
          </label>

          <label className="settings-toggle-row">
            <div className="settings-row-copy">
              <strong>자동 장소 연결 추천</strong>
              <span>제목을 바탕으로 원탭 위치 연결 칩 표시</span>
            </div>
            <input
              type="checkbox"
              className="settings-switch"
              checked={p.autoPlaceLinkOn}
              onChange={e => p.onAutoPlaceLinkChange(e.target.checked)}
            />
          </label>

          <label className="settings-toggle-row">
            <div className="settings-row-copy">
              <strong>부드러운 모션 · 진동 피드백</strong>
              <span>화면 전환 애니메이션 및 터치 진동 효과</span>
            </div>
            <input
              type="checkbox"
              className="settings-switch"
              checked={motionAndHapticsOn}
              onChange={e => toggleMotionAndHaptics(e.target.checked)}
            />
          </label>
        </section>

        {/* 4. 홈 화면 앱(PWA) 설치 */}
        {p.pwa && (
          <section className="settings-card">
            <span className="settings-section-title">홈 화면 앱 (PWA)</span>
            <div className="settings-pwa-actions">
              {p.pwa.isStandalone ? (
                <div className="settings-pwa-active">
                  <Smartphone size={15} />
                  <span>현재 홈 화면 앱으로 실행 중</span>
                </div>
              ) : (
                <button
                  type="button"
                  className="settings-primary-btn"
                  onClick={() => {
                    p.onClose();
                    void p.pwa?.triggerInstall();
                  }}
                >
                  <Smartphone size={15} />
                  <span>{p.pwa.canPromptNative ? '홈 화면에 바로 설치' : '홈 화면에 앱 추가하기'}</span>
                </button>
              )}
              <button
                type="button"
                className="settings-secondary-btn"
                onClick={() => {
                  p.onClose();
                  p.pwa?.openGuide();
                }}
              >
                <HelpCircle size={14} />
                <span>설치 가이드</span>
              </button>
            </div>
          </section>
        )}

        {/* 5. 데이터 백업 · 장소 가져오기 (접이식 섹션) */}
        <section className="settings-card">
          <button
            type="button"
            className="settings-accordion-trigger"
            aria-expanded={dataOpen}
            onClick={() => setDataOpen(v => !v)}
          >
            <div>
              <span className="settings-section-title" style={{ marginBottom: 0 }}>데이터 백업 · 구글 지도 연동</span>
              <p className="settings-hint" style={{ marginTop: 2 }}>JSON/CSV 내보내기, 구글 지도 장소 가져오기, 복원 코드</p>
            </div>
            <ChevronDown size={18} className={`settings-chevron ${dataOpen ? 'is-open' : ''}`} />
          </button>

          {dataOpen && (
            <div className="settings-accordion-body">
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
                    setMessage(`구글 지도 장소 ${places.length}곳을 대기열에 담았어요.`);
                  } catch {
                    setMessage('Saved Places.json 파일을 읽지 못했어요.');
                  }
                }}
              />
              <div className="settings-data-grid">
                <button type="button" className="settings-secondary-btn" onClick={() => fileRef.current?.click()}>
                  <Upload size={14} />
                  <span>구글 지도 JSON{p.inboxCount ? ` (${p.inboxCount})` : ''}</span>
                </button>
                <button type="button" className="settings-secondary-btn" onClick={() => {
                  const csv = buildGoogleMapsCsv(p.archives || []);
                  triggerDownload(csv, 'L2_GoogleMyMaps.csv', 'text/csv;charset=utf-8');
                  setMessage('구글 내 지도용 CSV를 내려받았어요.');
                }}>
                  <MapPin size={14} />
                  <span>지도용 CSV</span>
                </button>
                <button type="button" className="settings-secondary-btn" onClick={async () => {
                  const md = buildNotionMarkdown(p.archives || []);
                  try {
                    await navigator.clipboard.writeText(md);
                    setMessage('노션 마크다운을 복사했어요.');
                  } catch {
                    triggerDownload(md, 'L2_Notion_Archive.md', 'text/markdown;charset=utf-8');
                    setMessage('노션 마크다운 파일을 내려받았어요.');
                  }
                }}>
                  <Copy size={14} />
                  <span>노션 마크다운</span>
                </button>
                <button type="button" className="settings-secondary-btn" onClick={() => {
                  const json = JSON.stringify(p.archives || [], null, 2);
                  triggerDownload(json, 'L2_Archive_Backup.json', 'application/json;charset=utf-8');
                  setMessage('전체 JSON 백업 파일을 내려받았어요.');
                }}>
                  <Download size={14} />
                  <span>JSON 백업</span>
                </button>
              </div>

              <div className="settings-recovery-box">
                <div className="settings-recovery-code-row">
                  <span className="settings-hint">복원 코드: <code>{p.recoveryCode || '연결 중'}</code></span>
                  <button
                    type="button"
                    className="settings-ghost-btn"
                    disabled={!p.recoveryCode}
                    onClick={async () => {
                      try { await navigator.clipboard.writeText(p.recoveryCode); setMessage('복원 코드를 복사했어요.'); }
                      catch { setMessage('코드를 직접 선택해 복사해 주세요.'); }
                    }}
                  >
                    복사
                  </button>
                </div>
                <div className="settings-recovery-restore-row">
                  <input
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    placeholder="복원 코드로 불러오기"
                    autoComplete="off"
                  />
                  <button type="button" className="settings-secondary-btn" disabled={restoring || !code.trim()} onClick={() => void restore()}>
                    {restoring ? '복원 중…' : '복원'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

        {p.onReplayGuide&&<button type="button" className="settings-secondary-btn" onClick={p.onReplayGuide}><HelpCircle size={14}/><span>사용 가이드 다시 보기</span></button>}
        {message && <p role="status" className="settings-toast-msg">{message}</p>}
        <p className="settings-footer-meta">L2 Alpha · 오늘 AI 요약/팔레트 사용량 {p.aiUsage.used}/{p.aiUsage.limit}</p>
      </div>
    </AccessibleDialog>
  );
}
