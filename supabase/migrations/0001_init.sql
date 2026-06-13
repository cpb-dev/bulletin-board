-- ============================================================
-- Bulletin Board for Two — initial schema
-- Run this in the Supabase SQL editor (or via supabase CLI).
--
-- IMPORTANT before running:
--   Replace the two placeholder emails in the `allowed_members`
--   insert near the bottom with your real emails. Only those
--   addresses will ever be able to create an account.
-- ============================================================

-- ---------- Tables ----------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default 'Sweetheart',
  created_at timestamptz not null default now()
);

create table public.boards (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Our board',
  theme text not null default 'cozy-cabin',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table public.items (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.boards (id) on delete cascade,
  kind text not null check (kind in ('note', 'photo')),
  content text not null default '',          -- note text, or photo caption
  photo_path text,                           -- storage path for kind = 'photo'
  paper text not null default 'butter',      -- paper colour key (see themes.ts)
  x double precision not null default 0,     -- normalized -1..1 across the board
  y double precision not null default 0,     -- normalized -1..1 up the board
  rotation double precision not null default 0, -- radians, small tilt
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index items_board_id_idx on public.items (board_id);
create index boards_status_idx on public.boards (status);

-- Only emails in this table may sign up. This is what keeps the
-- board private to the two of you.
create table public.allowed_members (
  email text primary key
);

-- ---------- Keep updated_at fresh ----------

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger items_touch_updated_at
  before update on public.items
  for each row execute function public.touch_updated_at();

-- ---------- Signup allowlist + auto profile ----------
-- Two separate triggers are required:
--   1. BEFORE INSERT — block non-guests (BEFORE so we can cancel the insert)
--   2. AFTER INSERT  — create profile (AFTER so the auth.users row exists
--                      for the FK constraint on profiles.id)

create or replace function public.check_allowed_member()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.allowed_members
    where lower(email) = lower(new.email)
  ) then
    raise exception 'This board is private — that email is not on the guest list.';
  end if;
  return new;
end $$;

create trigger on_auth_user_check_allowed
  before insert on auth.users
  for each row execute function public.check_allowed_member();

create or replace function public.create_profile_for_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(new.raw_user_meta_data ->> 'display_name', ''),
      split_part(new.email, '@', 1)
    )
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.create_profile_for_user();

-- ---------- Row Level Security ----------
-- Everything is shared between the two members, so policies are
-- simply "any signed-in member" (signup is already restricted).

alter table public.profiles enable row level security;
alter table public.boards enable row level security;
alter table public.items enable row level security;
alter table public.allowed_members enable row level security;

create policy "members read profiles"
  on public.profiles for select to authenticated using (true);
create policy "members update own profile"
  on public.profiles for update to authenticated
  using (auth.uid() = id) with check (auth.uid() = id);

create policy "members read boards"
  on public.boards for select to authenticated using (true);
create policy "members create boards"
  on public.boards for insert to authenticated with check (true);
create policy "members update boards"
  on public.boards for update to authenticated using (true) with check (true);
create policy "members delete boards"
  on public.boards for delete to authenticated using (true);

create policy "members read items"
  on public.items for select to authenticated using (true);
create policy "members create items"
  on public.items for insert to authenticated with check (true);
create policy "members update items"
  on public.items for update to authenticated using (true) with check (true);
create policy "members delete items"
  on public.items for delete to authenticated using (true);

-- allowed_members has no policies: nobody can read or change it
-- through the API. Manage it from the Supabase dashboard only.

-- ---------- Realtime ----------

alter publication supabase_realtime add table public.items;
alter publication supabase_realtime add table public.boards;

-- ---------- Storage: private photo bucket ----------

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false);

create policy "members read photos"
  on storage.objects for select to authenticated
  using (bucket_id = 'photos');
create policy "members upload photos"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'photos');
create policy "members delete photos"
  on storage.objects for delete to authenticated
  using (bucket_id = 'photos');

-- ---------- Guest list (EDIT THESE!) ----------

insert into public.allowed_members (email) values
  ('YOUR_EMAIL_HERE@example.com'),
  ('KALLIS_EMAIL_HERE@example.com');
