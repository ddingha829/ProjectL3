-- Apply in the SAME project's Supabase SQL Editor as an administrator.
-- The deployed app must have SUPABASE_SERVICE_ROLE_KEY (server-only).
-- This transaction removes public table access, not user data.
begin;

alter table public.l2_profiles enable row level security;
alter table public.l2_archives enable row level security;
alter table public.l2_ai_usage enable row level security;

drop policy if exists "l2_profiles_all" on public.l2_profiles;
drop policy if exists "l2_archives_all" on public.l2_archives;
drop policy if exists "l2_ai_usage_all" on public.l2_ai_usage;

revoke all on table public.l2_profiles, public.l2_archives, public.l2_ai_usage from anon, authenticated;
grant all on table public.l2_profiles, public.l2_archives, public.l2_ai_usage to service_role;

-- SECURITY DEFINER must not be callable using the browser's public key.
revoke execute on function public.bump_l2_ai_usage(uuid, text, date) from public, anon, authenticated;
grant execute on function public.bump_l2_ai_usage(uuid, text, date) to service_role;
alter function public.bump_l2_ai_usage(uuid, text, date) set search_path = public;

-- Existing public image URLs remain readable. Upload/delete are server-only.
drop policy if exists "l2_photos_public_read" on storage.objects;
drop policy if exists "l2_photos_server_write" on storage.objects;
drop policy if exists "l2_photos_server_delete" on storage.objects;

commit;

-- After applying: verify anonymous REST requests return 401/403, then test
-- logged-in create/edit/delete, image upload and AI quota through the app.
-- Photos remain in a public bucket; private/signed media needs a migration.
