-- Additive L2 unified alpha schema. Existing L2 and Ticgle objects are untouched.
-- Apply only after the isolated migration/authorization tests pass.
begin;
create schema if not exists l2u_private;
revoke all on schema l2u_private from public, anon;
grant usage on schema l2u_private to authenticated;

create table public.l2u_profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 name text not null check(char_length(name) between 1 and 30),
 color text not null default '#df653f' check(color ~ '^#[0-9a-fA-F]{6}$'),
 created_at timestamptz not null default now()
);
create table public.l2u_groups (
 id uuid primary key, owner_id uuid not null references public.l2u_profiles(id),
 name text not null check(char_length(name) between 2 and 30),
 capacity integer not null default 8 check(capacity between 1 and 20),
 archived boolean not null default false, revision integer not null default 1,
 created_at timestamptz not null default now()
);
create table public.l2u_members (
 group_id uuid not null references public.l2u_groups(id) on delete cascade,
 user_id uuid not null references public.l2u_profiles(id) on delete cascade,
 active boolean not null default true, joined_at timestamptz not null default now(),
 primary key(group_id,user_id)
);
create index l2u_members_user on public.l2u_members(user_id,group_id) where active;
create table public.l2u_logs (
 id uuid primary key, author_id uuid not null references public.l2u_profiles(id),
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=50000),
 revision integer not null default 1,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index l2u_logs_author on public.l2u_logs(author_id,created_at desc);
create table public.l2u_shares (
 log_id uuid not null references public.l2u_logs(id) on delete cascade,
 group_id uuid not null references public.l2u_groups(id) on delete cascade,
 shared_at timestamptz not null default now(), primary key(log_id,group_id)
);
create index l2u_shares_group on public.l2u_shares(group_id,log_id);
create table public.l2u_reactions (
 log_id uuid not null references public.l2u_logs(id) on delete cascade,
 user_id uuid not null references public.l2u_profiles(id) on delete cascade,
 kind text not null check(kind in ('like','bookmark')),
 primary key(log_id,user_id,kind)
);
create table public.l2u_comments (
 id uuid primary key, log_id uuid not null references public.l2u_logs(id) on delete cascade,
 author_id uuid not null references public.l2u_profiles(id),
 body text not null check(char_length(body) between 1 and 200), created_at timestamptz not null default now()
);
create table public.l2u_preferences (
 user_id uuid primary key references public.l2u_profiles(id) on delete cascade,
 payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=400000),
 revision integer not null default 1
);
create table public.l2u_mosaic (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid references public.l2u_profiles(id) on delete cascade,
 group_id uuid references public.l2u_groups(id) on delete cascade,
 log_id uuid not null references public.l2u_logs(id) on delete cascade,
 placed_by uuid not null references public.l2u_profiles(id),
 slot_index integer not null check(slot_index between 0 and 499), placed_at timestamptz not null default now(),
 check((owner_id is null) <> (group_id is null))
);
create unique index l2u_mosaic_personal_slot on public.l2u_mosaic(owner_id,slot_index) where owner_id is not null;
create unique index l2u_mosaic_personal_log on public.l2u_mosaic(owner_id,log_id) where owner_id is not null;
create unique index l2u_mosaic_group_slot on public.l2u_mosaic(group_id,slot_index) where group_id is not null;
create unique index l2u_mosaic_group_log on public.l2u_mosaic(group_id,log_id) where group_id is not null;
create table public.l2u_invites (
 id uuid primary key default gen_random_uuid(), group_id uuid not null references public.l2u_groups(id) on delete cascade,
 token_hash text not null unique, expires_at timestamptz not null,
 revoked boolean not null default false, created_by uuid not null references public.l2u_profiles(id)
);
create table public.l2u_operations (
 user_id uuid not null references public.l2u_profiles(id) on delete cascade,
 operation_id uuid not null, created_at timestamptz not null default now(), primary key(user_id,operation_id)
);
create table public.l2u_schema_migrations(version integer primary key,applied_at timestamptz not null default now());

create function l2u_private.member(p_group uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.l2u_members m join public.l2u_groups g on g.id=m.group_id where m.group_id=p_group and m.user_id=auth.uid() and m.active and not g.archived)
$$;
create function l2u_private.read_log(p_log uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.l2u_logs l where l.id=p_log and (l.author_id=auth.uid() or exists(select 1 from public.l2u_shares s where s.log_id=l.id and l2u_private.member(s.group_id))))
$$;
create function l2u_private.ensure_profile() returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED'; end if;
 insert into public.l2u_profiles(id,name) select u.id,left(coalesce(nullif(u.raw_user_meta_data->>'display_name',''),split_part(u.email,'@',1),'사용자'),30) from auth.users u where u.id=auth.uid() on conflict(id) do nothing;
end $$;

-- Read-only table API; every write goes through the checked transaction below.
do $$ declare t text; begin
 foreach t in array array['profiles','groups','members','logs','shares','reactions','comments','preferences','mosaic','invites','operations','schema_migrations'] loop
  execute format('alter table public.%I enable row level security','l2u_'||t);
  execute format('revoke all on public.%I from public,anon,authenticated','l2u_'||t);
  execute format('grant select on public.%I to authenticated','l2u_'||t);
  execute format('grant all on public.%I to service_role','l2u_'||t);
 end loop;
end $$;
create policy l2u_profile_read on public.l2u_profiles for select to authenticated using(id=auth.uid() or exists(select 1 from public.l2u_members m where m.user_id=id and m.active and l2u_private.member(m.group_id)) or exists(select 1 from public.l2u_logs l where l.author_id=id and l2u_private.read_log(l.id)));
create policy l2u_group_read on public.l2u_groups for select to authenticated using(l2u_private.member(id));
create policy l2u_member_read on public.l2u_members for select to authenticated using(l2u_private.member(group_id));
create policy l2u_log_read on public.l2u_logs for select to authenticated using(l2u_private.read_log(id));
create policy l2u_share_read on public.l2u_shares for select to authenticated using(l2u_private.member(group_id) or exists(select 1 from public.l2u_logs l where l.id=log_id and l.author_id=auth.uid()));
create policy l2u_reaction_read on public.l2u_reactions for select to authenticated using(l2u_private.read_log(log_id) and (kind='like' or user_id=auth.uid()));
create policy l2u_comment_read on public.l2u_comments for select to authenticated using(l2u_private.read_log(log_id));
create policy l2u_preference_read on public.l2u_preferences for select to authenticated using(user_id=auth.uid());
create policy l2u_mosaic_read on public.l2u_mosaic for select to authenticated using((owner_id=auth.uid() or l2u_private.member(group_id)) and l2u_private.read_log(log_id));
create policy l2u_operation_read on public.l2u_operations for select to authenticated using(user_id=auth.uid());
create policy l2u_version_read on public.l2u_schema_migrations for select to authenticated using(true);

create function public.l2u_snapshot() returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 perform l2u_private.ensure_profile();
 select jsonb_build_object(
 'version',1,'actorId',auth.uid(),
 'people',coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'color',p.color)) from public.l2u_profiles p where p.id=auth.uid() or exists(select 1 from public.l2u_members m where m.user_id=p.id and m.active and l2u_private.member(m.group_id)) or exists(select 1 from public.l2u_logs l where l.author_id=p.id and l2u_private.read_log(l.id))), '[]'::jsonb),
 'circles',coalesce((select jsonb_agg(jsonb_build_object('id',g.id,'name',g.name,'capacity',g.capacity,'ownerId',g.owner_id,'revision',g.revision,'members',(select jsonb_agg(m.user_id) from public.l2u_members m where m.group_id=g.id and m.active))) from public.l2u_groups g where l2u_private.member(g.id)), '[]'::jsonb),
 'logs',coalesce((select jsonb_agg(l.payload || jsonb_build_object('id',l.id,'authorId',l.author_id,'serverRevision',l.revision,'circleIds',coalesce((select jsonb_agg(s.group_id) from public.l2u_shares s where s.log_id=l.id and (l.author_id=auth.uid() or l2u_private.member(s.group_id))),'[]'::jsonb),'likes',coalesce((select jsonb_agg(r.user_id) from public.l2u_reactions r where r.log_id=l.id and r.kind='like'),'[]'::jsonb),'bookmarks',coalesce((select jsonb_agg(r.user_id) from public.l2u_reactions r where r.log_id=l.id and r.kind='bookmark' and r.user_id=auth.uid()),'[]'::jsonb),'comments',coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'authorId',c.author_id,'body',c.body) order by c.created_at) from public.l2u_comments c where c.log_id=l.id),'[]'::jsonb))) from (select * from public.l2u_logs ll where l2u_private.read_log(ll.id) order by ll.created_at desc limit 300) l),'[]'::jsonb),
 'preferences',(select jsonb_build_object('payload',p.payload,'revision',p.revision) from public.l2u_preferences p where p.user_id=auth.uid()),
 'placements',coalesce((select jsonb_agg(jsonb_build_object('logId',m.log_id,'scope',m.group_id,'slotIndex',m.slot_index,'placedBy',m.placed_by,'placedAt',extract(epoch from m.placed_at)*1000)) from public.l2u_mosaic m where (m.owner_id=auth.uid() or l2u_private.member(m.group_id)) and l2u_private.read_log(m.log_id) and (m.owner_id=auth.uid() or exists(select 1 from public.l2u_shares s where s.log_id=m.log_id and s.group_id=m.group_id))),'[]'::jsonb)
 ) into result;
 return result;
end $$;

create function public.l2u_apply(p_operations jsonb,p_operation_id uuid) returns void language plpgsql security definer set search_path='' as $$
declare
 actor uuid:=auth.uid(); op jsonb; kind text; lid uuid; gid uuid; target_user uuid;
 current_log public.l2u_logs%rowtype; current_group public.l2u_groups%rowtype;
 data jsonb; ids uuid[]; expected integer; actual integer; target integer; old_slot integer; other_log uuid;
begin
 perform l2u_private.ensure_profile();
 if p_operation_id is null or jsonb_typeof(p_operations) is distinct from 'array' or jsonb_array_length(p_operations)>100 or octet_length(p_operations::text)>700000 then raise exception 'INVALID_OPERATIONS'; end if;
 perform pg_advisory_xact_lock(hashtextextended(actor::text,0));
 if exists(select 1 from public.l2u_operations o where o.user_id=actor and o.operation_id=p_operation_id) then return; end if;
 for op in select value from jsonb_array_elements(p_operations) loop
  kind:=op->>'kind';
  if kind='profile' then
   update public.l2u_profiles set name=left(trim(op->>'name'),30) where id=actor;
  elsif kind='group' then
   gid:=(op->>'id')::uuid;
   select * into current_group from public.l2u_groups where id=gid for update;
   if found then
    if current_group.owner_id<>actor or not l2u_private.member(gid) then raise exception 'GROUP_OWNER_REQUIRED'; end if;
    if current_group.revision<>coalesce((op->>'expected')::integer,0) then raise exception 'STALE_VERSION'; end if;
    if (op->>'capacity')::integer<(select count(*) from public.l2u_members where group_id=gid and active) then raise exception 'GROUP_CAPACITY'; end if;
    update public.l2u_groups set name=op->>'name',capacity=(op->>'capacity')::integer,revision=revision+1 where id=gid;
   else
    if (op->>'expected')::integer<>0 then raise exception 'STALE_VERSION'; end if;
    insert into public.l2u_groups(id,owner_id,name,capacity) values(gid,actor,op->>'name',(op->>'capacity')::integer);
    insert into public.l2u_members(group_id,user_id) values(gid,actor);
   end if;
  elsif kind='log' then
   lid:=(op->>'id')::uuid; data:=op->'payload';
   if jsonb_typeof(data) is distinct from 'object' or octet_length(data::text)>50000 or jsonb_typeof(data->'title') is distinct from 'string' or char_length(data->>'title')>150 or jsonb_typeof(data->'body') is distinct from 'string' or char_length(data->>'body')>12000 or coalesce(data->>'category','') not in ('daily','dining','movie','book') or coalesce(data->>'image','') ~ '^(data:|blob:)' then raise exception 'INVALID_LOG'; end if;
   if coalesce(data->>'image','')<>'' and (data->>'image') !~ '^https://' and (data->>'image') !~ '^/api/media/image[?]' then raise exception 'INVALID_IMAGE'; end if;
   if coalesce(data->>'imagePath','')<>'' and (data->>'imagePath') not like actor::text||'/%' then raise exception 'IMAGE_OWNER_REQUIRED'; end if;
   data:=data-array['id','authorId','circleId','circleIds','serverRevision','likes','bookmarks','comments'];
   select * into current_log from public.l2u_logs where id=lid for update;
   if found then
    if current_log.author_id<>actor then raise exception 'LOG_OWNER_REQUIRED'; end if;
    if current_log.revision<>coalesce((op->>'expected')::integer,0) then raise exception 'STALE_VERSION'; end if;
    update public.l2u_logs set payload=data,revision=revision+1,updated_at=now() where id=lid;
   else
    if coalesce((op->>'expected')::integer,0)<>0 then raise exception 'STALE_VERSION'; end if;
    insert into public.l2u_logs(id,author_id,payload,created_at) values(lid,actor,data,to_timestamp(coalesce((data->>'createdAt')::numeric,extract(epoch from now())*1000)/1000));
   end if;
   select coalesce(array_agg(value::uuid),'{}'::uuid[]) into ids from jsonb_array_elements_text(coalesce(op->'groups','[]'::jsonb));
   if array_length(ids,1)>100 then raise exception 'INVALID_GROUPS'; end if;
   foreach gid in array ids loop
    if not l2u_private.member(gid) and not exists(select 1 from public.l2u_shares s where s.log_id=lid and s.group_id=gid) then raise exception 'GROUP_MEMBER_REQUIRED'; end if;
    insert into public.l2u_shares(log_id,group_id) values(lid,gid) on conflict do nothing;
   end loop;
   delete from public.l2u_shares s where s.log_id=lid and not(s.group_id=any(ids));
   delete from public.l2u_mosaic m where m.log_id=lid and m.group_id is not null and not exists(select 1 from public.l2u_shares s where s.log_id=lid and s.group_id=m.group_id);
   if coalesce(data#>>'{work,kind}','') not in ('movie','book') or coalesce(data#>>'{work,id}','')='' then delete from public.l2u_mosaic where log_id=lid; end if;
  elsif kind='delete_log' then
   lid:=(op->>'id')::uuid;
   select * into current_log from public.l2u_logs where id=lid for update;
   if not found or current_log.author_id<>actor then raise exception 'LOG_OWNER_REQUIRED'; end if;
   if current_log.revision<>coalesce((op->>'expected')::integer,0) then raise exception 'STALE_VERSION'; end if;
   delete from public.l2u_logs where id=lid;
  elsif kind='reaction' then
   lid:=(op->>'id')::uuid;
   if not l2u_private.read_log(lid) or op->>'type' not in ('like','bookmark') then raise exception 'LOG_READ_REQUIRED'; end if;
   if (op->>'active')::boolean then insert into public.l2u_reactions(log_id,user_id,kind) values(lid,actor,op->>'type') on conflict do nothing;
   else delete from public.l2u_reactions where log_id=lid and user_id=actor and kind=op->>'type'; end if;
  elsif kind='comment' then
   lid:=(op->>'logId')::uuid;
   if not l2u_private.read_log(lid) then raise exception 'LOG_READ_REQUIRED'; end if;
   insert into public.l2u_comments(id,log_id,author_id,body) values((op->>'id')::uuid,lid,actor,trim(op->>'body'));
  elsif kind='preferences' then
   select revision into actual from public.l2u_preferences where user_id=actor for update;
   if coalesce(actual,0)<>coalesce((op->>'expected')::integer,0) then raise exception 'STALE_VERSION'; end if;
   insert into public.l2u_preferences(user_id,payload) values(actor,op->'payload') on conflict(user_id) do update set payload=excluded.payload,revision=public.l2u_preferences.revision+1;
  elsif kind='place' then
   lid:=(op->>'id')::uuid; gid:=nullif(op->>'groupId','')::uuid; target:=(op->>'slot')::integer;
   if target is null or target<0 or target>499 then raise exception 'INVALID_SLOT'; end if;
   perform pg_advisory_xact_lock(hashtextextended('board:'||coalesce(gid::text,actor::text),0));
   select * into current_log from public.l2u_logs where id=lid;
   if not found or current_log.author_id<>actor or coalesce(current_log.payload#>>'{work,kind}','') not in ('movie','book') or coalesce(current_log.payload#>>'{work,id}','')='' then raise exception 'WORK_OWNER_REQUIRED'; end if;
   if gid is not null and (not l2u_private.member(gid) or not exists(select 1 from public.l2u_shares where log_id=lid and group_id=gid)) then raise exception 'GROUP_MEMBER_REQUIRED'; end if;
   old_slot:=null; other_log:=null;
   select slot_index into old_slot from public.l2u_mosaic m where m.log_id=lid and ((gid is null and m.owner_id=actor) or m.group_id=gid);
   select log_id into other_log from public.l2u_mosaic m where m.slot_index=target and ((gid is null and m.owner_id=actor) or m.group_id=gid);
   if other_log=lid then continue; end if;
   if other_log is not null and (gid is not null or old_slot is null) then raise exception 'SLOT_TAKEN'; end if;
   delete from public.l2u_mosaic m where ((gid is null and m.owner_id=actor) or m.group_id=gid) and (m.log_id=lid or m.log_id=other_log);
   insert into public.l2u_mosaic(owner_id,group_id,log_id,placed_by,slot_index) values(case when gid is null then actor end,gid,lid,actor,target);
   if other_log is not null then insert into public.l2u_mosaic(owner_id,log_id,placed_by,slot_index) values(actor,other_log,actor,old_slot); end if;
  elsif kind='unplace' then
   lid:=(op->>'id')::uuid; gid:=nullif(op->>'groupId','')::uuid;
   if not exists(select 1 from public.l2u_logs where id=lid and author_id=actor) or (gid is not null and not l2u_private.member(gid)) then raise exception 'WORK_OWNER_REQUIRED'; end if;
   perform pg_advisory_xact_lock(hashtextextended('board:'||coalesce(gid::text,actor::text),0));
   delete from public.l2u_mosaic m where m.log_id=lid and ((gid is null and m.owner_id=actor) or m.group_id=gid);
  elsif kind='remove_member' then
   gid:=(op->>'groupId')::uuid; target_user:=(op->>'userId')::uuid;
   select * into current_group from public.l2u_groups where id=gid for update;
   if not l2u_private.member(gid) or (target_user<>actor and current_group.owner_id<>actor) then raise exception 'GROUP_OWNER_REQUIRED'; end if;
   if target_user=current_group.owner_id and (select count(*) from public.l2u_members where group_id=gid and active)>1 then raise exception 'OWNER_TRANSFER_REQUIRED'; end if;
   update public.l2u_members set active=false where group_id=gid and user_id=target_user;
   if target_user<>actor then update public.l2u_invites set revoked=true where group_id=gid; end if;
   if target_user=current_group.owner_id then update public.l2u_groups set archived=true where id=gid; end if;
   if not coalesce((op->>'keepShares')::boolean,false) then
    delete from public.l2u_shares s using public.l2u_logs l where s.log_id=l.id and s.group_id=gid and l.author_id=target_user;
    delete from public.l2u_mosaic m using public.l2u_logs l where m.log_id=l.id and m.group_id=gid and l.author_id=target_user;
   end if;
  else raise exception 'UNKNOWN_OPERATION';
  end if;
 end loop;
 insert into public.l2u_operations(user_id,operation_id) values(actor,p_operation_id);
end $$;

create function public.l2u_create_invite(p_group uuid) returns text language plpgsql security definer set search_path='' as $$
declare token text:=encode(extensions.gen_random_bytes(24),'hex');
begin
 if auth.uid() is null or not exists(select 1 from public.l2u_groups where id=p_group and owner_id=auth.uid() and not archived) then raise exception 'GROUP_OWNER_REQUIRED'; end if;
 perform 1 from public.l2u_groups where id=p_group for update;
 update public.l2u_invites set revoked=true where group_id=p_group;
 insert into public.l2u_invites(group_id,token_hash,expires_at,created_by) values(p_group,encode(extensions.digest(token,'sha256'),'hex'),now()+interval '7 days',auth.uid());
 return token;
end $$;
create function public.l2u_join(p_token text) returns uuid language plpgsql security definer set search_path='' as $$
declare gid uuid; cap integer;
begin
 perform l2u_private.ensure_profile();
 if p_token !~ '^[0-9a-f]{48}$' then raise exception 'INVALID_INVITE'; end if;
 select group_id into gid from public.l2u_invites where token_hash=encode(extensions.digest(p_token,'sha256'),'hex') and not revoked and expires_at>now();
 if gid is null then raise exception 'INVALID_INVITE'; end if;
 select capacity into cap from public.l2u_groups where id=gid and not archived for update;
 if cap is null then raise exception 'INVALID_INVITE'; end if;
 if l2u_private.member(gid) then return gid; end if;
 if (select count(*) from public.l2u_members where group_id=gid and active)>=cap then raise exception 'GROUP_FULL'; end if;
 insert into public.l2u_members(group_id,user_id) values(gid,auth.uid()) on conflict(group_id,user_id) do update set active=true,joined_at=now();
 return gid;
end $$;

-- Private uploaded photos. Existing public buckets and their policies are unchanged.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('l2u-photos','l2u-photos',false,307200,array['image/webp']);
create policy l2u_photo_insert on storage.objects for insert to authenticated with check(bucket_id='l2u-photos' and (storage.foldername(name))[1]=auth.uid()::text and lower(storage.extension(name))='webp');
-- An old Ticgle policy permits INSERT into every bucket. A restrictive policy
-- constrains only this new bucket without altering the old application's rules.
create policy l2u_photo_insert_guard on storage.objects as restrictive for insert to authenticated with check(bucket_id<>'l2u-photos' or ((storage.foldername(name))[1]=auth.uid()::text and lower(storage.extension(name))='webp'));
create policy l2u_photo_read on storage.objects for select to authenticated using(bucket_id='l2u-photos' and ((storage.foldername(name))[1]=auth.uid()::text or exists(select 1 from public.l2u_logs l where l.payload->>'imagePath'=name and l2u_private.read_log(l.id))));
create policy l2u_photo_delete on storage.objects for delete to authenticated using(bucket_id='l2u-photos' and (storage.foldername(name))[1]=auth.uid()::text);

revoke all on all functions in schema l2u_private from public,anon,authenticated;
grant execute on function l2u_private.member(uuid),l2u_private.read_log(uuid) to authenticated;
revoke all on function public.l2u_snapshot(),public.l2u_apply(jsonb,uuid),public.l2u_create_invite(uuid),public.l2u_join(text) from public,anon,authenticated;
grant execute on function public.l2u_snapshot(),public.l2u_apply(jsonb,uuid),public.l2u_create_invite(uuid),public.l2u_join(text) to authenticated;
insert into public.l2u_schema_migrations(version) values(1);
commit;
