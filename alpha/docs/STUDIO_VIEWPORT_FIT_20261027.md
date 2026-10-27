# Studio viewport fit — 2026-10-27

- Mobile Studio now reserves the header, top/bottom safe areas and floating navigation before distributing space. The preview grows or shrinks inside the remaining grid row; save and settings stay inside the screen.
- Removed redundant mobile preset caption and reduced preview/control padding. The desktop two-column layout remains.
- Back layouts are a single horizontal strip. Color themes, finishes and font moods also use horizontal strips. Settings can scroll internally without moving the save row.
- Active back layout is scrolled into view when reopening its tab. Horizontal settings gestures are isolated from page navigation and preserve pinch zoom.
- Preview uses a size container to fit both portrait and square cards without distorting their ratio. Three main color fields now fit into a compact row. Guide updated.

Validation:
- TypeScript and production build passed.
- Browser checked 390x844, 390x700, 375x667, 320x600, and 1024x768; front/back/color/finish controls, portrait/square preview and dark theme.
- Mobile document height matched the viewport. Save row ended approximately 16px above the floating navigation.
- Selected the last back option via horizontal scrolling, saved, reopened and confirmed the saved selection was visible. No page scroll or browser errors during the checks.
- These are browser viewport checks, not a physical iPhone test. CSS includes PWA safe-area insets.
