-- Additive, opt-in notifications. No existing account/log/photo is deleted.
begin;
create table l2u_private.notification_preferences(
 user_id uuid primary key references auth.users(id) on delete cascade,
 new_logs boolean not null default false, nearby boolean not null default false,
 nearby_last_at timestamptz, lease_token uuid, lease_key text, lease_log uuid, lease_until timestamptz
);
create table l2u_private.push_subscriptions(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 endpoint text not null unique check(length(endpoint) between 30 and 4096),
 p256dh text not null check(length(p256dh) between 80 and 100),
 auth_key text not null check(length(auth_key) between 20 and 30),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index l2u_push_subscription_user on l2u_private.push_subscriptions(user_id);
create table l2u_private.nearby_seen(
 user_id uuid not null references auth.users(id) on delete cascade,
 place_key text not null, log_id uuid not null, delivered_at timestamptz not null default now(),
 primary key(user_id,place_key)
);
create table l2u_private.push_jobs(
 id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id) on delete cascade,
 log_id uuid not null references public.l2u_logs(id) on delete cascade,
 subscription_id uuid not null references l2u_private.push_subscriptions(id) on delete cascade,
 attempts integer not null default 0, available_at timestamptz not null default now(),
 lease_token uuid, lease_until timestamptz, finished_at timestamptz,
 created_at timestamptz not null default now(), unique(user_id,log_id,subscription_id)
);
create index l2u_push_jobs_pending on l2u_private.push_jobs(available_at) where finished_at is null;
create table l2u_private.push_runtime(
 singleton boolean primary key default true check(singleton),
 url text not null check(url='https://project-l3-nine.vercel.app/api/notifications/dispatch/'),
 secret text not null check(length(secret) between 40 and 200)
);
do $$declare t text;begin
 foreach t in array array['notification_preferences','push_subscriptions','nearby_seen','push_jobs','push_runtime'] loop
  execute format('alter table l2u_private.%I enable row level security',t);
  execute format('revoke all on l2u_private.%I from public,anon,authenticated',t);
 end loop;
end $$;

create function l2u_private.notification_group(p_user uuid,p_log uuid) returns uuid
language sql stable security definer set search_path='' as $$
 select s.group_id from public.l2u_shares s
 join public.l2u_members m on m.group_id=s.group_id and m.user_id=p_user and m.active
 join public.l2u_groups g on g.id=s.group_id and not g.archived
 where s.log_id=p_log order by s.group_id limit 1
$$;
create function l2u_private.notification_place_key(p jsonb) returns text
language plpgsql immutable set search_path='' as $$
declare place jsonb=p->'place'; lat numeric; lng numeric; pid text;
begin
 if jsonb_typeof(place)<>'object' or jsonb_typeof(place->'lat')<>'number' or jsonb_typeof(place->'lng')<>'number' then return null;end if;
 lat=(place->>'lat')::numeric;lng=(place->>'lng')::numeric;
 if lat not between -90 and 90 or lng not between -180 and 180 then return null;end if;
 pid=place->>'id';
 if pid like 'google:%' then return 'google:'||substr(pid,8);end if;
 return round(lat,4)::text||','||round(lng,4)::text||':'||lower(regexp_replace(coalesce(place->>'name',''),'\s+','','g'));
end $$;

create function public.l2u_notification_status() returns jsonb
language plpgsql security definer set search_path='' as $$
declare p l2u_private.notification_preferences; seen jsonb;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 insert into l2u_private.notification_preferences(user_id) values(auth.uid()) on conflict do nothing;
 select * into p from l2u_private.notification_preferences where user_id=auth.uid();
 select coalesce(jsonb_agg(l.id),'[]'::jsonb) into seen from public.l2u_logs l
 where l.author_id<>auth.uid() and l2u_private.notification_group(auth.uid(),l.id) is not null
 and exists(select 1 from l2u_private.nearby_seen s where s.user_id=auth.uid() and s.place_key=l2u_private.notification_place_key(l.payload));
 return jsonb_build_object('newLogs',p.new_logs,'nearby',p.nearby,'lastNearbyAt',case when p.nearby_last_at is null then null else extract(epoch from p.nearby_last_at)*1000 end,'seenLogIds',seen);
end $$;
create function public.l2u_notification_preferences(p_new_logs boolean,p_nearby boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_new_logs is null or p_nearby is null then raise exception 'INVALID_NOTIFICATION_PREFERENCES';end if;
 insert into l2u_private.notification_preferences(user_id,new_logs,nearby) values(auth.uid(),p_new_logs,p_nearby)
 on conflict(user_id) do update set new_logs=excluded.new_logs,nearby=excluded.nearby;
 if not p_nearby then update l2u_private.notification_preferences set lease_token=null,lease_key=null,lease_log=null,lease_until=null where user_id=auth.uid();end if;
end $$;
create function public.l2u_push_subscribe(p_subscription jsonb) returns void
language plpgsql security definer set search_path='' as $$
declare e text=p_subscription->>'endpoint'; k text=p_subscription#>>'{keys,p256dh}'; a text=p_subscription#>>'{keys,auth}'; old l2u_private.push_subscriptions;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if e is null or e !~ '^https://([a-z0-9-]+\.)*(push\.apple\.com|fcm\.googleapis\.com|push\.services\.mozilla\.com|notify\.windows\.com)/' or e ~ '[#@]' or
 k is null or k !~ '^[A-Za-z0-9_-]{80,100}={0,2}$' or a is null or a !~ '^[A-Za-z0-9_-]{20,30}={0,2}$' then raise exception 'INVALID_PUSH_SUBSCRIPTION';end if;
 select * into old from l2u_private.push_subscriptions where endpoint=e for update;
 if found and old.user_id<>auth.uid() and (old.p256dh<>k or old.auth_key<>a) then raise exception 'PUSH_ENDPOINT_OWNERSHIP';end if;
 if old.id is null and (select count(*) from l2u_private.push_subscriptions where user_id=auth.uid())>=5 then raise exception 'PUSH_DEVICE_LIMIT';end if;
 insert into l2u_private.push_subscriptions(user_id,endpoint,p256dh,auth_key) values(auth.uid(),e,k,a)
 on conflict(endpoint) do update set user_id=excluded.user_id,p256dh=excluded.p256dh,auth_key=excluded.auth_key,updated_at=now();
end $$;
create function public.l2u_push_unsubscribe(p_endpoint text) returns void
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 delete from l2u_private.push_subscriptions where user_id=auth.uid() and endpoint=p_endpoint;
end $$;

create function public.l2u_nearby_reserve(p_log uuid) returns jsonb
language plpgsql security definer set search_path='' as $$
declare p l2u_private.notification_preferences; l public.l2u_logs; gid uuid; key text; token uuid=gen_random_uuid(); author text; place text;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into p from l2u_private.notification_preferences where user_id=auth.uid() for update;
 if not found or not p.nearby or p.nearby_last_at>now()-interval '6 hours' or p.lease_until>now() then return null;end if;
 select * into l from public.l2u_logs where id=p_log and author_id<>auth.uid();
 if not found then return null;end if;
 gid=l2u_private.notification_group(auth.uid(),p_log);key=l2u_private.notification_place_key(l.payload);
 if gid is null or key is null or exists(select 1 from l2u_private.nearby_seen s where s.user_id=auth.uid() and s.place_key=key) then return null;end if;
 select name into author from public.l2u_profiles where id=l.author_id;
 place=left(coalesce(nullif(l.payload->>'locationLabel',''),nullif(l.payload#>>'{place,name}',''),'기록한 장소'),60);
 update l2u_private.notification_preferences set lease_token=token,lease_key=key,lease_log=p_log,lease_until=now()+interval '2 minutes' where user_id=auth.uid();
 return jsonb_build_object('token',token,'logId',p_log,'title',left(coalesce(author,'모임원'),30)||'님이 기록한 곳 근처예요','body',place||' 근처에 있어요. 가보시겠어요?','url','/?view=map&scope='||gid||'&focus='||p_log,'ownerId',auth.uid());
end $$;
create function public.l2u_nearby_complete(p_token uuid,p_delivered boolean) returns void
language plpgsql security definer set search_path='' as $$
declare p l2u_private.notification_preferences;
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 select * into p from l2u_private.notification_preferences where user_id=auth.uid() for update;
 if not found or p.lease_token is distinct from p_token or p.lease_until<now() then return;end if;
 if p_delivered and p.nearby then
  insert into l2u_private.nearby_seen(user_id,place_key,log_id) values(auth.uid(),p.lease_key,p.lease_log) on conflict do nothing;
  update l2u_private.notification_preferences set nearby_last_at=now() where user_id=auth.uid();
 end if;
 update l2u_private.notification_preferences set lease_token=null,lease_key=null,lease_log=null,lease_until=null where user_id=auth.uid();
end $$;

create function l2u_private.wake_push_worker() returns void
language plpgsql security definer set search_path='' as $$
declare c l2u_private.push_runtime;
begin
 if not exists(select 1 from l2u_private.push_jobs where finished_at is null and available_at<=now() and coalesce(lease_until,'-infinity'::timestamptz)<now()) then return;end if;
 select * into c from l2u_private.push_runtime where singleton;
 if not found or not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='net' and p.proname='http_post') then return;end if;
 execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 8000)'
 using c.url,'{}'::jsonb,jsonb_build_object('Content-Type','application/json','x-l2-push-secret',c.secret);
exception when others then
 -- Notification transport must never roll back the user's log registration.
 return;
end $$;
create function l2u_private.queue_log_push() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 insert into l2u_private.push_jobs(user_id,log_id,subscription_id)
 select m.user_id,new.log_id,s.id from public.l2u_members m
 join public.l2u_groups g on g.id=m.group_id and not g.archived
 join public.l2u_logs l on l.id=new.log_id and l.author_id<>m.user_id
 join l2u_private.notification_preferences p on p.user_id=m.user_id and p.new_logs
 join l2u_private.push_subscriptions s on s.user_id=m.user_id
 where m.group_id=new.group_id and m.active on conflict do nothing;
 perform l2u_private.wake_push_worker();return new;
end $$;
create trigger l2u_queue_log_push after insert on public.l2u_shares for each row execute function l2u_private.queue_log_push();

create function public.l2u_push_claim(p_limit integer default 20,p_author uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
declare j l2u_private.push_jobs; s l2u_private.push_subscriptions; l public.l2u_logs; gid uuid; author text; title text; result jsonb='[]'; token uuid;
begin
 for j in select q.* from l2u_private.push_jobs q join public.l2u_logs log on log.id=q.log_id
 where q.finished_at is null and q.available_at<=now() and coalesce(q.lease_until,'-infinity'::timestamptz)<now()
 and (p_author is null or log.author_id=p_author) order by q.created_at limit greatest(1,least(coalesce(p_limit,20),50)) for update of q skip locked loop
  gid=l2u_private.notification_group(j.user_id,j.log_id);
  if gid is null or j.attempts>=3 or j.created_at<now()-interval '24 hours' or not exists(select 1 from l2u_private.notification_preferences p where p.user_id=j.user_id and p.new_logs) then
   update l2u_private.push_jobs set finished_at=now() where id=j.id;continue;
  end if;
  select * into s from l2u_private.push_subscriptions where id=j.subscription_id;
  select * into l from public.l2u_logs where id=j.log_id;
  select name into author from public.l2u_profiles where id=l.author_id;
  title=left(coalesce(nullif(l.payload#>>'{work,title}',''),nullif(l.payload->>'title',''),nullif(l.payload#>>'{place,name}',''),'새로운 기록'),100);
  token=gen_random_uuid();
  update l2u_private.push_jobs set attempts=attempts+1,lease_token=token,lease_until=now()+interval '2 minutes' where id=j.id;
  result=result||jsonb_build_array(jsonb_build_object('id',j.id,'token',token,'subscription',jsonb_build_object('endpoint',s.endpoint,'keys',jsonb_build_object('p256dh',s.p256dh,'auth',s.auth_key)),'payload',jsonb_build_object('title',left(coalesce(author,'모임원'),30)||'님의 새 로그','body',title,'url','/?view=logs&scope='||gid||'&log='||l.id,'ownerId',j.user_id,'kind','new-log','id',j.id)));
 end loop;return result;
end $$;
create function public.l2u_push_finish(p_job uuid,p_token uuid,p_sent boolean,p_gone boolean default false) returns void
language plpgsql security definer set search_path='' as $$
declare j l2u_private.push_jobs;
begin
 select * into j from l2u_private.push_jobs where id=p_job and lease_token=p_token for update;
 if not found then return;end if;
 if p_gone then delete from l2u_private.push_subscriptions where id=j.subscription_id;return;end if;
 update l2u_private.push_jobs set finished_at=case when p_sent or attempts>=3 then now() else null end,
 available_at=now()+interval '5 minutes',lease_token=null,lease_until=null where id=j.id;
end $$;
create function public.l2u_push_configure(p_url text,p_secret text) returns void
language plpgsql security definer set search_path='' as $$
begin
 insert into l2u_private.push_runtime(singleton,url,secret) values(true,p_url,p_secret)
 on conflict(singleton) do update set url=excluded.url,secret=excluded.secret;
end $$;
create function public.l2u_push_wake() returns void
language sql security definer set search_path='' as $$select l2u_private.wake_push_worker()$$;
create function public.l2u_push_health() returns jsonb
language sql stable security definer set search_path='' as $$
 select jsonb_build_object('version',7,'webhook',exists(select 1 from l2u_private.push_runtime) and exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='net' and p.proname='http_post'))
$$;

revoke all on function l2u_private.notification_group(uuid,uuid),l2u_private.notification_place_key(jsonb),l2u_private.wake_push_worker(),l2u_private.queue_log_push() from public,anon,authenticated;
revoke all on function public.l2u_notification_status(),public.l2u_notification_preferences(boolean,boolean),public.l2u_push_subscribe(jsonb),public.l2u_push_unsubscribe(text),public.l2u_nearby_reserve(uuid),public.l2u_nearby_complete(uuid,boolean) from public,anon;
grant execute on function public.l2u_notification_status(),public.l2u_notification_preferences(boolean,boolean),public.l2u_push_subscribe(jsonb),public.l2u_push_unsubscribe(text),public.l2u_nearby_reserve(uuid),public.l2u_nearby_complete(uuid,boolean) to authenticated;
revoke all on function public.l2u_push_claim(integer,uuid),public.l2u_push_finish(uuid,uuid,boolean,boolean),public.l2u_push_configure(text,text),public.l2u_push_health(),public.l2u_push_wake() from public,anon,authenticated;
grant execute on function public.l2u_push_claim(integer,uuid),public.l2u_push_finish(uuid,uuid,boolean,boolean),public.l2u_push_configure(text,text),public.l2u_push_health(),public.l2u_push_wake() to service_role;
insert into public.l2u_schema_migrations(version) values(7);
commit;
