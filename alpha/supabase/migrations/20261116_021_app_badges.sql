begin;
-- Do not cap the stored unread count: the OS decides how large badges appear.
do $patch$
declare definition text;
begin
 select pg_get_functiondef('public.l2u_activity_inbox(boolean)'::regprocedure) into definition;
 definition=replace(definition,'least(99,(select count(*) from events where at>seen))','(select count(*) from events where at>seen)');
 if position($old$'badgeUpdatedAt'$old$ in definition)=0 then
  if position($old$jsonb_build_object('items',$old$ in definition)=0 then raise exception 'UNEXPECTED_BADGE_INBOX_BODY';end if;
  definition=replace(definition,$old$jsonb_build_object('items',$old$,$new$jsonb_build_object('badgeUpdatedAt',floor(extract(epoch from stamp)*1000),'items',$new$);
 end if;
 execute definition;
end $patch$;
-- Only the push delivery server can query other recipients' counts.
-- One bounded batch lookup serves all devices belonging to the same recipient.
create or replace function public.l2u_activity_badge_counts(p_users uuid[]) returns jsonb
language plpgsql security definer set search_path='' as $$
declare result jsonb;stamp timestamptz=clock_timestamp();
begin
 if coalesce(cardinality(p_users),0)>40 then raise exception 'BADGE_BATCH_LIMIT';end if;
 with actors as (select distinct unnest(p_users) as id), my_groups as materialized (
  select m.user_id,g.id,m.joined_at from actors a join public.l2u_members m on m.user_id=a.id
  join public.l2u_groups g on g.id=m.group_id where m.active and not g.archived
 ), events as (
  select g.user_id,s.shared_at as at from my_groups g join public.l2u_shares s on s.group_id=g.id
  join public.l2u_logs l on l.id=s.log_id where l.author_id<>g.user_id
   and s.shared_at>=greatest(stamp-interval '30 days',g.joined_at) and s.shared_at<=stamp
  union all
  select g.user_id,c.created_at from my_groups g join public.l2u_comments c on c.group_id=g.id
  join public.l2u_logs l on l.id=c.log_id
  left join public.l2u_comments parent on parent.id=c.parent_id and parent.log_id=c.log_id and parent.group_id=c.group_id
  where c.author_id<>g.user_id and (l.author_id=g.user_id or parent.author_id=g.user_id)
   and c.created_at>=greatest(stamp-interval '30 days',g.joined_at) and c.created_at<=stamp
   and exists(select 1 from public.l2u_shares s where s.log_id=l.id and s.group_id=g.id)
 ), totals as (
  select a.id,count(e.at) as total from actors a left join l2u_private.activity_reads r on r.user_id=a.id
  left join events e on e.user_id=a.id and e.at>coalesce(r.seen_at,'-infinity'::timestamptz) group by a.id
 ) select jsonb_build_object('counts',coalesce(jsonb_object_agg(id,total),'{}'::jsonb),'updatedAt',floor(extract(epoch from stamp)*1000)) into result from totals;
 return result;
end $$;
revoke all on function public.l2u_activity_badge_counts(uuid[]) from public,anon,authenticated;
grant execute on function public.l2u_activity_badge_counts(uuid[]) to service_role;
insert into public.l2u_schema_migrations(version) values(21) on conflict(version) do nothing;
notify pgrst,'reload schema';
commit;
