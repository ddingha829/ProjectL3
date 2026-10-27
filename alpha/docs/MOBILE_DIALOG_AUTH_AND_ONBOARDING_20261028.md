# Mobile dialogs, onboarding and auth — 2026-10-28

## Changes

- First-use guides now use a single short step per context. Camera entry is the primary action. Tile guidance follows the map's compact title/subtitle pattern.
- Header install guidance is shown in browser display mode, hidden in standalone/PWA mode. Safari, Android and desktop instructions are platform-specific; no forced installation popup. Native install prompts are consumed once.
- Bottom navigation is rendered into `document.body`. Its transparent wrapper has one viewport-fixed position on every menu; only the pill paints the existing glass surface. Swipe handling includes the portaled dock.
- Settings has one scroll owner: the flex body's `overflow-y:auto`. The panel clips its content while the title and close control stay outside the scroll area. Visual viewport dimensions and safe areas constrain the sheet, and each opening starts at scrollTop 0.
- The app header is a full-width opaque fixed surface with a layout spacer. This removes it from the scrolling content beneath iOS scroll-edge effects. No global removal of intentional card/dock glass effects.
- Camera location initialization now survives React StrictMode cleanup. Selecting a place or declining location ends the loading state; reverse/nearby lookups have bounded timeouts.
- Login reports an existing email separately from invalid credentials and offers password recovery. `/auth/reset` validates the recovery session before accepting a new password. The exact production recovery redirect was added to Supabase with user approval; no recovery mail was sent to the real account.
- Repeated initialization shares one Supabase auth client. Optional `L2_BACKEND_GENERATION` creates a fresh auth storage namespace after a backend reset and clears only the previous demo-login marker. Local demo records, account caches and unsynced operation backups are retained.

## Verification

- Production build and TypeScript checks pass.
- Prior and current isolated UI checks: swipe intent/events 49, card navigation 11, regional map 11, card dates 36, feedback privacy 6, PWA lifecycle 13, location lifecycle 8, auth messages 10. Reset session isolation adds 16 assertions and real-SDK configuration lifecycle checks.
- Responsive browser review at 390x844, 375x667 and 320x600: short guides, install help, camera chooser, feed search/reset, calendar, personal/group tiles, card detail/comments and studio. A local demo text log was created, reopened and edited. The studio retains its in-progress draft across menu navigation.
- Settings at 375x667: panel top 12 / bottom 655; body scroll range approximately 247px. Reached the bottom and returned to scrollTop 0. Close/reopen starts at 0, with header visible. At 390x844 the shorter scroll range also reaches both ends.
- All four menu surfaces use the same dock coordinates and body-level parent. Header computed `filter` and `backdrop-filter` are `none`; dock glass remains enabled.
- Disposable real Auth QA: signup creates a confirmed session, login succeeds, duplicate signup is rejected clearly. A generated recovery link, recovery session and password update were checked only with a generated QA account, with zero mail sends.

Physical iPhone Safari and installed-PWA behavior was **not** tested from this Windows environment. The iOS scroll-edge explanation is an inference supported by WebKit's fixed-container recognition; the user's installed iPhone still needs the two reported symptoms checked after release. Native camera lenses, GPS and share sheets remain device alpha-test checks.

Relevant primary references:

- https://github.com/WebKit/WebKit/pull/47943
- https://raw.githubusercontent.com/WebKit/WebKit/main/Source/WebCore/page/LocalFrameView.cpp
- https://support.apple.com/en-lamr/guide/iphone/iphea86e5236/ios
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/How_to/Trigger_install_prompt
- https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail

## Release status

Released to https://project-l3-nine.vercel.app/ from source `18db137`.

- Ready production deployment: `dpl_HcEb7FKevsGSSXARfx3FKH2GncMX` / `project-l3-gwccgx9vr-ddingha829s-projects.vercel.app`.
- Promoted by rebuilding the reviewed GitHub Preview, preserving the existing project/domain. Previous production deployment `dpl_3FwQdnEVL5y2g2vW2VFhwoK7r7AN` remains the rollback baseline.
- All 11 live HTTP integration checks passed, including search, address/nearby, weather, images, summary cache and cross-site blocking.
- Live browser settings reports `alpha · 18db137`; the sole scroll body starts at 0 and the title stays visible. A fresh local production reload shows no duplicate GoTrue-client warning; an invalid recovery route shows the intended error with no console errors.
- The optional backend generation remains unset. No live database/account/photo reset was performed as part of this UI release; the exact destructive reset is waiting for final user confirmation.
