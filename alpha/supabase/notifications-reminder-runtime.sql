-- Apply AFTER migration 12 and the reminder-aware service worker deployment.
-- Supabase pg_cron runs in UTC: 03/06/09 UTC = 12/15/18 Asia/Seoul.
-- No historical backfill and no immediate test delivery.
begin;
do $$begin
 if coalesce(current_setting('cron.timezone',true),'GMT') not in ('GMT','UTC','Etc/UTC') then
  raise exception 'Expected UTC cron timezone; verify schedule before enabling reminders';
 end if;
end $$;
select cron.schedule('l2u-writing-reminders','0 3,6,9 * * *',
 $job$select l2u_private.queue_reminder_push();select l2u_private.wake_push_worker();$job$);
commit;
