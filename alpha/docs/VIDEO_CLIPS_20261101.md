# 480p two-second clips and export edges — 2026-11-01

## Behavior
- Photo and video are separate entry choices; video can come from the album or native camera.
- A selected start point produces exactly 48 frames at 24 fps: 2 seconds, 480 × 768, H.264 MP4, muted. Short segments are rejected instead of padded. Source: 2 seconds–2 minutes, at most 50 MiB.
- The 10:16 crop is shown before submission. A separate 1080 × 1728 WebP cover (at most 300 KiB) remains the card and external-sharing image. Video is fetched only after explicitly pressing play; no feed autoplay/download.
- A photo replacement clears video metadata. Original-log edits and group sharing retain the same asset reference.
- Account backup includes the referenced MP4s and a video reference manifest.

## Storage and limits
- Migration 11 adds private source/final buckets, service-only job/asset registries, a verified-asset trigger, and shared-log read checks. Legacy broad policies cannot bypass the new bucket guards.
- Signed source uploads bypass application request-body limits. Only authenticated owners can claim a preparation job, once. Preparation is limited to 10 per rolling 24 hours per account.
- Final MP4 cap: 450,000 bytes. SDR fixture: 250,500 bytes plus a 40,534-byte cover. Synthetic HDR input also passed tone mapping and encoding.
- Temporary sources are removed after encoding; hourly cleanup handles interrupted sources and token replays. Unreferenced prepared media is eligible after two days. Referenced videos and reused covers are retained.
- Migration 11 applied successfully; both buckets are private, existing photo policy count remains 4, cleanup cron is active at minute 37 hourly. Live log/share counts increased during verification due to concurrent app use; the migration does not delete or rewrite existing records.

## Remote integration
- Preserved local work in `stash@{0}` (`video-480p-in-progress-before-85bcb05-20261101`), fast-forwarded to 85bcb05, then applied and resolved the stash.
- Retained remote Wallet tilt/glare, sheet drag, heart/number animations, navigation/header motion, tile swing, map progress, fixed-size location marker, and improved WebP quality. Stash retained as a recovery copy.

## Shared image edge correction
- Screen-only SVG keylines were already excluded. The base card's 1px CSS border remained in the exported clone, leaving a pale rim around full-bleed photos.
- Export clones now remove border width entirely; the displayed card remains unchanged. Internal paper margins/dividers and transparent ticket cutouts remain intact.
- Actual browser export of cover/ticket/polaroid produced 1080 × 1728 PNGs. Solid-color cover pixels on left/right/top edges are exactly [32,96,128,255], with transparent outer corners [0,0,0,0]. No white keyline is present in the generated cover. Previously sent images cannot be changed retroactively.

## Validation
- `npm run typecheck`, `npm run build`
- `npm run test:surfaces`, `test:swipe`, `test:viewport`, `test:feed-toolbar`
- `npm run test:video`: exact encoding, silent output, byte limits, short-segment rejection, 14 isolated DB/RLS checks (no live test accounts).
- Local mobile-width composer → trim → save → detail playback tested with mocked uploads and actual encoded MP4. Duration 2 seconds, muted, controls available, stops at end.
- Real iPhone/Android native camera selection and live authenticated uploading still require device smoke testing; local browser tests do not substitute for that.
