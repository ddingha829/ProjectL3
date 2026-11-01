-- Upload time is distinct from the record's editable/client-supplied date.
begin;
alter table public.l2u_logs add column published_at timestamptz;
-- First-revision updated_at is the original server insertion time. For older
-- edited records, preserve the earliest existing registration timestamp.
update public.l2u_logs set published_at=case when revision=1 then least(updated_at,now()) else least(created_at,updated_at,now()) end;
alter table public.l2u_logs alter column published_at set default now();
alter table public.l2u_logs alter column published_at set not null;
create function l2u_private.keep_publication_time() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if tg_op='INSERT' then new.published_at=clock_timestamp();else new.published_at=old.published_at;end if;
 return new;
end $$;
create trigger l2u_publication_time before insert or update on public.l2u_logs for each row execute function l2u_private.keep_publication_time();
create function l2u_private.check_share_window() returns trigger
language plpgsql security definer set search_path='' as $$
declare published timestamptz;
begin
 -- l2u_apply re-inserts retained destinations with ON CONFLICT DO NOTHING.
 -- Keeping or removing an existing share remains legal after the deadline.
 if exists(select 1 from public.l2u_shares s where s.log_id=new.log_id and s.group_id=new.group_id) then return new;end if;
 select published_at into published from public.l2u_logs where id=new.log_id for share;
 if published is null or clock_timestamp()>=published+interval '48 hours' then raise exception 'SHARE_WINDOW_EXPIRED';end if;
 return new;
end $$;
create trigger l2u_share_window before insert on public.l2u_shares for each row execute function l2u_private.check_share_window();

-- Sharing sends only IDs and a revision, without resending the card or image.
create function public.l2u_share_to_groups(p_log uuid,p_groups uuid[],p_expected integer,p_operation uuid) returns void
language plpgsql security definer set search_path='' as $$
declare actor uuid=auth.uid(); current_log public.l2u_logs; gid uuid;
begin
 if actor is null then raise exception 'AUTH_REQUIRED';end if;
 if p_operation is null or p_groups is null or cardinality(p_groups)>100 or array_position(p_groups,null) is not null then raise exception 'INVALID_GROUPS';end if;
 insert into public.l2u_operations(user_id,operation_id) values(actor,p_operation) on conflict do nothing;
 if not found then return;end if;
 select * into current_log from public.l2u_logs where id=p_log for update;
 if not found or current_log.author_id<>actor then raise exception 'LOG_OWNER_REQUIRED';end if;
 if current_log.revision is distinct from p_expected then raise exception 'STALE_VERSION';end if;
 foreach gid in array p_groups loop
  if not l2u_private.member(gid) and not exists(select 1 from public.l2u_shares s where s.log_id=p_log and s.group_id=gid) then raise exception 'GROUP_MEMBER_REQUIRED';end if;
  insert into public.l2u_shares(log_id,group_id) values(p_log,gid) on conflict do nothing;
 end loop;
 delete from public.l2u_shares s where s.log_id=p_log and not(s.group_id=any(p_groups));
 delete from public.l2u_mosaic m where m.log_id=p_log and m.group_id is not null and not exists(select 1 from public.l2u_shares s where s.log_id=p_log and s.group_id=m.group_id);
 update public.l2u_logs set revision=revision+1,updated_at=now() where id=p_log;
end $$;
revoke all on function public.l2u_share_to_groups(uuid,uuid[],integer,uuid) from public,anon;
grant execute on function public.l2u_share_to_groups(uuid,uuid[],integer,uuid) to authenticated;

-- Preserve the existing snapshot authorization/body while adding trusted time.
do $patch$
declare definition text; needle text='''serverRevision'',l.revision'; replacement text='''serverPublishedAt'',(extract(epoch from l.published_at)*1000)::bigint,''serverRevision'',l.revision';
begin
 select pg_get_functiondef('public.l2u_snapshot()'::regprocedure) into definition;
 if position(needle in definition)=0 then raise exception 'UNEXPECTED_SNAPSHOT_BODY';end if;
 execute replace(definition,needle,replacement);
end $patch$;
revoke all on function l2u_private.keep_publication_time(),l2u_private.check_share_window() from public,anon,authenticated;
insert into public.l2u_schema_migrations(version) values(10);
commit;
