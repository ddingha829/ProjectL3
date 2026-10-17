-- L2. — Supabase schema (per-device isolation, server-only access)
-- Run once in Supabase Dashboard → SQL Editor → New query → Run.

create table if not exists public.profiles (
  id            uuid primary key,                -- device id (httpOnly cookie)
  recovery_code text unique not null,            -- L2-XXXX-XXXX
  author_name   text not null default '',
  preset_slots  jsonb,
  skins         jsonb not null default '{}'::jsonb,
  default_preset_id text not null default '01',
  created_at    timestamptz not null default now()
);

-- Existing development schemas can adopt the preference without rewriting logs.
alter table public.profiles add column if not exists default_preset_id text not null default '01';

create table if not exists public.archives (
  id         uuid primary key default gen_random_uuid(),  -- unguessable share id
  owner_id   uuid not null references public.profiles(id) on delete cascade,
  data       jsonb not null,                               -- ArchiveItem
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists archives_owner_created_idx
  on public.archives (owner_id, created_at desc);

create table if not exists public.ai_usage (
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind     text not null,
  day      date not null,
  count    int  not null default 0,
  primary key (owner_id, kind, day)
);

-- Atomic per-day counter used for the 30/day AI limit.
create or replace function public.bump_ai_usage(p_owner uuid, p_kind text, p_day date)
returns int language sql as $$
  insert into public.ai_usage (owner_id, kind, day, count)
  values (p_owner, p_kind, p_day, 1)
  on conflict (owner_id, kind, day) do update set count = public.ai_usage.count + 1
  returning count;
$$;

-- Lock everything: RLS on with no policies = anon/authenticated keys get nothing.
-- The Next.js server uses the service_role key, which bypasses RLS.
alter table public.profiles enable row level security;
alter table public.archives enable row level security;
alter table public.ai_usage enable row level security;
revoke execute on function public.bump_ai_usage(uuid, text, date) from anon, authenticated;

-- Public photo bucket (read: anyone with the URL, write: server only).
insert into storage.buckets (id, name, public)
values ('photos', 'photos', true)
on conflict (id) do nothing;
