-- Scheduled writing prompts share the existing activity opt-in.
-- This migration does not enqueue or send any notification. Enable the runtime
-- cron only after the matching application/service worker has been deployed.
begin;
alter table l2u_private.push_jobs drop constraint push_jobs_kind_check;
alter table l2u_private.push_jobs add constraint push_jobs_kind_check check(kind in ('new-log','comment','likes','reminder'));
alter table l2u_private.push_jobs drop constraint push_job_shape;
alter table l2u_private.push_jobs add constraint push_job_shape check(
 (kind='new-log' and log_id is not null and comment_id is null and batch_at is null) or
 (kind='comment' and log_id is not null and comment_id is not null and batch_at is null) or
 (kind in ('likes','reminder') and log_id is null and comment_id is null and batch_at is not null));
create unique index l2u_push_reminder_slot on l2u_private.push_jobs(user_id,subscription_id,batch_at) where kind='reminder';

create function l2u_private.reminder_slot(p_at timestamptz) returns timestamptz
language sql immutable set search_path='' as $$
 select case when extract(hour from p_at at time zone 'Asia/Seoul') in (12,15,18)
 and extract(minute from p_at at time zone 'Asia/Seoul')<15
 then date_trunc('hour',p_at at time zone 'Asia/Seoul') at time zone 'Asia/Seoul' end
$$;

create function l2u_private.queue_reminder_push(p_at timestamptz default now()) returns integer
language plpgsql security definer set search_path='' as $$
declare due timestamptz=l2u_private.reminder_slot(p_at); added integer;
begin
 if due is null then return 0;end if;
 insert into l2u_private.push_jobs(user_id,subscription_id,kind,batch_at,available_at)
 select s.user_id,s.id,'reminder',due,due from l2u_private.push_subscriptions s
 join l2u_private.notification_preferences p on p.user_id=s.user_id and p.new_logs
 where exists(select 1 from public.l2u_members m join public.l2u_groups g on g.id=m.group_id
  where m.user_id=s.user_id and m.active and not g.archived)
 on conflict do nothing;
 get diagnostics added=row_count;
 return added;
end $$;
revoke all on function l2u_private.reminder_slot(timestamptz),l2u_private.queue_reminder_push(timestamptz) from public,anon,authenticated;

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
  elsif j.kind='reminder' then
   if j.batch_at>now()-interval '30 minutes' and exists(
    select 1 from public.l2u_members m join public.l2u_groups g on g.id=m.group_id
    where m.user_id=j.user_id and m.active and not g.archived) then
    heading='티끌 남겨볼까요?';
    detail=case extract(hour from j.batch_at at time zone 'Asia/Seoul')
     when 12 then '점심의 작은 순간, 모임에 티끌 하나 남겨보세요.'
     when 15 then '잠깐 쉬어가는 오후, 지금의 순간을 티끌로 남겨보세요.'
     else '오늘 기억하고 싶은 순간을 모임과 나눠보세요.' end;
    target='/?compose=1';
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
   'payload',jsonb_build_object('title',heading,'body',detail,'url',target,'ownerId',j.user_id,'kind',j.kind,'id',j.id,'expiresAt',case when j.kind='reminder' then floor(extract(epoch from j.batch_at+interval '30 minutes')*1000)::bigint end)));
 end loop;return result;
end $$;



-- Report activation separately: merely installing SQL must not advertise a
-- schedule which is not running yet. No scheduler secrets are exposed.
create or replace function public.l2u_push_health() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare enabled boolean=false;
begin
 if to_regclass('cron.job') is not null then
  execute 'select exists(select 1 from cron.job where jobname=''l2u-writing-reminders'' and active and schedule=''0 3,6,9 * * *'')' into enabled;
 end if;
 return jsonb_build_object('version',12,'reminders',enabled,'webhook',exists(select 1 from l2u_private.push_runtime) and exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='net' and p.proname='http_post'));
end $$;
revoke all on function public.l2u_push_claim(integer,uuid),public.l2u_push_health() from public,anon,authenticated;
grant execute on function public.l2u_push_claim(integer,uuid),public.l2u_push_health() to service_role;
insert into public.l2u_schema_migrations(version) values(12);
commit;
