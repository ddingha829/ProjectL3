begin;
-- Invitation secrets and failed-attempt counters are never part of snapshots
-- or public table grants. Existing membership/read rules remain unchanged.
create table l2u_private.group_codes(
 group_id uuid primary key references public.l2u_groups(id) on delete cascade,
 code text not null unique check(code ~ '^[A-HJ-NP-Z2-9]{6}$'),
 expires_at timestamptz not null
);
create table l2u_private.code_attempts(
 user_id uuid not null references auth.users(id) on delete cascade,
 bucket text not null check(bucket in ('minute','day')),
 started_at timestamptz not null,
 attempts integer not null,
 primary key(user_id,bucket)
);
alter table l2u_private.group_codes enable row level security;
alter table l2u_private.code_attempts enable row level security;
revoke all on l2u_private.group_codes,l2u_private.code_attempts from public,anon,authenticated;

create function l2u_private.rotate_group_code(p_group uuid) returns void
language plpgsql security definer set search_path='' as $$
declare alphabet text:='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; value text; bytes bytea; i integer;
begin
 loop
  bytes:=extensions.gen_random_bytes(6);value:='';
  for i in 0..5 loop value:=value||substr(alphabet,1+(get_byte(bytes,i)%32),1);end loop;
  begin
   insert into l2u_private.group_codes(group_id,code,expires_at) values(p_group,value,now()+interval '7 days')
   on conflict(group_id) do update set code=excluded.code,expires_at=excluded.expires_at;
   exit;
  exception when unique_violation then null;
  end;
 end loop;
 update public.l2u_invites set revoked=true where group_id=p_group;
end $$;

create function l2u_private.group_code_on_create() returns trigger
language plpgsql security definer set search_path='' as $$
begin perform l2u_private.rotate_group_code(new.id);return new;end $$;
create trigger l2u_group_code_created after insert on public.l2u_groups
for each row execute function l2u_private.group_code_on_create();

create function l2u_private.group_code_on_removal() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if old.active and not new.active and new.user_id is distinct from auth.uid() then
  delete from l2u_private.group_codes where group_id=new.group_id;
 end if;
 return new;
end $$;
create trigger l2u_group_code_removed after update of active on public.l2u_members
for each row execute function l2u_private.group_code_on_removal();

create function public.l2u_invite_code(p_group uuid,p_rotate boolean default false) returns jsonb
language plpgsql security definer set search_path='' as $$
declare value l2u_private.group_codes;
begin
 if auth.uid() is null or not exists(select 1 from public.l2u_groups where id=p_group and owner_id=auth.uid() and not archived) then raise exception 'GROUP_OWNER_REQUIRED';end if;
 perform 1 from public.l2u_groups where id=p_group for update;
 select * into value from l2u_private.group_codes where group_id=p_group;
 if coalesce(p_rotate,false) or value.group_id is null or value.expires_at<=now() then
  perform l2u_private.rotate_group_code(p_group);
  select * into value from l2u_private.group_codes where group_id=p_group;
 end if;
 return jsonb_build_object('code',value.code,'expiresAt',value.expires_at);
end $$;

create function public.l2u_join_code(p_code text) returns jsonb
language plpgsql security definer set search_path='' as $$
declare actor uuid:=auth.uid();value text:=upper(btrim(coalesce(p_code,'')));gid uuid;cap integer;n integer;period text;
begin
 if actor is null then raise exception 'AUTH_REQUIRED';end if;
 perform pg_advisory_xact_lock(hashtextextended('l2u:join-code:'||actor::text,0));
 -- Return rejected attempts instead of raising: their counters must commit.
 foreach period in array array['minute','day'] loop
  insert into l2u_private.code_attempts(user_id,bucket,started_at,attempts) values(actor,period,now(),1)
  on conflict(user_id,bucket) do update set
   attempts=case when l2u_private.code_attempts.started_at+case when period='minute' then interval '1 minute' else interval '1 day' end<=now() then 1 else l2u_private.code_attempts.attempts+1 end,
   started_at=case when l2u_private.code_attempts.started_at+case when period='minute' then interval '1 minute' else interval '1 day' end<=now() then now() else l2u_private.code_attempts.started_at end
  returning attempts into n;
  if n>(case when period='minute' then 10 else 100 end) then return jsonb_build_object('error','INVITE_RATE_LIMITED');end if;
 end loop;
 if value !~ '^[A-HJ-NP-Z2-9]{6}$' then return jsonb_build_object('error','INVALID_INVITE');end if;
 select group_id into gid from l2u_private.group_codes where code=value and expires_at>now();
 if gid is null then return jsonb_build_object('error','INVALID_INVITE');end if;
 select capacity into cap from public.l2u_groups where id=gid and not archived for update;
 if cap is null or not exists(select 1 from l2u_private.group_codes where group_id=gid and code=value and expires_at>now()) then return jsonb_build_object('error','INVALID_INVITE');end if;
 if l2u_private.member(gid) then return jsonb_build_object('groupId',gid);end if;
 if (select count(*) from public.l2u_members where group_id=gid and active)>=cap then return jsonb_build_object('error','GROUP_FULL');end if;
 perform l2u_private.ensure_profile();
 insert into public.l2u_members(group_id,user_id) values(gid,actor) on conflict(group_id,user_id) do update set active=true,joined_at=now();
 return jsonb_build_object('groupId',gid);
end $$;
revoke all on function l2u_private.rotate_group_code(uuid),l2u_private.group_code_on_create(),l2u_private.group_code_on_removal() from public,anon,authenticated;
revoke all on function public.l2u_invite_code(uuid,boolean),public.l2u_join_code(text) from public,anon,authenticated;
grant execute on function public.l2u_invite_code(uuid,boolean),public.l2u_join_code(text) to authenticated;
insert into public.l2u_schema_migrations(version) values(5);
commit;
