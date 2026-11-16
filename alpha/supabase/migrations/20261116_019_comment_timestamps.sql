begin;
-- Expose the timestamp already retained for every comment, without changing it.
do $patch$
declare definition text;
 old_json text:=$old$jsonb_build_object('id',c.id,'authorId',c.author_id,'body',c.body,'parentId',c.parent_id,'groupId',c.group_id)$old$;
 new_json text:=$new$jsonb_build_object('id',c.id,'authorId',c.author_id,'body',c.body,'parentId',c.parent_id,'groupId',c.group_id)||jsonb_build_object('createdAt',extract(epoch from c.created_at)*1000)$new$;
begin
 select pg_get_functiondef('public.l2u_snapshot()'::regprocedure) into definition;
 if position(new_json in definition)=0 then
  if position(old_json in definition)>0 then execute replace(definition,old_json,new_json);
  else raise exception 'UNEXPECTED_L2U_COMMENT_SNAPSHOT_BODY';end if;
 end if;
end $patch$;
insert into public.l2u_schema_migrations(version) values(19) on conflict(version) do nothing;
notify pgrst,'reload schema';
commit;
