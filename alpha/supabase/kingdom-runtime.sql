-- First day at 00:00 Asia/Seoul = previous day 15:00 UTC.
-- Run daily and gate on the Korean calendar to handle all month lengths.
do $$ begin
 if coalesce(current_setting('cron.timezone',true),'GMT') not in ('GMT','UTC','Etc/UTC') then raise exception 'Expected UTC cron timezone';end if;
end $$;
select cron.schedule('l2u-kingdom-month-end','0 15 * * *',
 $$select l2u_private.seal_kingdom_month() where extract(day from now() at time zone 'Asia/Seoul')=1$$);
