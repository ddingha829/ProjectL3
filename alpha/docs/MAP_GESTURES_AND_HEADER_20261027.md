# Map gestures and top safe area

Supersedes the map-specific gesture section in FULL_SCREEN_SWIPE_20261027.md.

- Map canvas always starts with Leaflet dragging enabled. One finger pans; two fingers use Leaflet zoom. Removed the extra map-move mode and toggle.
- Map and its overlays opt out of app page swiping. Main menu swipes continue on feed, tiles, studio and outside the map. The map page's ancestor permits map gestures, and the canvas owns touch input so it cannot become a document scroll.
- Header is sticky, opaque and explicitly has no filter/backdrop filter. Top padding and height include the top safe-area inset. The feed toolbar sticks below it; map height accounts for the added inset, including short screens.
- First-use guidance reflects direct map panning.
- Teardown ignores late move/zoom/resize callbacks so leaving a moving map cannot read an already removed Leaflet pane.

Validation: production build, typecheck, 23 page-swipe checks and 11 card-navigation checks passed. At 390 × 844, actual browser pointer drags in horizontal/vertical/diagonal directions changed the map-pane transform without changing document scroll or menu. Feed-to-map swipe still works. Header background computed opaque white, backdrop filter none. Actual iPhone home-screen status-bar compositing and physical pinch gestures require device confirmation; browser viewport emulation cannot reproduce the iOS system overlay.

Only deploy to the existing Preview branch; production remains unchanged.
