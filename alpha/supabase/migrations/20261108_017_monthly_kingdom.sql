-- Monthly immutable keepsakes. No images/blobs are copied; only small metadata.
begin;
create table public.l2u_kingdom_months (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid references public.l2u_profiles(id) on delete cascade,
 group_id uuid references public.l2u_groups(id) on delete cascade,
 month text not null check(month ~ '^\d{4}-\d{2}$'),
 payload jsonb not null, sealed_at timestamptz not null default now(),
 check((owner_id is null) <> (group_id is null))
);
create unique index l2u_kingdom_personal_month on public.l2u_kingdom_months(owner_id,month) where owner_id is not null;
create unique index l2u_kingdom_group_month on public.l2u_kingdom_months(group_id,month) where group_id is not null;
alter table public.l2u_kingdom_months enable row level security;
revoke all on public.l2u_kingdom_months from public,anon,authenticated;
grant select on public.l2u_kingdom_months to authenticated;
grant all on public.l2u_kingdom_months to service_role;
create policy l2u_kingdom_read on public.l2u_kingdom_months for select to authenticated
 using(owner_id=auth.uid() or l2u_private.member(group_id));

-- Idempotent: even repeated scheduled runs never replace a sealed month.
create function l2u_private.seal_kingdom_month(p_now timestamptz default now()) returns integer
language plpgsql security definer set search_path='' as $$
declare start_at timestamptz; end_at timestamptz; month_key text; written integer;
begin
 end_at:=date_trunc('month',p_now at time zone 'Asia/Seoul') at time zone 'Asia/Seoul';
 start_at:=(date_trunc('month',p_now at time zone 'Asia/Seoul')-interval '1 month') at time zone 'Asia/Seoul';
 month_key:=to_char(start_at at time zone 'Asia/Seoul','YYYY-MM');
 with eligible as (
  select l.id,l.author_id,l.published_at as created_at,l.payload->'work' as work,
   l.payload->'work'->>'kind' as kind,l.payload->'work'->>'id' as work_id
  from public.l2u_logs l where l.published_at>=start_at and l.published_at<end_at
   and l.payload->'work'->>'kind' in ('movie','book','music')
   and nullif(l.payload->'work'->>'id','') is not null
 ), scoped as (
  select e.*,e.author_id as scope_id,true as personal from eligible e
  union all
  select e.*,s.group_id,false from eligible e join public.l2u_shares s on s.log_id=e.id
   join public.l2u_groups g on g.id=s.group_id where not g.archived and s.shared_at<end_at
 ), ranked as (
  select s.*,row_number() over(partition by personal,scope_id,author_id,kind,work_id order by created_at,id)=1 as earned from scoped s
 ), scopes as (
  select true as personal,id as scope_id from public.l2u_profiles where created_at<end_at
  union select false,id from public.l2u_groups where not archived and created_at<end_at
 ), members as (
  select s.personal,s.scope_id,case when s.personal then 1 else greatest(1,(select count(*)::int from public.l2u_members m where m.group_id=s.scope_id and m.active and m.joined_at<end_at)) end as n
  from scopes s
 ), assembled as (
  select s.personal,s.scope_id,jsonb_build_object('month',month_key,'members',s.n,
   'counts',jsonb_build_object('castle',count(*) filter(where r.earned),'movie',count(*) filter(where r.earned and r.kind='movie'),'book',count(*) filter(where r.earned and r.kind='book'),'music',count(*) filter(where r.earned and r.kind='music')),
   'records',coalesce(jsonb_agg(jsonb_build_object('id',r.id,'authorId',r.author_id,'kind',r.kind,'workId',r.work_id,'title',left(r.work->>'title',150),'image',case when r.work->>'image' ~ '^(https://|/)' then left(r.work->>'image',2000) else '' end,'createdAt',extract(epoch from r.created_at)*1000,'earned',r.earned) order by r.created_at desc,r.id desc) filter(where r.id is not null),'[]'::jsonb),
   'people',(select coalesce(jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'color',p.color)),'[]'::jsonb) from public.l2u_profiles p where p.id in(select x.author_id from ranked x where x.personal=s.personal and x.scope_id=s.scope_id) or (not s.personal and exists(select 1 from public.l2u_members m where m.group_id=s.scope_id and m.user_id=p.id and m.active and m.joined_at<end_at))),
   'sealedAt',end_at) as payload
  from members s left join ranked r on r.personal=s.personal and r.scope_id=s.scope_id group by s.personal,s.scope_id,s.n
 )
 insert into public.l2u_kingdom_months(owner_id,group_id,month,payload,sealed_at)
 select case when personal then scope_id end,case when not personal then scope_id end,month_key,payload,end_at from assembled
 on conflict do nothing;
 get diagnostics written=row_count;
 return written;
end $$;
revoke all on function l2u_private.seal_kingdom_month(timestamptz) from public,anon,authenticated;
grant execute on function l2u_private.seal_kingdom_month(timestamptz) to service_role;

create function public.l2u_kingdom_archive(p_group uuid default null) returns jsonb
language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'AUTH_REQUIRED';end if;
 if p_group is not null and not l2u_private.member(p_group) then raise exception 'GROUP_REQUIRED';end if;
 return (select jsonb_build_object('months',coalesce(jsonb_agg(t.payload order by t.month desc),'[]'::jsonb)) from
  (select month,payload from public.l2u_kingdom_months where (p_group is null and owner_id=auth.uid()) or (p_group is not null and group_id=p_group) order by month desc limit 120) t);
end $$;
revoke all on function public.l2u_kingdom_archive(uuid) from public,anon,authenticated;
grant execute on function public.l2u_kingdom_archive(uuid) to authenticated;
insert into public.l2u_schema_migrations(version) values(17);
commit;
