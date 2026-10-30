begin;
-- Keep the existing function's privileges and body, qualifying only the
-- reaction row's columns to distinguish them from PL/pgSQL local variables.
do $repair$
declare
 definition text;
 old_statement constant text := 'delete from public.l2u_reactions where log_id=lid and user_id=actor and kind=op->>''type''';
 new_statement constant text := 'delete from public.l2u_reactions as reaction where reaction.log_id=lid and reaction.user_id=actor and reaction.kind=op->>''type''';
begin
 select pg_get_functiondef('public.l2u_apply(jsonb,uuid)'::regprocedure) into definition;
 if position(old_statement in definition)>0 then
  execute replace(definition,old_statement,new_statement);
 elsif position(new_statement in definition)=0 then
  raise exception 'UNEXPECTED_L2U_APPLY_REACTION_BODY';
 end if;
end
$repair$;
insert into public.l2u_schema_migrations(version) values(8) on conflict(version) do nothing;
commit;
