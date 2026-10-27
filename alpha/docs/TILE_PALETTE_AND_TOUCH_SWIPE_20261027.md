# Tile palette and touch navigation — 2026-10-27

- Writing and editing use a slightly clearer photo-backed sheet: gradient opacity reduced from 74–82% to 66–73%, with 12px blur. Reduced-transparency preferences retain an opaque surface.
- Mobile poster faces are approximately 14% wider, with the existing board height retained. Tile height can shrink on short displays to reserve space for the palette, safe areas and navigation.
- Empty tile palettes collapse into a compact status row. The unused zero badge is hidden, status text wraps safely and thumbnail images fill their frames. Populated palettes retain the horizontal card strip and upward placement gesture.
- Screen navigation uses native touch events for fingers and pointer events for mouse/pen. This avoids losing mobile navigation when a browser cancels the touch's pointer stream. A right swipe from Feed opens log creation; left/right move through adjacent destinations.
- Maps, horizontal lists, inputs, tile placement/editing, open dialogs, multitouch and system back edges retain their own gestures. Guide updated.

Validation:
- `npm run test:swipe`: 23 direction/threshold checks and 17 production event-subscription checks, including touch pointer cancellation, pinch, map ownership and listener cleanup.
- Card navigation regression: 11 checks passed.
- TypeScript and production build passed.
- Browser checks at 390x844 and 375x667: board/palette bounds, tile placement and return, populated/empty palette, swipe over Feed cards to creation, Tile-to-Studio and Studio-to-Tile, map panning and writing sheet opacity. These are browser and event-level checks, not a physical iPhone test.
- No database, account or environment changes.
