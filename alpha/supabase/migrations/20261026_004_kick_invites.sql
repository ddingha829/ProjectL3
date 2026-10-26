-- A removed member must not reuse an old group invitation to regain access.
begin;
create or replace function public.l2u_apply(p_operations jsonb,p_operation_id uuid) returns void language plpgsql security definer set search_path='' as $$
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
insert into public.l2u_schema_migrations(version) values(4);
commit;
