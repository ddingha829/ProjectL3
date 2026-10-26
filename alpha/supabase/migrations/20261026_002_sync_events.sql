begin;
-- A removed member may read their own membership row (but no group/log data),
-- allowing the subscription to invalidate their cached group immediately.
alter policy l2u_member_read on public.l2u_members using(user_id=auth.uid() or l2u_private.member(group_id));
create index l2u_comments_log on public.l2u_comments(log_id,created_at);
create index l2u_logs_photo_path on public.l2u_logs((payload->>'imagePath')) where payload->>'imagePath' is not null;
do $$
declare t text;
begin
 if exists(select 1 from pg_publication where pubname='supabase_realtime') then
  foreach t in array array['l2u_logs','l2u_shares','l2u_mosaic','l2u_members','l2u_groups','l2u_comments','l2u_reactions','l2u_preferences','l2u_profiles'] loop
   if not exists(select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename=t) then
    execute format('alter publication supabase_realtime add table public.%I',t);
   end if;
  end loop;
 end if;
end $$;
insert into public.l2u_schema_migrations(version) values(2);
commit;
