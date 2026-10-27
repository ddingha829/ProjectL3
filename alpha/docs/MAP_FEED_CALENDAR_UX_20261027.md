# Map entrance, inline feed views, calendar sizing — 2026-10-27

## Changes
- First map paint uses a location pulse and soft map reveal, followed by the existing region color reveal. Shared between the main map and calendar map; dynamic loading placeholders use the same treatment.
- Reveal follows the first loaded tile. A failed load or five-second post-initialization fallback releases the cover so existing retry/error controls remain available. Timers clean up on unmount; system reduced motion and the app motion preference are respected.
- Feed view mode has its own inline expanding control for cards/list/calendar. Opening search, filter, library or view collapses the other expanded controls. More now contains library actions only. Escape and outside click close the view control.
- Unified calendar height now follows the available viewport, keeping space for the header, feed tools, floating navigation and safe areas. Mobile map fills the remaining row; wider screens keep the calendar and map alongside each other.
- First-use guidance reflects the separate view control.

## Validation
- TypeScript and production build passed.
- Browser: 390x844 mobile, 320x740 narrow phone, 1024x768 tablet; light/dark, six-row August calendar, search-to-view transitions, library contents and Escape.
- At 390x844 the calendar map is approximately 307px tall and ends above the floating dock. At 320x740 a six-row month keeps a 189px map without horizontal overflow.
- Main map drag moved the Leaflet pane while page scroll stayed at zero. Browser console had no errors during checks.
- Preview deployment only; production unchanged.
