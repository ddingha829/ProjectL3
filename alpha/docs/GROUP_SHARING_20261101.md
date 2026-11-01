# Existing-card group sharing

Own card → Share → **모임에 공유** opens the same destination sheet as the card's sharing management action. Multiple joined groups can be selected. This links the original card, without cloning its contents or uploading another photo.

Additional groups are allowed strictly before 48 hours from original server publication. Editing the card, changing its record date, or sharing it again does not extend this window. Existing destinations remain editable/removable after expiry; removing and adding a destination again counts as a new share. Content edits retaining existing destinations remain allowed.

The sheet shows remaining time and the absolute deadline, updates while open, disables expired additions, and preserves selection with a dismissible inline error on failure. The content editor enforces the same policy. Others' cards have no group repost action.

## Server and release order

Migration `20261101_010_group_share_window.sql` adds immutable `l2u_logs.published_at`, checks all new share inserts, exposes trusted publication time in snapshots, and adds the authenticated, owner/revision-checked, idempotent `l2u_share_to_groups` RPC. Sharing transmits only log/group IDs, expected revision and an operation ID. Existing RLS, membership checks and notification triggers remain in effect.

For first-revision legacy records, backfill uses their original server `updated_at`. For previously edited legacy records, the earliest available `created_at`/`updated_at` is used, capped at migration time: an exact historical server insertion time was not stored. New records always use the server clock, independently of client-supplied record dates.

**Apply migration 10 before releasing the frontend**, which selects `published_at` in paged feed reads. Existing frontend builds are compatible with the additive column/snapshot property. Back up the existing snapshot definition and counts before applying. No original logs, photos, comments or accounts are deleted by this migration.

## Validation

- `npm run test:sharing`: policy boundaries and failed/dismissed request UX; 15 isolated PostgreSQL cases covering immutable time, spoofed dates, expiry, retained shares, unsharing, atomic rollback, idempotent retry and ownership. No live mutations.
- `npm run typecheck`, `npm run build`.
- `npm run test:db`: 52 checks; `npm run test:notifications`: notification regression suites.
- Browser QA at 393×793 and 320×640: fresh local demo card, multi-group save/reopen, expired additions disabled and existing destination removable. Physical iOS PWA testing remains device-side.

Local QA artifacts (untracked): `.test-data/group-sharing-393.png`, `.test-data/group-sharing-schema-before.json`, `.test-data/group-sharing-schema-live.json`.
