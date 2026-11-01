-- One existing opt-in now covers new shared logs, comments and hourly likes.
-- No historical reaction/comment is backfilled, and no user content is changed.
begin;
alter table l2u_private.push_jobs add column kind text not null default 'new-log' check(kind in ('new-log','comment','likes'));
alter table l2u_private.push_jobs add column comment_id uuid references public.l2u_comments(id) on delete cascade;
alter table l2u_private.push_jobs add column batch_at timestamptz;
alter table l2u_private.push_jobs alter column log_id drop not null;
alter table l2u_private.push_jobs drop constraint push_jobs_user_id_log_id_subscription_id_key;
alter table l2u_private.push_jobs add constraint push_job_shape check(
 (kind='new-log' and log_id is not null and comment_id is null and batch_at is null) or
 (kind='comment' and log_id is not null and comment_id is not null and batch_at is null) or
 (kind='likes' and log_id is null and comment_id is null and batch_at is not null));
create unique index l2u_push_log_once on l2u_private.push_jobs(user_id,log_id,subscription_id) where kind='new-log';
create unique index l2u_push_comment_once on l2u_private.push_jobs(subscription_id,comment_id) where kind='comment';
create unique index l2u_push_likes_hour on l2u_private.push_jobs(user_id,subscription_id,batch_at) where kind='likes';
create index l2u_push_activity_history on l2u_private.push_jobs(finished_at) where kind<>'new-log' and finished_at is not null;

create table l2u_private.like_events(
 owner_id uuid not null references public.l2u_profiles(id) on delete cascade,
 log_id uuid not null references public.l2u_logs(id) on delete cascade,
 actor_id uuid not null references public.l2u_profiles(id) on delete cascade,
 batch_at timestamptz not null, created_at timestamptz not null default now(),
 primary key(log_id,actor_id,batch_at),check(owner_id<>actor_id)
);
create index l2u_like_events_owner_hour on l2u_private.like_events(owner_id,batch_at);
create index l2u_like_events_retention on l2u_private.like_events(batch_at);
alter table l2u_private.like_events enable row level security;
revoke all on l2u_private.like_events from public,anon,authenticated;

create function l2u_private.queue_comment_push() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
 select author_id into recipient from public.l2u_logs where id=new.log_id;
 if recipient=new.author_id or l2u_private.notification_group(new.author_id,new.log_id) is null then return new;end if;
 insert into l2u_private.push_jobs(user_id,log_id,subscription_id,kind,comment_id)
 select recipient,new.log_id,s.id,'comment',new.id from l2u_private.push_subscriptions s
 join l2u_private.notification_preferences p on p.user_id=s.user_id and p.new_logs
 where s.user_id=recipient on conflict do nothing;
 perform l2u_private.wake_push_worker();return new;
end $$;
create trigger l2u_queue_comment_push after insert on public.l2u_comments for each row execute function l2u_private.queue_comment_push();

create function l2u_private.cancel_like_push() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.kind='like' then
  delete from l2u_private.like_events where log_id=old.log_id and actor_id=old.user_id;
 end if;
 return old;
end $$;
-- INSERT and DELETE are separate functions so NEW/OLD never reference an
-- unassigned trigger record. Re-adding a removed like creates one current event.
create function l2u_private.queue_like_insert() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid; due timestamptz;
begin
 if new.kind<>'like' then return new;end if;
 select author_id into recipient from public.l2u_logs where id=new.log_id;
 if recipient=new.user_id or l2u_private.notification_group(new.user_id,new.log_id) is null or
 not exists(select 1 from l2u_private.notification_preferences p where p.user_id=recipient and p.new_logs) or
 not exists(select 1 from l2u_private.push_subscriptions s where s.user_id=recipient) then return new;end if;
 due=to_timestamp((floor(extract(epoch from now())/3600)+1)*3600);
 insert into l2u_private.like_events(owner_id,log_id,actor_id,batch_at) values(recipient,new.log_id,new.user_id,due) on conflict do nothing;
 insert into l2u_private.push_jobs(user_id,subscription_id,kind,batch_at,available_at)
 select recipient,s.id,'likes',due,due from l2u_private.push_subscriptions s where s.user_id=recipient on conflict do nothing;
 -- No immediate webhook: the existing five-minute retry cron also runs at
 -- every hour boundary and dispatches the single due digest per device.
 return new;
end $$;
create trigger l2u_queue_like_push after insert on public.l2u_reactions for each row execute function l2u_private.queue_like_insert();
create trigger l2u_cancel_like_push after delete on public.l2u_reactions for each row execute function l2u_private.cancel_like_push();

create or replace function public.l2u_push_claim(p_limit integer default 20,p_author uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j l2u_private.push_jobs; s l2u_private.push_subscriptions; l public.l2u_logs; c public.l2u_comments;
 gid uuid; actor_name text; log_title text; heading text; detail text; target text;
 result jsonb='[]'; token uuid; total_likes integer; people integer; cards integer; latest uuid;
begin
 for j in select q.* from l2u_private.push_jobs q left join public.l2u_logs log on log.id=q.log_id
 where q.finished_at is null and q.available_at<=now() and coalesce(q.lease_until,'-infinity'::timestamptz)<now()
 and (p_author is null or (q.kind='new-log' and log.author_id=p_author) or
 (q.kind='comment' and exists(select 1 from public.l2u_comments cc where cc.id=q.comment_id and cc.author_id=p_author)) or
 (q.kind='likes' and exists(select 1 from l2u_private.like_events e where e.owner_id=q.user_id and e.batch_at=q.batch_at and e.actor_id=p_author)))
 order by q.available_at,q.created_at limit greatest(1,least(coalesce(p_limit,20),50)) for update of q skip locked loop
  if j.attempts>=3 or j.created_at<now()-interval '24 hours' or not exists(select 1 from l2u_private.notification_preferences p where p.user_id=j.user_id and p.new_logs) then
   update l2u_private.push_jobs set finished_at=now() where id=j.id;continue;
  end if;
  actor_name=null;gid=null;target=null;
  if j.kind='new-log' then
   gid=l2u_private.notification_group(j.user_id,j.log_id);
   if gid is not null then
    select * into l from public.l2u_logs where id=j.log_id;
    select name into actor_name from public.l2u_profiles where id=l.author_id;
    heading=left(coalesce(actor_name,'모임원'),30)||'님의 새 티끌';
    detail=left(coalesce(nullif(l.payload#>>'{work,title}',''),nullif(l.payload->>'title',''),nullif(l.payload#>>'{place,name}',''),'새로운 기록'),100);
    target='/?view=logs&scope='||gid||'&log='||l.id;
   end if;
  elsif j.kind='comment' then
   select * into c from public.l2u_comments where id=j.comment_id;
   select * into l from public.l2u_logs where id=j.log_id and author_id=j.user_id;
   if c.id is not null and l.id is not null and c.author_id<>j.user_id and l2u_private.notification_group(c.author_id,l.id) is not null then
    select name into actor_name from public.l2u_profiles where id=c.author_id;
    heading=left(coalesce(actor_name,'모임원'),30)||'님이 댓글을 남겼어요';
    detail=left(coalesce(nullif(l.payload#>>'{work,title}',''),nullif(l.payload->>'title',''),'내 티끌'),80)||'에 새 댓글이 달렸어요.';
    target='/?view=logs&scope=mine&log='||l.id;
   end if;
  else
   select count(*)::int,count(distinct e.actor_id)::int,count(distinct e.log_id)::int into total_likes,people,cards
   from l2u_private.like_events e join public.l2u_logs ll on ll.id=e.log_id and ll.author_id=j.user_id
   join public.l2u_reactions r on r.log_id=e.log_id and r.user_id=e.actor_id and r.kind='like'
   where e.owner_id=j.user_id and e.batch_at=j.batch_at and e.actor_id<>j.user_id and l2u_private.notification_group(e.actor_id,e.log_id) is not null;
   if total_likes>0 then
    select e.log_id,p.name into latest,actor_name from l2u_private.like_events e
    join public.l2u_logs ll on ll.id=e.log_id and ll.author_id=j.user_id
    join public.l2u_reactions r on r.log_id=e.log_id and r.user_id=e.actor_id and r.kind='like'
    join public.l2u_profiles p on p.id=e.actor_id
    where e.owner_id=j.user_id and e.batch_at=j.batch_at and e.actor_id<>j.user_id and l2u_private.notification_group(e.actor_id,e.log_id) is not null
    order by e.created_at desc,e.log_id,e.actor_id limit 1;
    heading='내 티끌에 좋아요 '||total_likes||'개가 모였어요';
    detail=left(coalesce(actor_name,'모임원'),30)||case when people>1 then '님 외 '||(people-1)||'명' else '님' end||' · 지난 한 시간, 카드 '||cards||'장';
    target='/?view=logs&scope=mine&log='||latest;
   end if;
  end if;
  if target is null then update l2u_private.push_jobs set finished_at=now() where id=j.id;continue;end if;
  select * into s from l2u_private.push_subscriptions where id=j.subscription_id;
  token=gen_random_uuid();
  update l2u_private.push_jobs set attempts=attempts+1,lease_token=token,lease_until=now()+interval '2 minutes' where id=j.id;
  result=result||jsonb_build_array(jsonb_build_object('id',j.id,'token',token,'subscription',jsonb_build_object('endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth_key)),
   'payload',jsonb_build_object('title',heading,'body',detail,'url',target,'ownerId',j.user_id,'kind',j.kind,'id',j.id)));
 end loop;return result;
end $$;

create function l2u_private.prune_activity_notifications() returns void
language plpgsql security definer set search_path='' as $$
begin
 delete from l2u_private.like_events where batch_at<now()-interval '2 days';
 delete from l2u_private.push_jobs where kind<>'new-log' and finished_at<now()-interval '7 days';
end $$;
create or replace function public.l2u_notification_preferences(p_new_logs boolean,p_nearby boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_new_logs is null or p_nearby is null then raise exception 'INVALID_NOTIFICATION_PREFERENCES';end if;
 insert into l2u_private.notification_preferences(user_id,new_logs,nearby) values(auth.uid(),p_new_logs,p_nearby)
 on conflict(user_id) do update set new_logs=excluded.new_logs,nearby=excluded.nearby;
 if not p_nearby then update l2u_private.notification_preferences set lease_token=null,lease_key=null,lease_log=null,lease_until=null where user_id=auth.uid();end if;
 if not p_new_logs then
  update l2u_private.push_jobs set finished_at=now() where user_id=auth.uid() and finished_at is null;
  delete from l2u_private.like_events where owner_id=auth.uid();
 end if;
end $$;
create or replace function public.l2u_push_health() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',9,'webhook',exists(select 1 from l2u_private.push_runtime) and exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='net' and p.proname='http_post'))
$$;
revoke all on function l2u_private.queue_comment_push(),l2u_private.queue_like_insert(),l2u_private.cancel_like_push(),l2u_private.prune_activity_notifications() from public,anon,authenticated;
revoke all on function public.l2u_push_claim(integer,uuid),public.l2u_push_health() from public,anon,authenticated;
grant execute on function public.l2u_push_claim(integer,uuid),public.l2u_push_health() to service_role;
insert into public.l2u_schema_migrations(version) values(9);
commit;
