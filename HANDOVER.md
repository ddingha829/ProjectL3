# L2 Archive Card Engine — Project Handover & Architecture Guide

## 2026-10-21 카드 편집 빠른 선택 제거

- Removed the recent/quick preset thumbnail row and its unused owner-history hook/prop/styles. Full PresetLibrary selection and previous/next arrows remain; first-visit guide now highlights that selector. Existing stored preferences/logs are unchanged.
- At 390×844, the editing drawer shrank 356→253px, freeing 103px for the card stage. With motion disabled for consistent measurement, the 9:16 preview grew 236→338px (+43%); square preview grew 236→314px. Card touch/swipe/keyboard, responsive split layout, guide and PNG export are checked in Chrome/real Playwright WebKit; library selection is covered by `test:calendar`.

## 2026-10-21 캘린더 공간 정리

- Calendar header now contains month selection, previous/next and an accessible range icon. Today/full-month shortcuts moved into the month picker. Removed the summary row, date instruction/footer and decorative timeline/range help text; photo day cells and chronological map behavior remain.
- At 390×844 in a five-week month, the calendar shrank 399→317px (-20.5%) and the map grew 284→366px (+28.9%). Six-week months and 320/768px stacked layouts also gain space; desktop/landscape retains the existing side-by-side layout. `test:calendar` covers moved shortcuts, range/date navigation, responsive themes and route animation in Chrome/real Playwright WebKit with API fixtures.

## 2026-10-21 카드 입체감 강화

- Interactive card previews now idle through -10° to +14° yaw, with a 24° tap turn/rebound, stronger mouse tilt and a slow surface sheen. Six theme-colored edge slices at canonical 1–6px depth give the front a physical edge/backing. These are decorative preview siblings of the capture node; no editable back face or full flip was added.
- The 3D ancestor chain retains preserve-3d without flattening filters, including WebKit. Ticket slices share the front's transparent notch mask. Preview padding accommodates the stronger rotation. Motion Off/system reduction hides the edge/light layers and stops movement; hidden pages pause idle animation. Native click-after-pointerup activation remains intact.
- `test:oct20-browser` covers Chrome and real Playwright WebKit: fixed idle extremes and viewport bounds, native touch/keyboard/drawer gestures, motion preferences, tall ticket masks/light theme, tablet/desktop split layout and real transparent PNG exports. Paid APIs and production user data are not exercised.

## 2026-10-21 로그캘린더 · 음성 제목 · 최근 프리셋

- Map theme follow-up: the shared LogbookMap now follows html.light in both logbook and calendar. Light mode uses warm grayscale OSM tiles without inversion, bright translucent panels, dark labels and a deeper orange route; dark mode retains its existing palette. CSS variables recolor existing markers/SVG paths without rebuilding the map or resetting pan/zoom. Chrome/WebKit theme-switch checks and real OSM screenshots pass.

- Follow-up header: + 로그 / 로그북 / 스튜디오 / calendar icon (44px, Lucide CalendarDays); settings remains an overlay. The calendar icon has no visible text, retains the full accessible name/tooltip and active state. Calendar -> card -> calendar preserves the selected month/date range/timeline. Existing row delete/second-left-swipe-to-Studio and Studio's left boundary remain.
- `alpha/DOCS/LOG_CALENDAR_20261021.md` describes the responsive photo calendar, inclusive day/range timeline overlay and shared dark Leaflet/OSM map with chronological route/light animation. Only saved coordinates are connected; no GPS tracking, road-routing API, geocoding sweep or paid call was added. Groups are excluded to avoid counting their member logs twice. Date/time follow the existing Asia/Seoul convention.
- Voice control is now a translucent icon only. Confirmed speech offers a local first-sentence title suggestion when the title is empty; choosing it never changes the body or overwrites a manual title. No AI call. Card detail has three thumbnail shortcuts with owner-scoped, device-local recent selection history; all presets remain in the existing library.
- A native touch regression appeared when the larger editing drawer moved its handle under the finger: resizing on pointerup retargeted the compatibility click to the handle and immediately closed the menu. CardDepth now activates on the native click after its short-tap check; native touch open/close and swipe/keyboard/export regressions pass.
- `test:calendar` covers Chrome + real Playwright WebKit, dates/ranges/timezone/leap year, timeline navigation/restoration, SVG animation/replay/reduction, history pagination, responsive/light/dark layout, first-user guide and recent shortcuts. Tests use isolated API fixtures; actual OSM tiles were also visually checked. `test:voice` and `test:oct20-browser` regressions pass. Production user data is unchanged.

## 2026-10-20 손글씨 옵션 · 서버 연결 후속 확인

- Mobile card editor uses larger 25px animated chevrons (no text). A short card tap or Enter/Space toggles the editing controls in either direction; drag/swipe is not a tap. Idle cards gently float in 3D outside the export subtree, respecting motion Off/system reduction. Desktop split layout remains. Chrome and real Playwright WebKit regressions pass, including unchanged PNG export.
- Voice follow-up is now implemented after the owner's approval: Korean browser Web Speech API (standard/prefixed), explicit mic start/stop, final text appended once to the existing body, separate interim preview/recovery and normal reviewed save. No paid STT/Gemini request or audio upload/storage endpoint was added. Scope/background/unmount cleanup, microphone errors, no automatic restart and the 5,000-character limit are covered by `test:voice` in Chrome/real Playwright WebKit using simulated recognition events. Actual phone recognition/service availability remains a device check. See `alpha/DOCS/VOICE_INPUT_IMPLEMENTATION_20261020.md`; the feasibility document is historical.
- See alpha/DOCS/HANDWRITING_FONT_20261020.md. Settings font choice now includes Gaegu handwriting, with device-local persistence, local WOFF2/OFL, Sebang fallback for rare Hangul, font-aware PNG regeneration and PWA v8 offline fonts. Existing defaults and preset/log data are preserved.
- Later provider checks supersede the earlier failure status below: the user supplied a new Gemini key, now installed locally and in Vercel Production/Preview; production summary returned 200/source=ai. Google Places now reports ready and returns actual Leeum coordinates after the user reconnected billing. Local isolated save/reload/OSM marker checks passed using that real response.

## 2026-10-20 카드 편집 · 책 검색 · 3D 미리보기

- See `alpha/DOCS/UX_MEDIA_UPDATE_20261020.md` for the 6 original requests plus 3D depth and desktop split layout, tests, and real provider status.
- New profile/system fallback default is INSTA (02); explicit existing preferences and record appearance snapshots are preserved. Photo saturation/lightness/brightness are optional PresetSlot fields. Book identity is optional ArchiveItem.media JSON.
- KAKAO_REST_API_KEY is configured locally and as Vercel Production/Preview Secret. Do not print or commit its value. Real book search and image proxy returned 200. Gemini generation with both the existing local key and the subsequently supplied different key returned 402 (prepayment exhausted); the latter was tested but not installed. Vercel Secret identity was not readable. Fallback summaries are limited to two sentences. Do not report live AI generation as working until credits/key are fixed.
- Mobile card: large preview then swipe/tap edit drawer; >=760px: left card / right controls. CardDepth is outside the capture node, follows motion preferences, and never adds a back side or depth effects to shared PNGs.

## 2026-10-18 공유 이미지 투명 모서리 · 사이트 제목

- Shared/downloaded cards are now transparent PNG rather than white-matted JPEG. File extension and MIME agree. Keep 1080px maximum width / 500KiB maximum; lossless PNG first, then 256-color UPNG encoding in a dedicated worker. If needed shrink the dimensions down to 720px, then fail explicitly rather than flatten alpha or exceed the limit.
- WebKit SVG foreignObject can flatten root border-radius/mask. Final canvas applies the computed card corner radii and ticket notch geometry explicitly, including the existing same-SVG warm-up repaint. Ticket CSS variables share notch radius/position with export; no live-card source or crop changes.
- PWA warms the PNG worker online for asset caching. New dependencies: upng-js (MIT), @types/upng-js (dev). Image processing stays in the browser; photo upload compression remains WebP.
- Header metadata / PWA manifest name: `L2 - 일상 로그하기`.
- Chrome 20 designs / 59 layout-ratio combinations check MIME/extension, all four alpha-zero corners, opaque body, ticket cutouts, max size/dimensions and aspect ratio. Actual Playwright WebKit checks poster/crop pixels, corners, ticket notches and fetch failure/retry. Native receiving apps may re-encode files; tests inspect the file passed into Web Share, not KakaoTalk's processing.

## 2026-10-18 단일 사진 선택 보강

- Album/camera inputs explicitly use `multiple={false}` and reset to single selection immediately before opening. Existing inputs were already single-select by default. Unexpected multi-file results now show an error inside the photo modal, keep the old image, and request one photo again instead of silently taking the first.
- PWA cannot force iOS/Android to hide Browse/Files or directly launch a specific native album app. Keep `accept=image/*` for the album and `capture=environment` only for the separate camera option. Do not claim OS picker menus were removed. Reference: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/input/file
- Chrome and real Playwright WebKit native filechooser events confirm single-file mode; injected multi-file rejection/retry and compression passed. PhotoMemo ResizeObserver measurements are scheduled on the next animation frame to avoid a WebKit resize feedback warning after insertion. `test:ux-upgrade` covers the regression; no paid API calls or live user-data writes.

## 2026-10-18 사진 맞춤/드래그 후속 수정

- Card detail now offers 사진 조정: contain/cover, 1~3× zoom and direct mouse/touch drag with a live card preview. Apply stages a per-log photo draft; Card Save persists it, cancel restores it. Composer/content editing shares the same drag engine and retains axis sliders. See `alpha/DOCS/PHOTO_FRAMING.md` and `test:photo-adjust`.
- `cropZoom`/`photoFit` are optional fields in the archive JSON alongside cropX/Y (no SQL migration). Preserve these through edits/outbox/export; old logs default to 1× and each layout's old fit. New photo replacement clears framing. Tests cover reload/API persistence, native touch pointer events, WebKit dragging, zoomed share pixels and unchanged presets/other logs.

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
