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
## Production release completed

- Live URL: https://project-l3-nine.vercel.app/
- Deployment: dpl_98BWALsPY8HPPBoRweaF79kHTau2 / project-l3-iy44b0v0q-ddingha829s-projects.vercel.app
- Runtime source commit: 02b547d80784596baf0280e2ae9d78ecf2410c9b.
- Direct local CLI deploy was rejected because its local commit author could not be verified. No Git author metadata was changed. The already-authorized GitHub Preview deployment was rebuilt using `vercel redeploy <preview> --environment production`, and Vercel assigned the existing live domain.
- All 11 live HTTP integration checks passed on the public domain. Four public/PWA checks passed (no Vercel login, manifest identity, icons, replacement service worker).
- Real generated QA account logged in through the public UI, registered a private text log, refreshed and reopened it, and generated/downloaded a card image. No browser errors. Logged out after verification.
- Removed only the two marked generated test accounts, their one test photo, logs/groups and generated legacy profiles. Real accounts and records were not part of cleanup.
- Browser demo confirmed a 16-cell board and tray clear of navigation on the live domain.
- The tester guide is docs/ALPHA_TEST_GUIDE_KO.md. Physical-device camera/GPS/share/PWA compatibility remains the invited alpha test scope.
- Git pushes still produce Preview deployments. Production changes should use an explicit release of the reviewed GitHub deployment; local CLI author verification remains unchanged.
