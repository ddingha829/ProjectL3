# Unified activity alerts

The existing opt-in `new_logs` setting is presented as **모임 활동 알림**. Its value and API remain compatible with installed clients: it covers a group's new shared records immediately, new comments on the recipient's own cards immediately, and likes received across their cards in one hourly digest. Nearby alerts retain their separate opt-in and six-hour rule.

## Server behaviour

- Migration 9 extends the existing private push queue with a notification kind, comment reference and hourly bucket. Existing new-log rows, opt-in choices, endpoints and signing keys are preserved. No historical comment or reaction is backfilled.
- A new comment creates at most one job per subscribed device for the card author. Self comments are excluded. Updating a comment does not trigger another job; deletion removes its queued job through its foreign key.
- A like records one event per actor/card/hour and one future queue job per recipient/device/hour. The bucket is the next full UTC hour (also a full hour in Korea). The existing five-minute retry cron runs at every hour boundary. Likes do not wake the HTTP worker on each tap.
- The digest includes all eligible cards in that bucket, with current like total, distinct people and card count. Unlike removes the pending event. Bookmark actions and self likes are excluded. Empty digests are finished without sending.
- Claiming rechecks the unified opt-in, surviving comments/reactions, card ownership and the reacting person's current group access. The queue retains its token-based leases, bounded workers, retries and dead-endpoint removal. Stable OS tags identify duplicate attempts.
- Turning the unified setting off clears pending activity and like-event rows so re-enabling it cannot resurface an old hourly batch. No browser can query the private event table or claim push jobs.
- The daily cleanup schedule removes like-event metadata after two days and finished activity jobs after seven days. Original cards, comments, reactions and existing new-log jobs are not deleted by this cleanup.
- Comment push text identifies the card and commenter, without copying the comment body to the lock screen. Activity links open the recipient's own card under `scope=mine`, with ownership checked again by the app. Group and map links retain their earlier checks.

## Release and verification

1. Preserve the current notification functions, queue constraints and scheduler metadata from the target project. The local snapshot is `.test-data/activity-notifications-before.json`. No signing key, endpoint or user content is part of that snapshot.
2. Run `npm run test:notifications` and `npm run build`. Existing notification tests, plus 28 isolated PostgreSQL cases for immediate comments/hourly likes, passed. Rules and worker tests cover personal-card links, stale account isolation and stable activity tags. Lifecycle tests retain direct-click permissions and allow opt-out even when OS permission is blocked.
3. Deploy the compatible frontend and service worker, then apply `supabase/migrations/20261101_009_activity_notifications.sql` transactionally and `supabase/notifications-activity-runtime.sql`. Preserve the existing `l2u-push-retry` schedule.
4. Read-only live checks should confirm schema/health version 9, the three activity triggers, enabled private-table RLS, service-only claiming and active retry/cleanup schedules. Do not send test pushes to real members or change their settings.

The production-built settings sheet was inspected at 393 × 793 in the example account. It contains one “모임 활동 알림” switch with the immediate/hourly explanation and a separate nearby switch. The sheet remained scrollable and dismissible; no OS permission was requested. Screenshot: `.test-data/activity-settings-393.png`.

The hourly digest links to its most recently liked card; the text summarizes other affected cards. Delivery is subject to OS notification permission, connectivity, browser push support and retry timing. UI timing is immediate versus hourly; an OS receipt cannot be guaranteed at an exact second.

Primary references: [Supabase Cron](https://supabase.com/docs/guides/cron), [MDN showNotification](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerRegistration/showNotification). The existing browser-installed PWA permission flow is reused.
