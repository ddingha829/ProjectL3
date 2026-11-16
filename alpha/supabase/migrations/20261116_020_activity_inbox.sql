begin;
-- A single read cursor per user; existing posts/comments remain the event source.
create table if not exists l2u_private.activity_reads(
 user_id uuid primary key references public.l2u_profiles(id) on delete cascade,
 seen_at timestamptz not null default '-infinity'
);
alter table l2u_private.activity_reads enable row level security;
revoke all on l2u_private.activity_reads from public,anon,authenticated;
create index if not exists l2u_comments_log_time on public.l2u_comments(log_id,created_at desc);
create index if not exists l2u_shares_group_time on public.l2u_shares(group_id,shared_at desc);
create or replace function public.l2u_activity_inbox(p_mark_read boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid=auth.uid(); seen timestamptz; stamp timestamptz=clock_timestamp(); result jsonb;
begin
 if actor is null then raise exception 'AUTH_REQUIRED';end if;
 select seen_at into seen from l2u_private.activity_reads where user_id=actor;
 seen=coalesce(seen,'-infinity'::timestamptz);
 with my_groups as materialized (
  select g.id,g.name,m.joined_at from public.l2u_members m join public.l2u_groups g on g.id=m.group_id
  where m.user_id=actor and m.active and not g.archived
 ), events as (
  select 'post:'||l.id||':'||g.id as id,'post'::text as kind,l.id as log_id,g.id as group_id,g.name as group_name,
   null::uuid as comment_id,coalesce(p.name,'모임원') as actor_name,
   left(coalesce(nullif(l.payload#>>'{youtube,title}',''),nullif(l.payload#>>'{work,title}',''),nullif(l.payload->>'title',''),'새 티끌'),240) as title,
   left(coalesce(l.payload->>'body',''),200) as body,s.shared_at as at
  from my_groups g join public.l2u_shares s on s.group_id=g.id join public.l2u_logs l on l.id=s.log_id
  left join public.l2u_profiles p on p.id=l.author_id
  where l.author_id<>actor and s.shared_at>=greatest(stamp-interval '30 days',g.joined_at) and s.shared_at<=stamp
  union all
  select 'comment:'||c.id,case when parent.author_id=actor then 'reply' else 'comment' end,l.id,g.id,g.name,c.id,
   coalesce(p.name,'모임원'),
   left(coalesce(nullif(l.payload#>>'{youtube,title}',''),nullif(l.payload#>>'{work,title}',''),nullif(l.payload->>'title',''),'내 티끌'),240),
   c.body,c.created_at
  from my_groups g join public.l2u_comments c on c.group_id=g.id join public.l2u_logs l on l.id=c.log_id
  left join public.l2u_comments parent on parent.id=c.parent_id and parent.log_id=c.log_id and parent.group_id=c.group_id
  left join public.l2u_profiles p on p.id=c.author_id
  where c.author_id<>actor and (l.author_id=actor or parent.author_id=actor)
   and c.created_at>=greatest(stamp-interval '30 days',g.joined_at) and c.created_at<=stamp
   and exists(select 1 from public.l2u_shares s where s.log_id=l.id and s.group_id=g.id)
 ), latest as (select * from events order by at desc,id desc limit 50)
 select jsonb_build_object('items',coalesce((select jsonb_agg(jsonb_build_object(
  'id',id,'kind',kind,'logId',log_id,'groupId',group_id,'groupName',group_name,'commentId',comment_id,
  'actorName',actor_name,'title',title,'body',body,'createdAt',extract(epoch from at)*1000,'unread',at>seen
 ) order by at desc,id desc) from latest),'[]'::jsonb),
 'unreadCount',case when p_mark_read then 0 else least(99,(select count(*) from events where at>seen)) end) into result;
 if p_mark_read then insert into l2u_private.activity_reads(user_id,seen_at) values(actor,stamp)
  on conflict(user_id) do update set seen_at=greatest(l2u_private.activity_reads.seen_at,excluded.seen_at);end if;
 return result;
end $$;
revoke all on function public.l2u_activity_inbox(boolean) from public,anon;
grant execute on function public.l2u_activity_inbox(boolean) to authenticated;

-- The same activity opt-in also delivers direct replies to the parent author.
create or replace function l2u_private.queue_comment_push() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid; added integer; queued integer=0;
begin
 if new.group_id is null then return new;end if;
 for recipient in select distinct id from (
  select author_id as id from public.l2u_logs where id=new.log_id
  union select author_id from public.l2u_comments where id=new.parent_id and log_id=new.log_id and group_id=new.group_id
 ) targets where id<>new.author_id loop
  if not exists(select 1 from public.l2u_shares sh join public.l2u_groups g on g.id=sh.group_id
   join public.l2u_members a on a.group_id=g.id and a.user_id=new.author_id and a.active
   join public.l2u_members b on b.group_id=g.id and b.user_id=recipient and b.active
   where sh.log_id=new.log_id and sh.group_id=new.group_id and not g.archived) then continue;end if;
  insert into l2u_private.push_jobs(user_id,log_id,subscription_id,kind,comment_id)
  select recipient,new.log_id,s.id,'comment',new.id from l2u_private.push_subscriptions s
  join l2u_private.notification_preferences p on p.user_id=s.user_id and p.new_logs
  where s.user_id=recipient on conflict do nothing;
  get diagnostics added=row_count;queued=queued+added;
 end loop;
 if queued>0 then perform l2u_private.wake_push_worker();end if;return new;
end $$;
do $patch$
declare definition text;
 old_log text:=$old$select * into l from public.l2u_logs where id=j.log_id and author_id=j.user_id;$old$;
 new_log text:=$new$select * into l from public.l2u_logs where id=j.log_id and (author_id=j.user_id or exists(select 1 from public.l2u_comments parent where parent.id=c.parent_id and parent.log_id=j.log_id and parent.group_id=c.group_id and parent.author_id=j.user_id));$new$;
 old_detail text:=$old$detail=left(coalesce(nullif(l.payload#>>'{work,title}',''),nullif(l.payload->>'title',''),'내 티끌'),80)||'에 새 댓글이 달렸어요.';$old$;
 new_detail text:=$new$detail=case when exists(select 1 from public.l2u_comments parent where parent.id=c.parent_id and parent.author_id=j.user_id) then '내 댓글에 답글이 달렸어요.' else left(coalesce(nullif(l.payload#>>'{work,title}',''),nullif(l.payload->>'title',''),'내 티끌'),80)||'에 새 댓글이 달렸어요.' end;$new$;
 old_heading text:=$old$heading=left(coalesce(actor_name,'모임원'),30)||'님이 댓글을 남겼어요';$old$;
 new_heading text:=$new$heading=left(coalesce(actor_name,'모임원'),30)||case when exists(select 1 from public.l2u_comments parent where parent.id=c.parent_id and parent.author_id=j.user_id) then '님이 답글을 남겼어요' else '님이 댓글을 남겼어요' end;$new$;
begin
 select pg_get_functiondef('public.l2u_push_claim(integer,uuid)'::regprocedure) into definition;
 if position(new_log in definition)=0 then
  if position(old_log in definition)=0 or position(old_heading in definition)=0 or position(old_detail in definition)=0 then raise exception 'UNEXPECTED_REPLY_PUSH_BODY';end if;
  execute replace(replace(replace(definition,old_log,new_log),old_heading,new_heading),old_detail,new_detail);
 end if;
end $patch$;
revoke all on function l2u_private.queue_comment_push() from public,anon,authenticated;
insert into public.l2u_schema_migrations(version) values(20) on conflict(version) do nothing;
notify pgrst,'reload schema';
commit;
