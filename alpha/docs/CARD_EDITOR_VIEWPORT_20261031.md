# Card editor viewport and action visibility — 2026-10-31

## Cause
The mobile main-Studio rule in `AppViewport.css` also matched the body-portalled card editor. Its `100cqh` resolved against the viewport instead of the main content container, overriding the card editor's height. At a 393×793 viewport, the workspace started below the 56px header but still consumed 793px; its apply footer ended at 849px and was clipped.

## Changes
- Scope the main Studio container-query height to `.un-app`.
- Give the full-screen card editor one definite grid: automatic safe-area header, then the remaining workspace. Remove repeated viewport subtraction and the obsolete editor row override from the shared Studio stylesheet.
- Allocate a larger, stable tool area and a smaller preview. At the reported screen size, the menu moves from ~642px to ~528px. The existing expand action provides a larger view when needed.
- The workbench owns three rows: tabs, scrollable options, always-visible apply footer. Action targets are 48px tall; footer buttons stay outside the option scroll area.
- Share the current neutral Studio control styling with the card editor. Use “적용됨” before changes and “꾸미기 확정” for a changed draft.
- Adapt short-phone landscape to two columns. Compact front choices avoid unnecessary vertical scroll on small phones.

## Verification
- Browser layout matrix: 320×568, 375×667, 393×793, 740×390, 1024×768; front/back/color/material-font sections at each size (20 combinations). Both footer actions stayed fully inside the viewport with at least 44px targets, and the option region did not overlap the footer.
- Reported-size footer now ends at ~781px; the action itself ends at ~772px. Smallest phone footer ends at ~555px within 568px.
- Options scroll to their end while the footer remains fixed in its own grid row.
- Applied a changed design in the local example account, reopened it and confirmed the applied state. Checked expanded preview return and discard confirmation.
- Light and dark modes inspected. Main Studio regression: save footer still ends at ~703px, above dock top ~716px.
- TypeScript, production build and 23 existing viewport tests passed.
- Physical iPhone/PWA safe-area rendering was not tested; the header and bottom padding continue to use the actual CSS environment safe-area values.

Review evidence is saved under ignored `.test-data/card-editor-layout-audit.json` and `.test-data/card-editor-fixed-*.png`.
