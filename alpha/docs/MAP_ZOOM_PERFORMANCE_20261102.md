# Map zoom performance

## Display-only regions

District display geometry is derived offline with mapshaper 0.7.101 using clean,
100m weighted simplification, keep-shapes and 5-decimal coordinates. See the first
command in `scripts/build-map-display.mjs`, then run that script to restore source
properties and bounds and write `district-display.json`.

The original district and precise dong files are unchanged. All 256 district
codes/names/bounding boxes are preserved. Region aggregation still prefers precise
dong membership, so display simplification does not change that classification.
Shared-border slivers are cleaned in the display copy; it is not an authoritative
administrative dataset.

- Original: 2,708,966 bytes / 127,470 coordinates.
- Display: 1,459,043 bytes / 67,374 coordinates (46% fewer bytes, 47% fewer points).
- Runtime fetches the versioned display file; it does not simplify on the phone.

## Freeze colour masks while zooming

On zoomstart, cancel pending mask decodes and freeze the current mask. During
zoom/zoomanim, only the mask frame position/size and inverse child alignment are
updated to match Leaflet's public projection coordinates. Native tile zooming
continues; mask pixels scale with the same geographic transform. No polygon
projection or SVG decode is performed per zoom frame.

On zoomend, resume updates and build the final mask. Keep the projected old frame
visible until its replacement is decoded, then swap frame/image together. A second
zoom before decode uses the last displayed frame as its origin. Scope cleanup
still cancels pending frames, timers and masks. Tier changes no longer replay the
initial colour fade; the initial entrance and manual replay remain.

Checks passed: map region geometry/identity/aggregation (13), mask lifecycle (34,
including 60 zoom frames with zero geometry rebuilds/decodes), typecheck and build.
Physical iPhone/Samsung rendering/FPS is not verified while browser access remains
disabled. No DB schema changes, new APIs, server computation or polling added.

## Buffered viewport and prefetch

Only regions whose source bounds intersect the screen plus 256px on every side
are projected into colour masks. Outlines and active colour tile levels use the
same buffer, refreshed after movement/zoom/resize. Whole-scope coverage, counts,
precise membership and stored logs stay unchanged. Bounds tests cover polygons
crossing the viewport, inclusive edges, wrapped longitudes and world views.

After the first map paint, idle time (or a 300ms fallback) preloads the district
display file for maps with located logs. Picking a new location and empty maps do
not prefetch. The existing shared Promise cache deduplicates foreground demand
and prefetch; failures are handled by the normal demand retry path. Scheduled
idle callbacks/timers are cancelled on cleanup. No ongoing polling is introduced.

Neighborhood colours now remain through zoom 11 (previously 12); zooming out below
11 switches to districts. The wider threshold preserves city context at startup
while allowing more zoom-out before neighbourhoods aggregate.

Region tests now include 17 checks with one mocked prefetch/demand request; the
34 mask lifecycle checks, typecheck and production build also pass. Device-level
frame-rate and network timing still need physical-phone verification.
