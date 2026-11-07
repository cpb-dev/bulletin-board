-- ============================================================
-- Theme status: live or under construction (BB-36).
--
-- One row per theme id. A theme is offered in the theme picker only
-- when its row says 'live'. A theme with no row, or a 'draft' row,
-- is under construction: hidden from the picker and reachable only
-- through dev mode's preview, which never saves it to a board.
--
-- So a brand-new theme is hidden by default. Its code can ship
-- before anyone runs SQL, and it's released from dev mode in the app
-- (which writes 'live' here). No migration per theme is needed,
-- though one can still insert a row if that's handier.
--
-- This only decides what the picker OFFERS. It never decides how a
-- board renders: a board (live or archived) whose theme is marked
-- draft still draws that theme exactly as before.
--
-- Read by every signed-in member. There are no write policies, on
-- purpose: only the /api/dev/themes route writes, with the service
-- role key, after checking the caller is in DEV_EMAILS.
--
-- Additive and safe to run on existing data: seeds every theme that
-- exists today as 'live', so the picker is unchanged.
-- ============================================================

create table if not exists public.theme_status (
  theme_id   text primary key,
  status     text not null default 'draft'
             check (status in ('live', 'draft')),
  updated_at timestamptz not null default now()
);

alter table public.theme_status enable row level security;

drop policy if exists "members read theme status" on public.theme_status;
create policy "members read theme status"
  on public.theme_status for select to authenticated using (true);

insert into public.theme_status (theme_id, status) values
  ('cozy-cabin', 'live'),
  ('peach-parfait', 'live'),
  ('midnight-picnic', 'live'),
  ('sage-meadow', 'live'),
  ('summer-house', 'live'),
  ('world-cup', 'live'),
  ('rose-picnic', 'live'),
  ('haunted-hollow', 'live'),
  ('beach-hut', 'live'),
  ('stars-hollow', 'live')
on conflict (theme_id) do nothing;
