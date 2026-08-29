-- =========================================================
-- GIT GROUP — Supabase schema
-- Multi-tenant school pickup verification system
-- Run this in: Supabase Dashboard → SQL Editor → New query
-- =========================================================

-- ---------------------------------------------------------
-- 1. SCHOOLS
-- One row per school. Created by whoever signs up first.
-- ---------------------------------------------------------
create table if not exists public.schools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- ---------------------------------------------------------
-- 2. ROLES (per school, extensible — not hardcoded)
-- Seeded with common titles, but a school owner can add more
-- (e.g. "Deputy Head", "Front Desk") later from the app.
-- 'creator' is reserved — only Frank Ssemakula's account uses it.
-- ---------------------------------------------------------
create table if not exists public.roles (
  id uuid primary key default gen_random_uuid(),
  school_id uuid references public.schools(id) on delete cascade, -- null = global/system role
  name text not null,
  is_owner_role boolean not null default false,
  created_at timestamptz not null default now(),
  unique (school_id, name)
);

-- Global reserved role for you, the creator/super-admin
insert into public.roles (school_id, name, is_owner_role)
values (null, 'creator', false)
on conflict do nothing;

-- ---------------------------------------------------------
-- 3. PROFILES
-- Extends Supabase's built-in auth.users with app-specific data.
-- One row per user account, linked 1:1 to auth.users.
-- ---------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  school_id uuid references public.schools(id) on delete cascade,
  full_name text not null,
  role_id uuid references public.roles(id),
  is_creator boolean not null default false, -- true ONLY for your account
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------
-- 4. CHILDREN (the roster)
-- ---------------------------------------------------------
create table if not exists public.children (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  full_name text not null,
  class_or_grade text,
  photo_url text,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- ---------------------------------------------------------
-- 5. GUARDIANS (enrolled faces)
-- ---------------------------------------------------------
create table if not exists public.guardians (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  full_name text not null,
  relationship text, -- e.g. "Mother", "Uncle", "Driver"
  phone text,
  photo_url text not null,
  face_descriptor jsonb, -- store the face-api.js embedding for matching
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

-- ---------------------------------------------------------
-- 6. GUARDIAN <-> CHILD (many-to-many: a guardian can pick up
-- multiple children, a child can have multiple guardians)
-- ---------------------------------------------------------
create table if not exists public.guardian_child (
  guardian_id uuid not null references public.guardians(id) on delete cascade,
  child_id uuid not null references public.children(id) on delete cascade,
  primary key (guardian_id, child_id)
);

-- ---------------------------------------------------------
-- 7. SCAN LOGS (every gate scan, matched or not)
-- ---------------------------------------------------------
create table if not exists public.scan_logs (
  id uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  scanned_by uuid references auth.users(id), -- which guard performed the scan
  matched_guardian_id uuid references public.guardians(id),
  matched_child_id uuid references public.children(id),
  confidence numeric(5,2),
  captured_photo_url text,
  status text not null check (status in ('verified', 'not_on_file')),
  created_at timestamptz not null default now()
);

-- =========================================================
-- ROW LEVEL SECURITY
-- Everyone only sees their own school's data — EXCEPT the
-- creator account, which sees everything (for troubleshooting).
-- =========================================================

alter table public.schools enable row level security;
alter table public.roles enable row level security;
alter table public.profiles enable row level security;
alter table public.children enable row level security;
alter table public.guardians enable row level security;
alter table public.guardian_child enable row level security;
alter table public.scan_logs enable row level security;

-- Helper: is the current user the creator?
create or replace function public.is_creator()
returns boolean
language sql
security definer
stable
as $$
  select coalesce((select is_creator from public.profiles where id = auth.uid()), false);
$$;

-- Helper: what school does the current user belong to?
create or replace function public.my_school_id()
returns uuid
language sql
security definer
stable
as $$
  select school_id from public.profiles where id = auth.uid();
$$;

-- --- Policies (same pattern repeated per table) ---

create policy "school-scoped read: schools" on public.schools
  for select using (is_creator() or id = my_school_id());

create policy "school-scoped read: roles" on public.roles
  for select using (is_creator() or school_id is null or school_id = my_school_id());

create policy "school-scoped read: profiles" on public.profiles
  for select using (is_creator() or school_id = my_school_id());

create policy "school-scoped read: children" on public.children
  for select using (is_creator() or school_id = my_school_id());

create policy "school-scoped write: children" on public.children
  for insert with check (school_id = my_school_id());
create policy "school-scoped update: children" on public.children
  for update using (is_creator() or school_id = my_school_id());

create policy "school-scoped read: guardians" on public.guardians
  for select using (is_creator() or school_id = my_school_id());
create policy "school-scoped write: guardians" on public.guardians
  for insert with check (school_id = my_school_id());
create policy "school-scoped update: guardians" on public.guardians
  for update using (is_creator() or school_id = my_school_id());

create policy "school-scoped read: guardian_child" on public.guardian_child
  for select using (
    is_creator() or exists (
      select 1 from public.children c
      where c.id = guardian_child.child_id and c.school_id = my_school_id()
    )
  );
create policy "school-scoped write: guardian_child" on public.guardian_child
  for insert with check (
    exists (
      select 1 from public.children c
      where c.id = guardian_child.child_id and c.school_id = my_school_id()
    )
  );

create policy "school-scoped read: scan_logs" on public.scan_logs
  for select using (is_creator() or school_id = my_school_id());
create policy "school-scoped write: scan_logs" on public.scan_logs
  for insert with check (school_id = my_school_id());

-- =========================================================
-- SIGNUP FLOW
-- When someone signs up and creates a NEW school, they should
-- automatically become that school's "owner". Handle this in
-- your app code right after supabase.auth.signUp(), like:
--
--   1. const { data: auth } = await supabase.auth.signUp({ email, password })
--   2. const { data: school } = await supabase.from('schools')
--        .insert({ name: schoolName, created_by: auth.user.id }).select().single()
--   3. const { data: ownerRole } = await supabase.from('roles')
--        .insert({ school_id: school.id, name: 'owner', is_owner_role: true })
--        .select().single()
--   4. await supabase.from('profiles').insert({
--        id: auth.user.id, school_id: school.id,
--        full_name: fullName, role_id: ownerRole.id
--      })
--
-- The owner then invites admins / security guards / head of
-- security by creating more roles + profiles under the same
-- school_id.
-- =========================================================

-- =========================================================
-- STORAGE (run in Dashboard → Storage, or via SQL below)
-- Buckets for guardian photos, child photos, and gate captures.
-- =========================================================
insert into storage.buckets (id, name, public)
values
  ('guardian-photos', 'guardian-photos', false),
  ('child-photos', 'child-photos', false),
  ('scan-captures', 'scan-captures', false),
  ('school-logos', 'school-logos', true) -- logos can be public
on conflict (id) do nothing;

-- Storage policies: users can only read files from their own school's folder
-- (structure your upload paths like: {school_id}/{filename})
create policy "school-scoped storage read: guardian-photos"
  on storage.objects for select
  using (
    bucket_id = 'guardian-photos' and
    (public.is_creator() or (storage.foldername(name))[1] = public.my_school_id()::text)
  );

create policy "school-scoped storage insert: guardian-photos"
  on storage.objects for insert
  with check (
    bucket_id = 'guardian-photos' and
    (storage.foldername(name))[1] = public.my_school_id()::text
  );

-- Repeat the same two policies for 'child-photos' and 'scan-captures'
create policy "school-scoped storage read: child-photos"
  on storage.objects for select
  using (
    bucket_id = 'child-photos' and
    (public.is_creator() or (storage.foldername(name))[1] = public.my_school_id()::text)
  );
create policy "school-scoped storage insert: child-photos"
  on storage.objects for insert
  with check (
    bucket_id = 'child-photos' and
    (storage.foldername(name))[1] = public.my_school_id()::text
  );

create policy "school-scoped storage read: scan-captures"
  on storage.objects for select
  using (
    bucket_id = 'scan-captures' and
    (public.is_creator() or (storage.foldername(name))[1] = public.my_school_id()::text)
  );
create policy "school-scoped storage insert: scan-captures"
  on storage.objects for insert
  with check (
    bucket_id = 'scan-captures' and
    (storage.foldername(name))[1] = public.my_school_id()::text
  );

-- Logos are public read (anyone can view a school's logo on the login screen)
create policy "public read: school-logos"
  on storage.objects for select
  using (bucket_id = 'school-logos');
create policy "school-scoped storage insert: school-logos"
  on storage.objects for insert
  with check (
    bucket_id = 'school-logos' and
    (storage.foldername(name))[1] = public.my_school_id()::text
  );
