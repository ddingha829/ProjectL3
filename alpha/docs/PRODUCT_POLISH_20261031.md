# Ticgle product polish — 2026-10-31

## Direction
Warm editorial canvas, precise controls, orange reserved for purposeful actions. Cards retain their artwork and dimensions. Existing Nanum Square Neo, wordmark, navigation geometry, and gesture ownership remain the basis.

- Feed: visible collapsed search label; expanded input keeps its icon clearance. Consistent 44px tool targets, quieter category selections, separate archive boundary.
- Header: neutral personal scope and restrained group tint; consistent popover rows and member counts.
- Map/collection: matching section icons, title hierarchy and supporting text. A populated map uses “기록이 머문 동네”; the empty state retains guidance. Empty tile plus signs use legible muted text color.
- Studio: neutral preview stage, selected tool shown with an accent on a white surface, selected design distinguished by its outline. Korean front names. Saved/disabled action is neutral, actionable save is prominent.
- Settings: grouped “내 기록” and “도움말과 계정” rows, profile panel, consistent chevrons, service integration at the bottom. Notifications remain immediately below the profile.
- Authentication: same warm/charcoal canvas, prominent readable alpha notice and consistent action color.

## Validation
- Production build and TypeScript passed.
- Existing feed toolbar lifecycle tests: 14 passed. Viewport/keyboard/PWA ownership tests: 23 passed.
- Browser at 393×793 and 320×568: feed search and category filtering, scope switching, map, collection, studio selection, settings scrolling and nested integration dialog, login/signup layout.
- 320px collection geometry: board bottom 395px, tray 404–482px, dock top 492px. No overlap or horizontal overflow.
- 393px studio save footer bottom 703px; dock top 716px.
- Settings reaches its scroll maximum and service row, then can close/reopen at the top.
- Token text contrast: light action 5.68:1, dark action 8.36:1; muted on light canvas 4.98:1, muted on dark surface 6.62:1.
- Reduced-motion rules disable newly introduced transitions. No new animation package, font, image asset, API request, or database query.
- Physical iPhone/PWA and large system-text settings were not tested in this pass. Changes were inspected in the local browser using the example account.

Local review screenshots are under ignored `.test-data/product-polish-*.png`.
