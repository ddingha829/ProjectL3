-- Run only together with the notification feature activation (after migration 7).
-- No API credentials or endpoint secrets belong in this file.
create extension if not exists pg_net with schema extensions;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('l2u-push-retry','*/5 * * * *',
 $job$select l2u_private.wake_push_worker();$job$);
-- Wake-up is a no-op when the queue is empty. Failed sends retry at five-minute
-- intervals, at most three attempts. The initial wake-up is transactional.
