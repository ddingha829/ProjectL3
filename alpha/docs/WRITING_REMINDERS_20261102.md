# Scheduled writing reminders

The existing **모임 활동 알림** switch also controls writing prompts at **12:00,
15:00 and 18:00 Asia/Seoul**. Only opted-in accounts with an active, unarchived
group and a push subscription qualify. There is one prompt per account/device
and time slot, regardless of group count. Existing user preferences are not
changed by the migration.

Title: **티끌 남겨볼까요?**. Bodies vary for lunch, afternoon and evening. Tapping
opens the entry chooser in the user's restored scope (`/?compose=1`), without
fetching all feed records or automatically requesting camera permission. An
existing composer stays open; editing another card requires confirmation before
discarding its draft.

## Delivery and load

- Reuse the existing outbox, leases, three-attempt retry worker and seven-day
  history cleanup. No new client timer, GPS watch or polling.
- Scheduler runs three times daily, UTC `0 3,6,9 * * *`. An empty outbox does not
  wake the HTTP worker. The existing five-minute retry schedule is unchanged.
- A unique index prevents repeated scheduler calls from duplicating a slot.
  Opt-out and group membership are checked again when claiming delivery.
- No historical backfill: enqueue only in the first 15 minutes of a slot.
- A reminder expires 30 minutes after its slot. Database claim, provider TTL and
  service worker all enforce expiry so offline devices do not receive a backlog.
- Reminder URLs are same-origin and narrowly allowed. Account checks still
  protect notification display/clicks after logout or account switching.

## Activation order

1. Deploy reminder-aware app/worker (safe with existing migration 11).
2. Apply `supabase/migrations/20261102_012_reminder_notifications.sql`.
3. Apply `supabase/notifications-reminder-runtime.sql` to schedule future runs.
4. Verify `public.l2u_push_health()` returns version 12 and reminders=true, and
   `cron.job` has the active `l2u-writing-reminders` schedule. Do not manually
   enqueue or broadcast a production test reminder.

Until the schedule is active, the app keeps the existing activity description;
the reminder schedule appears after notification settings are loaded again.
Pause reminders with `cron.unschedule('l2u-writing-reminders')`; existing activity
notifications keep running. No application accounts/cards/photos are removed.

## Validation

`npm run test:notifications` exercises the actual SQL in isolated PGlite:
timezone boundaries, short scheduler delay, no night/backfill, duplicate runs,
multiple groups/devices, opt-out, leaving groups, leases, expiry, permissions and
cleanup. Service-worker tests cover running/closed app clicks, retry tags and
late delivery rejection. Hook tests ensure composer actions do not load the full
feed. No production users or push subscriptions are created for these tests.
