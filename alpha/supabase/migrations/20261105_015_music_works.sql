begin;
-- Existing JSON payloads, log ownership, sharing and notification rules remain intact.
do $patch$
declare definition text;
 categories text:=$old$('daily','dining','movie','book')$old$;
 kinds text:=$old$('movie','book')$old$;
 image_path text:=$old$'^/api/media/image[?]'$old$;
begin
 select pg_get_functiondef('public.l2u_apply(jsonb,uuid)'::regprocedure) into definition;
 if position(categories in definition)>0 and position(kinds in definition)>0 then
  definition:=replace(definition,categories,$new$('daily','dining','movie','book','music')$new$);
  definition:=replace(definition,kinds,$new$('movie','book','music')$new$);
  if position(image_path in definition)=0 then raise exception 'UNEXPECTED_MUSIC_IMAGE_GUARD';end if;
  definition:=replace(definition,image_path,$new$'^/api/(media/image|music/cover)[?]'$new$);
  execute definition;
 elsif position($new$('daily','dining','movie','book','music')$new$ in definition)=0 or position($new$('movie','book','music')$new$ in definition)=0 then raise exception 'UNEXPECTED_MUSIC_APPLY_BODY';end if;
end $patch$;
-- At most one upstream MusicBrainz call every 1.1 seconds across all instances.
create or replace function public.l2u_musicbrainz_slot() returns boolean
language plpgsql security definer set search_path='' as $$
declare granted boolean;
begin
 insert into l2u_private.api_usage(bucket,used,expires_at)
 values('musicbrainz:global-slot',1,clock_timestamp()+interval '1100 milliseconds')
 on conflict(bucket) do update set used=1,expires_at=excluded.expires_at
 where l2u_private.api_usage.expires_at<=clock_timestamp()
 returning true into granted;
 return coalesce(granted,false);
end $$;
revoke all on function public.l2u_musicbrainz_slot() from public,anon,authenticated;
grant execute on function public.l2u_musicbrainz_slot() to service_role;
insert into public.l2u_schema_migrations(version) values(15) on conflict(version) do nothing;
notify pgrst,'reload schema';
commit;
