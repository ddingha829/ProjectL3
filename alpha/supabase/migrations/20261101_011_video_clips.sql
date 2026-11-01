begin;
create table public.l2u_video_jobs(id uuid primary key,owner_id uuid not null references auth.users(id) on delete cascade,path text not null unique,status text not null default 'pending',created_at timestamptz not null default now());
create table public.l2u_video_assets(path text primary key,owner_id uuid not null references auth.users(id) on delete cascade,poster_path text not null,bytes integer not null check(bytes between 1 and 450000),created_at timestamptz not null default now());
alter table public.l2u_video_jobs enable row level security;
alter table public.l2u_video_assets enable row level security;
revoke all on public.l2u_video_jobs,public.l2u_video_assets from anon,authenticated;
grant all on public.l2u_video_jobs,public.l2u_video_assets to service_role;
create index l2u_video_jobs_owner on public.l2u_video_jobs(owner_id,created_at);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
 ('l2u-video-uploads','l2u-video-uploads',false,52428800,array['video/mp4','video/quicktime','video/webm','video/3gpp','video/x-m4v','application/octet-stream']),
 ('l2u-videos','l2u-videos',false,450000,array['video/mp4']);
-- Signed upload tokens are issued by the authenticated, rate-limited API only.
create policy l2u_video_insert_guard on storage.objects as restrictive for insert to public with check(bucket_id not in ('l2u-video-uploads','l2u-videos'));
create policy l2u_video_update_guard on storage.objects as restrictive for update to public using(bucket_id not in ('l2u-video-uploads','l2u-videos')) with check(bucket_id not in ('l2u-video-uploads','l2u-videos'));
create function l2u_private.read_video(path text) returns boolean language sql stable security definer set search_path='' as $$select exists(select 1 from public.l2u_logs l where l.payload#>>'{video,path}'=$1 and l2u_private.read_log(l.id))$$;
grant execute on function l2u_private.read_video(text) to authenticated;
create policy l2u_video_read on storage.objects for select to authenticated using(bucket_id='l2u-videos' and ((storage.foldername(name))[1]=auth.uid()::text or l2u_private.read_video(name)));
create policy l2u_video_read_guard on storage.objects as restrictive for select to public using(case when bucket_id not in ('l2u-video-uploads','l2u-videos') then true when bucket_id='l2u-videos' and auth.uid() is not null then ((storage.foldername(name))[1]=auth.uid()::text or l2u_private.read_video(name)) else false end);
create policy l2u_video_delete_guard on storage.objects as restrictive for delete to public using(bucket_id not in ('l2u-video-uploads','l2u-videos'));
create function l2u_private.validate_video() returns trigger language plpgsql security definer set search_path='' as $$
declare asset public.l2u_video_assets;v jsonb=new.payload->'video';
begin
 if v is null then return new;end if;
 select * into asset from public.l2u_video_assets where path=v->>'path' and owner_id=new.author_id;
 if not found or v is distinct from jsonb_build_object('path',asset.path,'bytes',asset.bytes,'duration',2,'width',480,'height',768) then raise exception 'INVALID_VIDEO';end if;
 return new;
end $$;
create trigger l2u_validate_video before insert or update on public.l2u_logs for each row execute function l2u_private.validate_video();
revoke all on function l2u_private.validate_video() from public,anon,authenticated;
revoke all on function l2u_private.read_video(text) from public,anon;
create function public.l2u_video_garbage() returns jsonb language sql security definer set search_path='' as $$
 select coalesce(jsonb_agg(row),'[]'::jsonb) from (
  select jsonb_build_object('bucket','l2u-video-uploads','path',j.path,'job',j.id) row from public.l2u_video_jobs j where j.created_at<now()-interval '1 hour' and exists(select 1 from storage.objects o where o.bucket_id='l2u-video-uploads' and o.name=j.path)
  union all select jsonb_build_object('bucket','l2u-videos','path',v.path,'asset',v.path,'poster',case when not exists(select 1 from public.l2u_logs l where l.payload->>'imagePath'=v.poster_path) then v.poster_path else null end) from public.l2u_video_assets v where v.created_at<now()-interval '2 days' and not exists(select 1 from public.l2u_logs l where l.payload#>>'{video,path}'=v.path)
  limit 200
 ) candidates
$$;
revoke all on function public.l2u_video_garbage() from public,anon,authenticated;
grant execute on function public.l2u_video_garbage() to service_role;
create function public.l2u_video_prune_jobs() returns void language sql security definer set search_path='' as $$
 delete from public.l2u_video_jobs j where j.created_at<now()-interval '7 days' and not exists(select 1 from storage.objects o where o.bucket_id='l2u-video-uploads' and o.name=j.path)
$$;
revoke all on function public.l2u_video_prune_jobs() from public,anon,authenticated;
grant execute on function public.l2u_video_prune_jobs() to service_role;
create function l2u_private.cleanup_video_uploads() returns void language plpgsql security definer set search_path='' as $$
declare c l2u_private.push_runtime;
begin
 select * into c from l2u_private.push_runtime where singleton;
 if not found or not exists(select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='net' and p.proname='http_post') then return;end if;
 execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 8000)' using regexp_replace(c.url,'/api/notifications/dispatch/?$','/api/video/cleanup'),'{}'::jsonb,jsonb_build_object('Content-Type','application/json','x-l2-push-secret',c.secret);
end $$;
revoke all on function l2u_private.cleanup_video_uploads() from public,anon,authenticated;
do $$begin
 if exists(select 1 from pg_namespace where nspname='cron') then perform cron.schedule('l2u-video-cleanup','37 * * * *','select l2u_private.cleanup_video_uploads()');end if;
end $$;
insert into public.l2u_schema_migrations(version) values(11);
commit;
