-- ============================================================
-- Multiple boards.
--
-- Until now there was a single active board. Now the couple can keep
-- several active boards at once — one "primary" board that always shows
-- at /board, plus any number of additional named boards they can switch
-- between, edit, and later save as memories.
--
-- Safe to run on existing data.
-- ============================================================

alter table public.boards
  add column if not exists is_primary boolean not null default false;

-- Promote the oldest existing active board to be the primary one,
-- unless a primary already exists.
update public.boards set is_primary = true
where id = (
  select id from public.boards
  where status = 'active'
  order by created_at asc
  limit 1
)
and not exists (
  select 1 from public.boards where is_primary and status = 'active'
);

-- At most one primary board may exist at a time.
create unique index if not exists boards_one_primary
  on public.boards (is_primary) where is_primary;
