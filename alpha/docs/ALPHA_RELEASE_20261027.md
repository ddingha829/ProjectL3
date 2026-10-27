# Unified alpha release — 2026-10-27

User approved replacing the existing personal production URL after verification. No legacy account/log import is requested.

Changes:
- Main map starts at zoom 11, just above the province/city-wide color aggregation threshold (below 11). Automatic GPS uses the same entry zoom; manual recenter keeps the chosen zoom.
- Calendar uses the same simplified vector map layer as the main map; local streets, individual buildings and POI noise are omitted by the shared renderer.
- Mosaic is 4x4 (16 cells per page). Phone tile widths retain the earlier five-column size, with the board and compact tray fitting above navigation. Existing absolute slot indices are retained; all 500 placements remain addressable across 32 pages, with only 4 usable cells on the last page.

Validation before release:
- 49 isolated DB checks; 19 real two-account cloud checks; 6 real quota/cache checks.
- 10 weather, 7 request-origin, 11 regional-map, 23 page-swipe, 11 card-navigation and 36 card-date checks.
- 11 actual HTTP integration checks: search, summaries, location, weather, images, public config and cross-site blocking.
- Browser verified 16 slots, former slot 24 on page 2, moving/opening a card, final slots 496-499 on page 32, and disabled next-page action.
- 390x844 / 375x667 / 320x600 tile layouts fit without page scroll and without tray/navigation overlap. Tile width at 390 is approximately 58px, matching the prior five-column layout.
- Calendar canvas reports simplified-vector source; map entry reports zoom 11 and district tier.

Remaining device-dependent checks are intentionally assigned to the invited alpha testers: camera lenses/pinch, GPS accuracy, native share sheets and installed-PWA refresh.

Rollback baseline: immutable deployment dpl_FhyHqWh2wcP9ZT2SV8pTeqFoP4Em. Configuration and exportable production environment backed up outside Git (path in ignored .test-data/release-backup-path.txt). Eight old sensitive variables cannot be exported by Vercel; the prior immutable deployment retains its original runtime environment. Roll back the deployment rather than rebuild it from current production env settings.
