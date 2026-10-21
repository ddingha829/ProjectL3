'use client';

import { useEffect, useRef, useState } from 'react';
import { Trash2, Upload, Download, Copy, MapPin, Smartphone, HelpCircle, ChevronDown, UserCheck, LogOut, RefreshCw } from 'lucide-react';
import AccessibleDialog from './AccessibleDialog';
import type { ArchiveItem, PlaceInboxItem } from '@/types/l2';
import type { MotionPreference } from '@/lib/motion';
import type { AppFont } from '@/lib/fontPreference';
import type { ThemePreference } from '@/lib/themePreference';
import { buildGoogleMapsCsv, buildNotionMarkdown, parseGoogleTakeoutPlaces } from '@/lib/googleMapsParser';
import { exportLogbookZip, type BackupProgress } from '@/lib/logBackup';
import type { PwaState } from './PwaInstallControl';
import BackupRestoreDialog from './BackupRestoreDialog';
import type { BackupRestorePlan } from '@/lib/backupRestore';

interface Props {
  font: AppFont;
  onFont: (font: AppFont) => void;
  beforeLogin: () => Promise<void>;
  open: boolean;
  onClose: () => void;
  theme: ThemePreference;
  onTheme: (value: ThemePreference) => void;
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
  onResetLogs: () => Promise<void>;
  restoreScope: string;
  onImportArchives: (plan:BackupRestorePlan)=>Promise<{added:number;skipped:number}>;
}

export default function SettingsDialog(p: Props) {
  const [googleAvailable,setGoogleAvailable]=useState(false);
  useEffect(()=>{const controller=new AbortController();fetch('/api/auth/google',{signal:controller.signal}).then(res=>res.json()).then(data=>setGoogleAvailable(data.available===true)).catch(()=>{});return()=>controller.abort();},[]);
  const [code, setCode] = useState('');
  const [loginId, setLoginId] = useState('');
  const [loginPw, setLoginPw] = useState('');
  const [authBusy, setAuthBusy] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [dataOpen, setDataOpen] = useState(false);
  const [backupOpen,setBackupOpen]=useState(false);
  const [progress,setProgress] = useState<BackupProgress|null>(null);
  const exportLock = useRef(false);
  const [resetOpen,setResetOpen] = useState(false),[resetBusy,setResetBusy] = useState(false),[resetWord,setResetWord] = useState(''),[resetError,setResetError] = useState('');
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
      await p.beforeLogin();
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

  const googleLogin = async () => {
    if(authBusy)return;
    setAuthBusy(true);setMessage('');
    try {
      await p.beforeLogin();
      const response=await fetch('/api/auth/google',{method:'POST'});
      const data=await response.json();
      if(!response.ok||!data.url)throw new Error(data.error||'구글 로그인에 연결하지 못했어요.');
      window.location.assign(data.url);
    } catch(error) {setMessage(error instanceof Error?error.message:'다시 시도해 주세요.');setAuthBusy(false);}
  };
  const handleLogout = async () => {
    setAuthBusy(true);
    try {
      await p.beforeLogin();
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

  const exportZip = async () => {
    if(exportLock.current)return;
    exportLock.current=true;setMessage('');setProgress({percent:0,label:'백업 준비 중'});
    try { const result=await exportLogbookZip(p.archives||[],setProgress);setMessage(result.missing?`ZIP을 내려받았어요. 사진 ${result.missing}장은 연결 문제로 원본 URL만 보관했습니다.`:'로그와 사진을 ZIP으로 내려받았어요.'); }
    catch(error){setMessage(error instanceof Error?error.message:'백업하지 못했어요. 다시 시도해 주세요.');}
    finally{setProgress(null);exportLock.current=false;}
  };
  const resetLogs = async () => {
    if(resetBusy||resetWord!=='초기화')return;
    setResetBusy(true);setResetError('');
    try{await p.onResetLogs();setResetOpen(false);setResetWord('');setMessage('모든 로그를 초기화했어요.');}
    catch(error){setResetError(error instanceof Error?error.message:'초기화하지 못했어요.');}
    finally{setResetBusy(false);}
  };
  return (<>
    <AccessibleDialog open={p.open} onClose={()=>{if(!progress&&!resetBusy)p.onClose();}} title="설정" headerAdornment={<span className="settings-wordmark" aria-label="live and log">live &amp; log!</span>}>
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

          {p.username&&<div className="settings-ai-usage"><span>오늘 AI 팔레트</span><strong>{p.aiUsage.used} / {p.aiUsage.limit}회</strong><progress max={p.aiUsage.limit} value={Math.min(p.aiUsage.used,p.aiUsage.limit)} aria-label="오늘 AI 사용량"/></div>}
          {p.storageError && <p className="settings-alert">{p.storageError}</p>}

          {p.username ? (
            <div className="settings-account-connected">
              <div className="settings-account-badge">
                <UserCheck size={16} />
                <div>
                  <strong>{p.username}</strong>
                  <span>연결된 계정에 기록을 보관해요</span>
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
              {googleAvailable&&<><button type="button" className="settings-google-login" disabled={authBusy} onClick={()=>void googleLogin()}><svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.6 12.2c0-.7-.1-1.4-.2-2.1H12v4h5.4a4.6 4.6 0 0 1-2 3v2.6h3.3c1.9-1.8 2.9-4.3 2.9-7.5z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.3-2.6c-.9.6-2.1.9-3.4.9-2.6 0-4.9-1.8-5.7-4.2H2.9v2.7A10 10 0 0 0 12 22z"/><path fill="#FBBC05" d="M6.3 13.7a6 6 0 0 1 0-3.4V7.6H2.9a10 10 0 0 0 0 8.8z"/><path fill="#EA4335" d="M12 6.1c1.5 0 2.8.5 3.8 1.5l2.8-2.9A9.7 9.7 0 0 0 12 2a10 10 0 0 0-9.1 5.6l3.4 2.7C7.1 7.9 9.4 6.1 12 6.1z"/></svg>{authBusy?'연결 중…':'Google로 계속하기'}</button><div className="settings-auth-divider">또는 아이디로 연결</div></>}

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

          <div className="settings-row settings-theme-row">
            <div className="settings-row-copy">
              <strong>테마 모드</strong>
              <span>자동은 기기 설정을 따라가요 · 이 기기에 저장됩니다</span>
            </div>
            <div className="settings-segmented" role="group" aria-label="테마 선택">
              {([{value:'auto',label:'자동'},{value:'light',label:'라이트'},{value:'dark',label:'다크'}] as const).map(option => <button key={option.value} type="button" className={p.theme===option.value?'active':''} aria-pressed={p.theme===option.value} onClick={()=>p.onTheme(option.value)}>{option.label}</button>)}
            </div>
          </div>

          <div className="settings-row settings-font-row">
            <div className="settings-row-copy"><strong>글꼴</strong><span>화면과 카드에 적용돼요 · 이 기기에 저장됩니다</span></div>
            <div className="settings-segmented" role="group" aria-label="글꼴 선택">
              <button type="button" className={p.font==='sebang'?'active':''} aria-pressed={p.font==='sebang'} onClick={()=>p.onFont('sebang')}>세방고딕</button>
              <button type="button" className={p.font==='pretendard'?'active':''} aria-pressed={p.font==='pretendard'} onClick={()=>p.onFont('pretendard')}>기존</button>
              <button type="button" className={`settings-handwriting-choice ${p.font==='gaegu'?'active':''}`} aria-pressed={p.font==='gaegu'} onClick={()=>p.onFont('gaegu')}>손글씨</button>
              <button type="button" className={`settings-neat-handwriting-choice ${p.font==='single-day'?'active':''}`} aria-pressed={p.font==='single-day'} onClick={()=>p.onFont('single-day')}>또박 손글씨</button>
            </div>
            <p className="settings-font-preview">오늘의 작은 순간을 로그로 남겨요.</p>
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
              <p className="settings-hint" style={{ marginTop: 2 }}>로그·사진 ZIP 백업, 구글 지도 장소 가져오기, 복원 코드</p>
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
              <button type="button" className="settings-primary-btn settings-zip-button" disabled={Boolean(progress)||!p.archives?.length} onClick={()=>void exportZip()}><Download size={17}/><span>로그 · 사진 ZIP 내보내기</span></button>
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
                <button type="button" className="settings-secondary-btn" disabled={!p.restoreScope} onClick={()=>setBackupOpen(true)}><Upload size={14}/><span>백업 파일 복원</span></button>
              </div>

              <button type="button" className="settings-reset-button" disabled={!p.archives?.length} onClick={()=>{setResetWord('');setResetError('');setResetOpen(true);}}><Trash2 size={16}/>모든 로그 초기화</button>
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
        <p className="settings-footer-meta">Made by Team L2 · v1.0.0 alpha</p>
      </div>
    </AccessibleDialog>
    <BackupRestoreDialog open={backupOpen} onClose={()=>setBackupOpen(false)} scope={p.restoreScope} archives={p.archives||[]} onRestore={p.onImportArchives}/>
    <AccessibleDialog open={resetOpen} onClose={()=>{if(!resetBusy)setResetOpen(false);}} title="모든 로그를 지울까요?" description="로그와 그룹이 서버 및 이 기기에서 삭제되며 되돌릴 수 없어요. 계정과 프리셋은 유지됩니다. 먼저 ZIP 백업을 권장해요.">
      <form className="settings-reset-form" onSubmit={event=>{event.preventDefault();void resetLogs();}}><label htmlFor="reset-confirmation">확인하려면 ‘초기화’를 입력해 주세요.</label><input id="reset-confirmation" value={resetWord} onChange={event=>setResetWord(event.target.value)} autoComplete="off" disabled={resetBusy}/>{resetError&&<p role="alert">{resetError}</p>}<button type="submit" className="settings-reset-button" disabled={resetBusy||resetWord!=='초기화'}>{resetBusy?'삭제 중…':'모든 로그 영구 삭제'}</button></form>
    </AccessibleDialog>
    <AccessibleDialog open={Boolean(progress)} onClose={()=>{}} title="로그북 백업 중" description="사진을 모으고 이 기기에서 ZIP으로 압축하고 있어요."><div className="backup-progress" role="status" aria-live="polite"><strong>{progress?.percent||0}<small>%</small></strong><progress max={100} value={progress?.percent||0} aria-label="ZIP 내보내기 진행률"/><p>{progress?.label}</p></div></AccessibleDialog>
  </>);
}
