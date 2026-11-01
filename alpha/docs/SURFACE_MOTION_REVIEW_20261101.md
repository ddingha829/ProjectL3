# Surface and spring integration

Integrated the `/test` prototype from `502e20d` into the canonical production components. The test route and all seven temporary route/component/style files are removed; there is one application implementation.

## Comparison and corrections

- Compared the prototype and production App, Header, Navigation, Toolbar and the canonical `CompactPopover` used by `FloatingLogControls`. The prototype retained all original business hooks and event handlers. A second AST/token comparison after integration confirms the App/Header/Navigation/Toolbar's **90 original hook calls and 134 original event handlers** remain unchanged. Added calls only support visual motion and unique layout namespaces. Notification routing, sharing deadlines, membership, pagination, editing, backups and remembered scope remain owned by the existing code.
- Prototype surface rules depended on `.tactile-app` ancestry. Header/navigation actually render into `document.body` via `UnifiedChrome`, so they did not inherit these tokens or match those selectors. Surface tokens now live on the existing unified-shell document; scoped selectors include portalled chrome/dialogs.
- Replaced duplicate CSS and Motion popup entrances with one spring. Exit-retained panels immediately become `inert`/`aria-hidden`, and outside focus never gets stolen. Selected-option focus, arrow wrapping, Home/End, trigger arrow opening, Tab/Shift+Tab exits and Escape restoration are handled. Escape cannot also dismiss an enclosing dialog.
- All new motion uses `useMotionPreference`, including during popup/toast exit. Reduced motion disables shared `layoutId`/layout projection, hover/press movement, and uses zero-duration state changes. Navigation namespaces are unique per mounted instance.
- Removed prototype Grid layout/entrance animations. Card dimensions, poster cropping, ticket silhouettes, native scroll ownership and data-page-swipe surfaces remain unchanged. Press/hover feedback animates only leaf buttons/card artwork. The filter thumb uses one spring, not competing CSS and Motion transforms.
- Kept the header unfiltered. Restrained contact/ambient shadows, inner highlights and glass are applied to popovers, the existing dock and the pinned toolbar. Solid backgrounds remain for reduced-transparency/unsupported browsers; forced-colors boundaries are retained. Selected member-count text uses the accessible accent ink rather than the bright decorative accent. No extra mosaic frame or card rounding covers transparent ticket punches.
- Toast fixed centering is separated from its animated visual surface, avoiding the prototype's transform override of `translateX(-50%)`. Existing app viewport/safe-area/dock geometry is unchanged. Small browser headers allocate enough room for the scope while keeping the install action labelled; search-clear and filter-reset targets are at least 44px.

## Validation

- `npm run typecheck`, `npm run build` passed; the generated route list has no `/test`.
- `npm run test:surfaces`: 10 keyboard/presence/reduced-motion checks.
- `npm run test:swipe`: 23 intent and 26 event/gesture checks.
- `npm run test:viewport`: 23 checks; `npm run test:feed-toolbar`: 14 cold-start/sticky-scroll checks.
- `npm run test:sharing`: original 48-hour sharing policy and transaction regression checks passed.
- Browser QA with a local example account at 375×812, 393×793, 793×393, 820×1180 and 1280×900. Checked light/dark, scope counts, filter/search/view modes, popup keyboard focus, settings scroll/close, card return, studio save visibility and runtime warnings (none observed).
- Actual browser drags verified feed→map→collection→studio. Map center continues to pan; the inward edge drag changes menu. At 393×793 the dock stayed at y=715.078…779.078 across the feed/map/collection/studio; the feed cards stayed 170×272 (10:16). Pinned toolbar state follows actual content scrolling and resets at the top.

No live user records or authentication/database settings were changed. Physical iOS PWA rendering and OS text-size/permission behavior require device testing; browser viewport checks do not emulate those OS features.

Untracked QA artifacts: `.test-data/tactile-business-audit.jsonl`, `.test-data/surface-business-preservation.json`, `.test-data/surface-feed-dark-393.png`, `.test-data/surface-menu-light-393.png`.
