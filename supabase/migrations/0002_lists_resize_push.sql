-- ============================================================
-- Bulletin Board for Two — v2 additions
--   * resizable items            (items.scale)
--   * lists (separate to boards) (lists, list_items)
--   * phone notifications        (push_subscriptions)
-- Safe to run on top of 0001_init.sql. Idempotent where practical.
-- ============================================================

-- ---------- Resizable notes & photos ----------

alter table public.items
  add column if not exists scale double precision not null default 1;

-- ---------- Lists ----------
-- Lists are deliberately separate from boards: their own page, their
-- own archive, never part of the board "memories".

create table if not exists public.lists (
  id uuid primary key default gen_random_uuid(),
  title text not null default 'Our list',
  status text not null default 'active' check (status in ('active', 'archived')),
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  archived_at timestamptz
);

create table if not exists public.list_items (
  id uuid primary key default gen_random_uuid(),
  list_id uuid not null references public.lists (id) on delete cascade,
  content text not null default '',
  done boolean not null default false,
  position integer not null default 0,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists list_items_list_id_idx on public.list_items (list_id);
create index if not exists lists_status_idx on public.lists (status);

drop trigger if exists list_items_touch_updated_at on public.list_items;
create trigger list_items_touch_updated_at
  before update on public.list_items
  for each row execute function public.touch_updated_at();

-- ---------- Push notification subscriptions ----------
-- One row per browser/device a member has granted notifications on.

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_idx
  on public.push_subscriptions (user_id);

-- ---------- Row Level Security ----------

alter table public.lists enable row level security;
alter table public.list_items enable row level security;
alter table public.push_subscriptions enable row level security;

-- Lists & list items are shared between the two members, like boards.
drop policy if exists "members read lists" on public.lists;
create policy "members read lists"
  on public.lists for select to authenticated using (true);
drop policy if exists "members write lists" on public.lists;
create policy "members write lists"
  on public.lists for all to authenticated using (true) with check (true);

drop policy if exists "members read list items" on public.list_items;
create policy "members read list items"
  on public.list_items for select to authenticated using (true);
drop policy if exists "members write list items" on public.list_items;
create policy "members write list items"
  on public.list_items for all to authenticated using (true) with check (true);

-- Push subscriptions are private to the device owner. The notify edge
-- function reads them with the service-role key, which bypasses RLS.
drop policy if exists "members manage own subscriptions" on public.push_subscriptions;
create policy "members manage own subscriptions"
  on public.push_subscriptions for all to authenticated
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Realtime ----------

alter publication supabase_realtime add table public.lists;
alter publication supabase_realtime add table public.list_items;

-- ============================================================
-- Notifications also need one thing set up outside this file:
--   * Create Database Webhooks (Database -> Webhooks) that POST to
--     https://YOUR-APP.vercel.app/api/notify on INSERT into
--     public.items and public.list_items, with header
--     x-notify-secret: <your NOTIFY_WEBHOOK_SECRET>.
-- All doable from a phone. See docs/NOTIFICATIONS.md.
-- ============================================================
