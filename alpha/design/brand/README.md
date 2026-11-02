# ticgle — approved direction A

Rounded, gently italic lowercase wordmark; lowercase t and detached speck app
symbol. Source artwork was generated from the approved A board. Generated references stay outside public. Clean SVG masters in public/brand
retain the approved silhouettes without raster specks. Run `node scripts/generate-ticgle-icons.mjs` for deployment sizes.

UI accent: #F4511E. Small accent text uses #B83A15 in light mode (5.75:1 on white)
and #FF9673 in dark mode (9.40:1 on #08080A). Existing user-created card palettes
are independent of application branding.

Versioned filenames cover the app header, login, loading, favicon, Apple touch
icon, manifest, push icon and Open Graph artwork. The maskable icon has additional
safe-area padding. Older assets remain for already-open clients. Installed iOS
home-screen icons may retain the previous artwork until the OS refreshes them.

Shared loading handwriting: `LoadingWordmark` groups the original SVG contours
into six letters and reveals all letters simultaneously with pen masks over 1 second.
Used by startup, authentication transition, full-record loading (map/collection/studio),
and the map tile entrance. Small inline/pagination loaders keep their compact indicators. CSS runs once,
with no timers, fetches or delay to app readiness. Reduced motion reveals the full
logo immediately. Unique mask IDs allow multiple instances. Regenerate contour
data with `node scripts/generate-loading-wordmark.mjs` after changing the master;
review the pen centerlines as well. Static snapshots during and after the reveal were
inspected; the final even-odd paths retain the original counters of g and e.

Validation: source/output artwork inspected; image dimensions and alpha checked;
typecheck, surface interactions and production build passed. Full browser/PWA
visual execution remains unavailable while local browser use is disabled.
