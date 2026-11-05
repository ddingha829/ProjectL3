begin;
alter table public.l2u_comments add column if not exists parent_id uuid references public.l2u_comments(id) on delete set null;
create index if not exists l2u_comments_parent on public.l2u_comments(parent_id) where parent_id is not null;
create or replace function l2u_private.check_comment_parent() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if new.parent_id is null then return new;end if;
 if new.parent_id=new.id or not exists(select 1 from public.l2u_comments p where p.id=new.parent_id and p.log_id=new.log_id) then raise exception 'COMMENT_PARENT_INVALID';end if;
 if exists(with recursive ancestors as (
  select c.id,c.parent_id from public.l2u_comments c where c.id=new.parent_id
  union select c.id,c.parent_id from public.l2u_comments c join ancestors a on c.id=a.parent_id
 ) select 1 from ancestors where id=new.id) then raise exception 'COMMENT_PARENT_INVALID';end if;
 return new;
end $$;
revoke all on function l2u_private.check_comment_parent() from public,anon,authenticated;
drop trigger if exists l2u_comment_parent on public.l2u_comments;
create trigger l2u_comment_parent before insert or update of parent_id,log_id on public.l2u_comments for each row execute function l2u_private.check_comment_parent();
-- Extend existing functions without replacing intervening share/video fixes or grants.
do $patch$
declare definition text;
 old_apply text:=$old$insert into public.l2u_comments(id,log_id,author_id,body) values((op->>'id')::uuid,lid,actor,trim(op->>'body'));$old$;
 new_apply text:=$new$insert into public.l2u_comments(id,log_id,author_id,body,parent_id) values((op->>'id')::uuid,lid,actor,trim(op->>'body'),nullif(op->>'parentId','')::uuid);$new$;
 old_snapshot text:=$old$jsonb_build_object('id',c.id,'authorId',c.author_id,'body',c.body)$old$;
 new_snapshot text:=$new$jsonb_build_object('id',c.id,'authorId',c.author_id,'body',c.body,'parentId',c.parent_id)$new$;
begin
 select pg_get_functiondef('public.l2u_apply(jsonb,uuid)'::regprocedure) into definition;
 if position(old_apply in definition)>0 then execute replace(definition,old_apply,new_apply);
 elsif position(new_apply in definition)=0 then raise exception 'UNEXPECTED_L2U_COMMENT_APPLY_BODY';end if;
 select pg_get_functiondef('public.l2u_snapshot()'::regprocedure) into definition;
 if position(old_snapshot in definition)>0 then execute replace(definition,old_snapshot,new_snapshot);
 elsif position(new_snapshot in definition)=0 then raise exception 'UNEXPECTED_L2U_COMMENT_SNAPSHOT_BODY';end if;
end $patch$;
insert into public.l2u_schema_migrations(version) values(14) on conflict(version) do nothing;
notify pgrst,'reload schema';
commit;
