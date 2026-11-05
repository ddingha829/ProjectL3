begin;
alter table public.l2u_comments add column if not exists group_id uuid references public.l2u_groups(id) on delete cascade;
create index if not exists l2u_comments_scope on public.l2u_comments(log_id,group_id,created_at);
-- Preserve every old comment. Only a card with exactly one share has a reliable
-- historical group; ambiguous comments remain private to the card owner.
with single_share as (
 select log_id,(array_agg(group_id))[1] as group_id from public.l2u_shares group by log_id having count(*)=1
) update public.l2u_comments c set group_id=s.group_id from single_share s
where c.log_id=s.log_id and c.group_id is null
and not exists(select 1 from public.l2u_schema_migrations where version=16);

create or replace function l2u_private.read_comment(p_log uuid,p_group uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select case when p_group is null then exists(select 1 from public.l2u_logs l where l.id=p_log and l.author_id=auth.uid())
 else l2u_private.member(p_group) and exists(select 1 from public.l2u_shares s where s.log_id=p_log and s.group_id=p_group) end
$$;
revoke all on function l2u_private.read_comment(uuid,uuid) from public,anon;
grant execute on function l2u_private.read_comment(uuid,uuid) to authenticated;
drop policy if exists l2u_comment_read on public.l2u_comments;
create policy l2u_comment_read on public.l2u_comments for select to authenticated using(l2u_private.read_comment(log_id,group_id));

create or replace function l2u_private.check_comment_parent() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.parent_id is null then return new;end if;
 if new.parent_id=new.id or not exists(select 1 from public.l2u_comments p where p.id=new.parent_id and p.log_id=new.log_id and p.group_id is not distinct from new.group_id) then raise exception 'COMMENT_PARENT_INVALID';end if;
 if exists(with recursive ancestors as (
  select c.id,c.parent_id from public.l2u_comments c where c.id=new.parent_id
  union select c.id,c.parent_id from public.l2u_comments c join ancestors a on c.id=a.parent_id
 ) select 1 from ancestors where id=new.id) then raise exception 'COMMENT_PARENT_INVALID';end if;
 return new;
end $$;
drop trigger if exists l2u_comment_parent on public.l2u_comments;
create trigger l2u_comment_parent before insert or update of parent_id,log_id,group_id on public.l2u_comments for each row execute function l2u_private.check_comment_parent();

do $patch$
declare definition text;
 old_apply text:=$old$if not l2u_private.read_log(lid) then raise exception 'LOG_READ_REQUIRED'; end if;
   insert into public.l2u_comments(id,log_id,author_id,body,parent_id) values((op->>'id')::uuid,lid,actor,trim(op->>'body'),nullif(op->>'parentId','')::uuid);$old$;
 new_apply text:=$new$if not l2u_private.read_log(lid) then raise exception 'LOG_READ_REQUIRED'; end if;
   gid:=nullif(op->>'groupId','')::uuid;
   if not(op?'groupId') then
    if nullif(op->>'parentId','') is not null then
     select group_id into gid from public.l2u_comments where id=(op->>'parentId')::uuid and log_id=lid;
     if not found then raise exception 'COMMENT_PARENT_INVALID';end if;
    else
     select case when count(*)=1 then (array_agg(s.group_id))[1] else null end into gid
     from public.l2u_shares s where s.log_id=lid and l2u_private.member(s.group_id);
     if gid is null and not exists(select 1 from public.l2u_logs where id=lid and author_id=actor) then raise exception 'COMMENT_SCOPE_REQUIRED';end if;
    end if;
   end if;
   if not l2u_private.read_comment(lid,gid) then raise exception 'COMMENT_SCOPE_INVALID';end if;
   insert into public.l2u_comments(id,log_id,author_id,body,parent_id,group_id) values((op->>'id')::uuid,lid,actor,trim(op->>'body'),nullif(op->>'parentId','')::uuid,gid);$new$;
 old_json text:=$old$jsonb_build_object('id',c.id,'authorId',c.author_id,'body',c.body,'parentId',c.parent_id)$old$;
 new_json text:=$new$jsonb_build_object('id',c.id,'authorId',c.author_id,'body',c.body,'parentId',c.parent_id,'groupId',c.group_id)$new$;
 old_read text:=$old$from public.l2u_comments c where c.log_id=l.id$old$;
 new_read text:=$new$from public.l2u_comments c where c.log_id=l.id and l2u_private.read_comment(c.log_id,c.group_id)$new$;
begin
 select pg_get_functiondef('public.l2u_apply(jsonb,uuid)'::regprocedure) into definition;
 if position(old_apply in definition)>0 then execute replace(definition,old_apply,new_apply);
 elsif position(new_apply in definition)=0 then raise exception 'UNEXPECTED_SCOPED_COMMENT_APPLY';end if;
 select pg_get_functiondef('public.l2u_snapshot()'::regprocedure) into definition;
 if position(old_json in definition)>0 then
  if position(old_read in definition)=0 then raise exception 'UNEXPECTED_SCOPED_COMMENT_READ';end if;
  execute replace(replace(definition,old_json,new_json),old_read,new_read);
 elsif position(new_json in definition)=0 or position(new_read in definition)=0 then raise exception 'UNEXPECTED_SCOPED_COMMENT_SNAPSHOT';end if;
end $patch$;

create or replace function l2u_private.queue_comment_push() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid;
begin
 select author_id into recipient from public.l2u_logs where id=new.log_id;
 if recipient=new.author_id or new.group_id is null or not exists(
  select 1 from public.l2u_shares sh join public.l2u_groups g on g.id=sh.group_id
  join public.l2u_members author_member on author_member.group_id=g.id and author_member.user_id=new.author_id and author_member.active
  join public.l2u_members recipient_member on recipient_member.group_id=g.id and recipient_member.user_id=recipient and recipient_member.active
  where sh.log_id=new.log_id and sh.group_id=new.group_id and not g.archived
 ) then return new;end if;
 insert into l2u_private.push_jobs(user_id,log_id,subscription_id,kind,comment_id)
 select recipient,new.log_id,s.id,'comment',new.id from l2u_private.push_subscriptions s
 join l2u_private.notification_preferences p on p.user_id=s.user_id and p.new_logs
 where s.user_id=recipient on conflict do nothing;
 perform l2u_private.wake_push_worker();return new;
end $$;
do $patch$
declare definition text;
 old_check text:=$old$c.id is not null and l.id is not null and c.author_id<>j.user_id and l2u_private.notification_group(c.author_id,l.id) is not null$old$;
 new_check text:=$new$c.id is not null and l.id is not null and c.author_id<>j.user_id and c.group_id is not null and exists(select 1 from public.l2u_shares sh join public.l2u_groups g on g.id=sh.group_id join public.l2u_members a on a.group_id=g.id and a.user_id=c.author_id and a.active join public.l2u_members b on b.group_id=g.id and b.user_id=j.user_id and b.active where sh.log_id=l.id and sh.group_id=c.group_id and not g.archived)$new$;
 old_target text:=$old$target='/?view=logs&scope=mine&log='||l.id;$old$;
 new_target text:=$new$target='/?view=logs&scope='||c.group_id||'&log='||l.id;$new$;
begin
 select pg_get_functiondef('public.l2u_push_claim(integer,uuid)'::regprocedure) into definition;
 if position(old_check in definition)>0 and position(old_target in definition)>0 then execute replace(replace(definition,old_check,new_check),old_target,new_target);
 elsif position(new_check in definition)=0 or position(new_target in definition)=0 then raise exception 'UNEXPECTED_SCOPED_COMMENT_PUSH';end if;
end $patch$;
insert into public.l2u_schema_migrations(version) values(16) on conflict(version) do nothing;
notify pgrst,'reload schema';
commit;
