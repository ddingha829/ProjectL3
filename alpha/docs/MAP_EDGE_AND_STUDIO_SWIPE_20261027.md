# Map edge and Studio screen swipes — 2026-10-27

- The main map now pages inward from its left/right 44px edge bands. The central map retains panning and pinching; controls and browser back edges are excluded. Subtle noninteractive side handles mark the gesture area. Other embedded maps remain unchanged.
- Edge starts are claimed before Leaflet receives the gesture, preventing a map pan and menu change from occurring together.
- Removed the blanket swipe exclusion from Studio preview and workbench. Native horizontal option lists and inputs remain protected. The canvas, fixed control rows, front-option area and tile board reserve horizontal touch gestures in CSS.
- Touch events and pointer-only touch devices are both handled, without completing the same gesture twice. Guide updated.

Validation:
- 23 swipe intent/destination, 24 event-subscription and 11 card-navigation checks passed.
- TypeScript and production build passed.
- Browser at 390x844: map right edge → Tiles → Studio; Studio tabs/front options → Tiles → Map; central map drag changes map translation without navigating; map left edge → Feed. No browser errors.
- Touch event tests include map edge/center/control behavior, pointer cancellation, pointer-only touch and duplicate input streams. Physical iPhone verification remains separate from these browser checks.
