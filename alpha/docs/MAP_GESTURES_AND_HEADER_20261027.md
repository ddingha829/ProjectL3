# Map gestures and top safe area

Supersedes the map-specific gesture section in FULL_SCREEN_SWIPE_20261027.md.

- Map canvas always starts with Leaflet dragging enabled. One finger pans; two fingers use Leaflet zoom. Removed the extra map-move mode and toggle.
- Map and its overlays opt out of app page swiping. Main menu swipes continue on feed, tiles, studio and outside the map. The map page's ancestor permits map gestures, and the canvas owns touch input so it cannot become a document scroll.
- Header is sticky, opaque and explicitly has no filter/backdrop filter. Top padding and height include the top safe-area inset. The feed toolbar sticks below it; map height accounts for the added inset, including short screens.
- Toolbar follow-up: sticky top must equal the header's 56px plus safe-area height. An extra 8px inset was displacing the toolbar over the first cards and activating its pinned appearance at scroll zero. Verified initial 7px card gap and unpinned state, with pinning only after scrolling.
- Floating surface follow-up: pin detection now measures the flow sentinel on scroll/resize via one animation frame rather than relying solely on IntersectionObserver. Visual-viewport changes remeasure the current safe-area inset. The pinned toolbar explicitly paints a 96% surface, subtle inset border and shadow, with an opaque fallback when reduced transparency is requested. At 390 × 620 verified the actual scrolled screenshot, computed background/blur/shadow, search expansion and unpinning after returning to the top. Physical iPhone compositing remains untested locally.
- First-use guidance reflects direct map panning.
- Teardown ignores late move/zoom/resize callbacks so leaving a moving map cannot read an already removed Leaflet pane.

Validation: production build, typecheck, 23 page-swipe checks and 11 card-navigation checks passed. At 390 × 844, actual browser pointer drags in horizontal/vertical/diagonal directions changed the map-pane transform without changing document scroll or menu. Feed-to-map swipe still works. Header background computed opaque white, backdrop filter none. Actual iPhone home-screen status-bar compositing and physical pinch gestures require device confirmation; browser viewport emulation cannot reproduce the iOS system overlay.

Only deploy to the existing Preview branch; production remains unchanged.
