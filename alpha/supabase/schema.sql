-- L2. (ProjectL3) — Supabase Schema
-- Supabase Dashboard → SQL Editor → New query에 아래 전체 SQL을 붙여넣고 [Run]을 눌러주세요.
-- (기존 ProjectL2의 profiles 테이블과 충돌하지 않도록 l2_ 접두사를 사용합니다.)

create table if not exists public.l2_profiles (
  id                uuid primary key,                -- 기기 고유 ID (httpOnly 쿠키)
  recovery_code     text unique not null,            -- 기기 복원 코드 (L2-XXXX-XXXX)
  author_name       text not null default '',
  preset_slots      jsonb,
  skins             jsonb not null default '{}'::jsonb,
  default_preset_id text not null default '01',
  created_at        timestamptz not null default now()
);

create table if not exists public.l2_archives (
  id         uuid primary key default gen_random_uuid(),  -- 기록/공유 고유 ID
  owner_id   uuid not null references public.l2_profiles(id) on delete cascade,
  data       jsonb not null,                               -- ArchiveItem JSON (좌표, 카드 디자인, 그룹 정보 포함)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists l2_archives_owner_created_idx
  on public.l2_archives (owner_id, created_at desc);

create table if not exists public.l2_ai_usage (
  owner_id uuid not null references public.l2_profiles(id) on delete cascade,
  kind     text not null,
  day      date not null,
  count    int  not null default 0,
  primary key (owner_id, kind, day)
);

-- 일일 AI 사용량 카운터 함수
create or replace function public.bump_l2_ai_usage(p_owner uuid, p_kind text, p_day date)
returns int language sql security definer as $$
  insert into public.l2_ai_usage (owner_id, kind, day, count)
  values (p_owner, p_kind, p_day, 1)
  on conflict (owner_id, kind, day) do update set count = public.l2_ai_usage.count + 1
  returning count;
$$;

-- RLS 활성화 및 서버 API 라우트(service_role 또는 anon key) 접근 정책
alter table public.l2_profiles enable row level security;
alter table public.l2_archives enable row level security;
alter table public.l2_ai_usage enable row level security;

drop policy if exists "l2_profiles_all" on public.l2_profiles;
create policy "l2_profiles_all" on public.l2_profiles for all using (true) with check (true);

drop policy if exists "l2_archives_all" on public.l2_archives;
create policy "l2_archives_all" on public.l2_archives for all using (true) with check (true);

drop policy if exists "l2_ai_usage_all" on public.l2_ai_usage;
create policy "l2_ai_usage_all" on public.l2_ai_usage for all using (true) with check (true);

-- 사진 업로드용 Storage 버킷 생성 및 정책
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "l2_photos_public_read" on storage.objects;
create policy "l2_photos_public_read" on storage.objects
  for select using (bucket_id = 'photos');

drop policy if exists "l2_photos_server_write" on storage.objects;
create policy "l2_photos_server_write" on storage.objects
  for insert with check (bucket_id = 'photos');

drop policy if exists "l2_photos_server_delete" on storage.objects;
create policy "l2_photos_server_delete" on storage.objects
  for delete using (bucket_id = 'photos');
