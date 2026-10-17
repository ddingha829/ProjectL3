# L2 Archive Card Engine — Project Handover & Architecture Guide

## 2026-10-18 update
- Stability/security follow-up `524cd51` is deployed and verified; see `alpha/DOCS/STABILITY_REVIEW.md`. With user approval, a server-only Supabase Secret key was registered as `SUPABASE_SERVICE_ROLE_KEY` in Vercel Production/Preview, then `alpha/supabase/security-hardening.sql` was applied. Anonymous access to all three L3 tables and the usage RPC now returns 401; server access and live CRUD/photo/undo/cross-device login checks pass. Only newly created QA fixtures were used and cleaned up. Keep these DB restrictions in future schema updates.
- Follow-up includes signed session cookies (one-time reconnection with local diary preservation), salted password migration, account isolation, complete archive pagination, strict persistence errors, atomic AI allowance reservation, and the first-preset ring clipping fix.
- First-visit guidance uses live leader lines, once per screen/browser for new installations; Settings can replay it. Existing cached installations are not interrupted.
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
  - Client-side photo compression (`preparePhoto`: max `900px`, JPEG `0.74`).
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
