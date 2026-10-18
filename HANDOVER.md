# L2 Archive Card Engine — Project Handover & Architecture Guide

## 2026-10-18 티켓/공유 후속 수정

- TICKET uses a flexible, contain-fit poster area and compact content/footer; only 3:4 and 9:16 are supported. The common ratio picker disables 1:1 for Ticket. Legacy square tickets resolve to 9:16.
- Export strictly embeds and decodes photos in an isolated snapshot before SVG/canvas rendering, with a WebKit repaint warm-up. Source fetch failures produce retryable errors instead of blank success. Snapshot removal preserves the live preview. See `alpha/DOCS/TICKET_POSTER_EXPORT_FIX.md` and `test:ticket-export` for Chrome + real Playwright WebKit pixel checks, retry/long-content tests, and the remaining actual-iPhone share-sheet limitation. Supported export matrix is now 59 pairs across 20 layouts.

## 2026-10-18 최신 승인 후속 작업 (사용자 요청으로 일괄 push)

- `alpha/DOCS/FRONTEND_AUTH_REVIEW_20261018.md`: 이번 11개 요청, 뒤이은 헤더 필기체·초기 문구 폰트 수정, 회귀 검증 결과와 새 Supabase 이전 계획.
- 세방고딕 2.0 로컬 폰트 trial. 설정의 글꼴 ‘기존’으로 롤백 가능. 첫 화면 잔물결 문구의 실제 폰트 측정도 함께 교체.
- Google OAuth + PKCE, 서버 identity 검증, signed cookie, 로그인 전 outbox/prefs drain, 비회원 로그 이전/등록 계정 간 분리. 로컬 실제 Google 로그인 성공. 사용자 승인 후 운영/localhost:3013의 `/api/auth/google/callback`만 기존 Supabase redirect 허용 목록에 추가했다. 기존 ticgle Site URL은 변경하지 않았다.
- 스튜디오 compact name/control row, details modal, palette creation in picker, header/settings alignment, visible category filter, CINEMA auto-place exclusion, swipe boundary resistance and text-selection guards.
- Settings `live & log!` is centred in the same header row as 설정 and close button, not a separate body row.
- Approved preset-management mockup is now implemented: thumbnail collection, explicit tap-to-insert sort with cancel/save, and named photo/text/group creation wizard. Card detail may choose a preset OR locally change design/color/details; Card Save affects only that log. Studio edits reusable originals. See `alpha/DOCS/PRESET_COLLECTION_AND_LOCAL_DESIGN.md` for current behavior/tests. This supersedes the older preset-only detail and horizontal-rail descriptions below.
- Matching Sebang italic WOFF2 faces are used selectively for editorial brand/magazine masthead/full-bleed short quote, not a global italic setting. PWA cache v7 includes local fonts. All first-user guides match the new separation of log-specific styling vs reusable presets.
- `test:ui` points to the current preset-workflow fixture suite, not the historical `test_workflow.mjs` with old PNG/UI assumptions.
- User plans to replace the temporary shared Supabase after testing. Preserve/map Google Auth UUIDs and all owner IDs, migrate photos/URLs and security policies; see report before switching env.


## 2026-10-18 update
- Preset follow-up: draggable library handles with touch cancel/keyboard/tap alternatives, a fixed external + action, per-category defaults persisted as `PresetSlot.defaultFor` inside the existing JSON, 21 bundled palettes and a 3-column color picker. Existing card snapshots stay immutable. TMDB export now reloads image resources in CORS mode to avoid the CDN's non-CORS browser cache; no image proxy/upload was added. See `alpha/DOCS/PRESET_WORKFLOWS.md` for decisions, color research and regressions. Default assignment moves a preset first once; later manual order wins.
- Latest UX/image/data follow-up is documented in `alpha/DOCS/UX_UPGRADE_REPORT.md`: target-highlight step guides, per-in-app install handoff, one-photo WebP compression (1080px / quality .8 / ≤300KiB), 1080px / ≤500KiB JPEG card export, album/camera/TMDB picker, responsive logbook/search/swipe behavior, group-only LIST, Studio number toggle, account-only AI usage, client ZIP backup and confirmed owner-only reset. Reset tests used isolated local/mocked data only. Keep reset draining in-flight sync and clearing owner outbox/cache.
- All nine approved additional card designs are now implemented locally: DOODLE NOTE, MINI FEED, POCKET PHOTO, DAY PAGE, PAINT BADLY, SLOW WINDOW, ORBIT NOTE, TWO CUTS, OPEN MARGIN. Engine total: 20 layouts (12 normal photo / 7 text / 1 group-only LIST), each supporting 3:4, 1:1 and 9:16. `AdditionalCardLayouts.tsx` and its CSS keep new artwork separate from the original renderer. New installations get 15 bundled presets; existing custom libraries/snapshots are preserved and can select all new layouts in Studio. `CARD_DESIGN_PROPOSALS.md` describes typography and regression checks. Original `card-design-concepts.html` remains a historical study, not the actual renderer. Check the matching Git commit/Vercel status for deployment completion. Official UI UX Pro Max is installed locally at `C:/Users/User/.codex/skills/ui-ux-pro-max`; see the same document for provenance.
- Stability/security follow-up `524cd51` is deployed and verified; see `alpha/DOCS/STABILITY_REVIEW.md`. With user approval, a server-only Supabase Secret key was registered as `SUPABASE_SERVICE_ROLE_KEY` in Vercel Production/Preview, then `alpha/supabase/security-hardening.sql` was applied. Anonymous access to all three L3 tables and the usage RPC now returns 401; server access and live CRUD/photo/undo/cross-device login checks pass. Only newly created QA fixtures were used and cleaned up. Keep these DB restrictions in future schema updates.
- Follow-up includes signed session cookies (one-time reconnection with local diary preservation), salted password migration, account isolation, complete archive pagination, strict persistence errors, atomic AI allowance reservation, and the first-preset ring clipping fix.
- First-visit guidance uses measured translucent target highlights and advances on tap until the last step; Settings can replay it. Existing cached installations are not interrupted.
- Studio separates its preset library and name field, includes coherent fictional photo/text samples and four soft bundled palettes. Palette deletion persists as `SkinTheme.hidden` without changing saved card snapshots.
- Card details select presets only; both preset rails support native horizontal scrolling and mouse dragging. Composer width follows the header.
- Native card sharing sends an image plus a real Google Maps URL when linked, otherwise the image only. Log memo text is excluded. Export targets the active artwork, not an outgoing slide.
- See `alpha/DOCS/FIRST_VISIT_STUDIO.md` and `alpha/DOCS/AI_COSTS.md` for scope, verification and current Gemini billing research.

## 1. Repository & Deployment Structure
- **Git Root**: `C:\Users\User\Desktop\ProjectL3` (`https://github.com/ddingha829/ProjectL3`, branch `master`)
- **Active Next.js 16 Application**: `C:\Users\User\Desktop\ProjectL3\alpha` (Vercel Root Directory is `alpha`)
- **Deployment / Database Status (user-confirmed 2026-10-17)**: Vercel deployment and Supabase integration are already complete. Continue development against the existing deployment and database; do not treat either connection as pending setup.
- **Latest upstream check (2026-10-17)**: GitHub `master` and local HEAD both point to `10f109566f2bfb24da77263aefa3a5d6c0ec8b89`. Its GitHub commit status reports `Vercel: success` / `Deployment has completed`. No separate GitHub Actions runs or check-runs were returned for this commit.
- **Live application**: `https://project-l3-nine.vercel.app/` — homepage and Studio were opened successfully; the Studio includes `세부사항` and the one-line `THEME:` metadata.
- **Review scope**: Deployment/integration completion is confirmed by the project owner. Production RLS/grants, Storage access policies, and session security remain separate review items; see `alpha/DOCS/HANDOVER_REVIEW.md`.
- **Important**: Always edit files inside `alpha/src/` and run `npm run typecheck` / `npm run build` inside `alpha/`.

## 2. Core Components & Responsibilities (`alpha/src/`)
- `src/app/page.tsx`: Main 3-tab (`+ 로그` / `로그북` / `스튜디오`) + `card` view orchestrator, 60fps physical swipe navigation, and `pendingAppearance` state for unsaved card preset previews.
- `src/app/test.css` & `src/app/workflow.css`: Layout shell, standalone PWA safe-area clearance (`data-standalone="true"`), mobile keyboard viewport lock (`html[data-keyboard="open"]` with `--vvh`), and modern settings dialog styles.
- `src/components/QuickLogComposer.tsx` & `QuickLogComposer.css`:
  - Client-side photo compression (`imageCompression.ts`: max width `1080px`, WebP `0.8`, ≤300KiB, WASM fallback when native encoding is unavailable).
  - Translucent frosted-glass action pills (`사진` / `장소` / `세부 설정`) placed inside the bottom of `.quick-input-surface`.
  - Clean white modern `로그 저장` button (`.quick-save-button`).
  - Mobile keyboard handling via `window.visualViewport` (`--vvh`) and `window.scrollTo(0, 0)` so the top header and title never get pushed off-screen.
- `src/components/PhotoMemoCanvas.tsx`: Inline photo preview above the body `<textarea>` (`flex: 0 0 auto` with content/panel-bounded height so iOS focus never yanks the page scroll).
- `src/components/ArchiveBrowser.tsx`: Grid / List / Map logbook views. Assigns permanent chronological log numbers (`01` = earliest uploaded log) via `timestamp` ascending order.
- `src/components/CardWorkspace.tsx` & `CardWorkspace.css`: Top card stage (`FitCard` with directional slide animation) + bottom Studio-style horizontal swipe preset selector (`.preset-rail.record-preset-rail`). `카드 저장` commits `pendingAppearance` to the logbook; `공유하기` exports/downloads the card image.
- `src/components/StudioPanel.tsx` & `FitCard.tsx`: Preset customization studio (up to 20 presets, AI palette generation, layout/color steppers).
- `src/components/SaveFeedback.tsx`: Shared busy/saved check feedback for log and card saves. `QuickLogComposer` acknowledges durable storage before `page.tsx` navigates; `SwipeLogRow` moves as a unit on arrival so its orange delete underlay does not flash.
- `src/components/SettingsDialog.tsx`: Mobile-first grouped settings modal with instant ID/Password account login (`/api/session`), theme switcher, author signature, and collapsible backup/recovery section.
- `src/components/PwaInstallControl.tsx`: In-app browser (KakaoTalk/Instagram) external browser handoff guide + standalone PWA first-launch login prompt.
- `src/lib/localArchiveRepository.ts`, `src/lib/store/supabaseStore.ts`, `src/lib/store/fileStore.ts`: Local-first storage with outbox sync, Supabase persistence, and chronological `01..N` numbering.

## 3. Latest Product Decisions (owner-confirmed 2026-10-17)
- Keep the current installation/login guidance: the intended onboarding encourages adding the app and registering before the first log. Do not defer it until after the first save.
- The proposed labels `디자인 적용` and `공유·이미지 저장` are not approved. Preserve the current card save/share labels while discussing a more intuitive distinction; do not implement the earlier naming proposal as an accepted decision.
- Save-completion feedback is implemented in the local Alpha: durable local save → brief check/single haptic → one-time list arrival, with duplicate-save protection and input preservation on failure. Card save uses the same feedback. See `alpha/DOCS/SAVE_FEEDBACK.md` for implementation, verification and further proposals. GitHub/Vercel publishing is separate.
