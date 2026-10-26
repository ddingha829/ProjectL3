begin;
-- Vercel instances share atomic quotas and public provider cache in Postgres.
-- No account, log, membership or uploaded-photo data is changed here.
create table l2u_private.api_usage(
 bucket text primary key check(length(bucket) between 1 and 240),
 used integer not null check(used>=0),
 expires_at timestamptz not null
);
create index l2u_api_usage_expiry on l2u_private.api_usage(expires_at);
create table l2u_private.api_cache(
 key text primary key check(length(key) between 1 and 240),
 value jsonb not null check(octet_length(value::text)<=300000),
 expires_at timestamptz not null
);
create index l2u_api_cache_expiry on l2u_private.api_cache(expires_at);
alter table l2u_private.api_usage enable row level security;
alter table l2u_private.api_cache enable row level security;
revoke all on l2u_private.api_usage,l2u_private.api_cache from public,anon,authenticated;

create function public.l2u_api_reserve(p_bucket text,p_limit integer,p_ttl_ms bigint) returns integer
language plpgsql security definer set search_path='' as $$
declare result integer;
begin
 if p_bucket is null or length(p_bucket) not between 1 and 240 or p_limit is null or p_limit not between 1 and 10000 or p_ttl_ms is null or p_ttl_ms not between 1 and 604800000 then raise exception 'INVALID_QUOTA_INPUT';end if;
 insert into l2u_private.api_usage(bucket,used,expires_at) values(p_bucket,1,now()+p_ttl_ms*interval '1 millisecond')
 on conflict(bucket) do update set
  used=case when l2u_private.api_usage.expires_at<=now() then 1 else l2u_private.api_usage.used+1 end,
  expires_at=case when l2u_private.api_usage.expires_at<=now() then excluded.expires_at else l2u_private.api_usage.expires_at end
 where l2u_private.api_usage.expires_at<=now() or l2u_private.api_usage.used<p_limit
 returning used into result;
 delete from l2u_private.api_usage where bucket in(select u.bucket from l2u_private.api_usage u where u.expires_at<=now() limit 50);
 return result;
end $$;
create function public.l2u_api_usage(p_bucket text) returns integer
language sql stable security definer set search_path='' as $$
 select coalesce((select used from l2u_private.api_usage where bucket=p_bucket and expires_at>now()),0)
$$;
create function public.l2u_api_cached(p_key text) returns jsonb
language sql stable security definer set search_path='' as $$
 select value from l2u_private.api_cache where key=p_key and expires_at>now()
$$;
create function public.l2u_api_cache_put(p_key text,p_value jsonb,p_ttl_ms bigint) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_key is null or length(p_key) not between 1 and 240 or p_value is null or p_ttl_ms is null or p_ttl_ms not between 1 and 604800000 then raise exception 'INVALID_CACHE_INPUT';end if;
 insert into l2u_private.api_cache(key,value,expires_at) values(p_key,p_value,now()+p_ttl_ms*interval '1 millisecond')
 on conflict(key) do update set value=excluded.value,expires_at=excluded.expires_at;
 delete from l2u_private.api_cache where key in(select c.key from l2u_private.api_cache c where c.expires_at<=now() limit 50);
end $$;

revoke all on function public.l2u_api_reserve(text,integer,bigint),public.l2u_api_usage(text),public.l2u_api_cached(text),public.l2u_api_cache_put(text,jsonb,bigint) from public,anon,authenticated;
grant execute on function public.l2u_api_reserve(text,integer,bigint),public.l2u_api_usage(text),public.l2u_api_cached(text),public.l2u_api_cache_put(text,jsonb,bigint) to service_role;
insert into public.l2u_schema_migrations(version) values(6);
commit;
