-- Temporary policy expansion. Restore 48 hours with a later migration when requested.
begin;
create or replace function l2u_private.check_share_window() returns trigger
language plpgsql security definer set search_path='' as $$
declare published timestamptz;
begin
 -- Existing destinations and removals remain legal after the deadline.
 if exists(select 1 from public.l2u_shares s where s.log_id=new.log_id and s.group_id=new.group_id) then return new;end if;
 select published_at into published from public.l2u_logs where id=new.log_id for share;
 if published is null or clock_timestamp()>=published+interval '7 days' then raise exception 'SHARE_WINDOW_EXPIRED';end if;
 return new;
end $$;
revoke all on function l2u_private.check_share_window() from public,anon,authenticated;
commit;
