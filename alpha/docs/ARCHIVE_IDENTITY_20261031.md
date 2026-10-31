# Archive identity and ticket cutouts — 2026-10-31

- Confirmed new saves show the actual card briefly settling into the feed. Failed cloud saves do not trigger success animation. Reduced-motion uses a status message.
- Complete 16-slot collections open a poster for PNG export, device sharing, and explicit Kakao sharing preparation. Existing board dimensions and bottom navigation geometry remain unchanged.
- First saved neighborhood gets a short localized glow and status notice; no extra database requests.
- Warm neutral canvas and opaque utility controls keep the glass treatment focused on navigation. No individual-card brand mark was added.
- Ticket faces now use true transparent mask cutouts, without fake white circles or the outer border crossing the holes. Export derives the punch position from the actual stub instead of the obsolete portrait ratio.

## Validation
- Production build and TypeScript passed.
- Map regions: 12 checks; reveal mask: 23,100 pan frames; mosaic encouragement: 55 checks passed.
- Local browser: 320×568 and 393×793 layouts, completed poster and PNG download, new-region glow cleanup, light/dark appearance.
- PNG alpha inspected: portrait 1080×1728 and square 1080×1080 holes are transparent on both edges; adjacent body remains opaque.
- 320px poster action stays within the viewport; no horizontal overflow. Temporary fixture removed before production build.
- Physical iPhone rendering and delivery to an external Kakao recipient were not tested.
