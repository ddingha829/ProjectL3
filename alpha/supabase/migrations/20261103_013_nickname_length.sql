begin;

-- Keep existing names, including long ones and automatically provisioned defaults.
-- Only a change to a different nickname is subject to the new six-character limit.
create or replace function l2u_private.validate_nickname_change() returns trigger
language plpgsql set search_path='' as $$
begin
 if normalize(btrim(new.name),NFC) is distinct from normalize(btrim(old.name),NFC)
    and char_length(normalize(btrim(new.name),NFC)) > 6 then
  raise exception '닉네임은 6자 이내로 입력해주세요.' using errcode='22001';
 end if;
 return new;
end $$;
revoke all on function l2u_private.validate_nickname_change() from public,anon,authenticated;
create trigger l2u_profile_nickname_length before update of name on public.l2u_profiles
 for each row execute function l2u_private.validate_nickname_change();

insert into public.l2u_schema_migrations(version) values(13);
commit;
