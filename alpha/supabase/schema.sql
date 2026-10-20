-- L2. (ProjectL3) — Supabase Schema
-- Supabase Dashboard → SQL Editor → New query에 아래 전체 SQL을 붙여넣고 [Run]을 눌러주세요.
-- (기존 ProjectL2의 profiles 테이블과 충돌하지 않도록 l2_ 접두사를 사용합니다.)

create table if not exists public.l2_profiles (
  id                uuid primary key,                -- 기기 고유 ID (httpOnly 쿠키)
  recovery_code     text unique not null,            -- 기기 복원 코드 (L2-XXXX-XXXX)
  author_name       text not null default '',
  preset_slots      jsonb,
  skins             jsonb not null default '{}'::jsonb,
  default_preset_id text not null default '02',
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

-- 개인 기록은 Next.js 서버(service_role)에서만 접근합니다.
alter table public.l2_profiles enable row level security;
alter table public.l2_archives enable row level security;
alter table public.l2_ai_usage enable row level security;

drop policy if exists "l2_profiles_all" on public.l2_profiles;

drop policy if exists "l2_archives_all" on public.l2_archives;

drop policy if exists "l2_ai_usage_all" on public.l2_ai_usage;

revoke all on table public.l2_profiles, public.l2_archives, public.l2_ai_usage from anon, authenticated;
grant all on table public.l2_profiles, public.l2_archives, public.l2_ai_usage to service_role;
revoke execute on function public.bump_l2_ai_usage(uuid, text, date) from public, anon, authenticated;
grant execute on function public.bump_l2_ai_usage(uuid, text, date) to service_role;
alter function public.bump_l2_ai_usage(uuid, text, date) set search_path = public;

-- 사진 업로드용 Storage 버킷 생성 및 정책
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;

drop policy if exists "l2_photos_public_read" on storage.objects;
-- Public object URLs still work without allowing anonymous bucket listing.

drop policy if exists "l2_photos_server_write" on storage.objects;

drop policy if exists "l2_photos_server_delete" on storage.objects;
