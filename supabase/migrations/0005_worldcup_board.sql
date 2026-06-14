-- ============================================================
-- World Cup board (temporary, self-contained feature).
--
-- A `kind` distinguishes the special World Cup board from normal
-- boards so it never shows up in the boards switcher or as a
-- promotable/primary board. Safe to run on existing data.
-- ============================================================

alter table public.boards
  add column if not exists kind text not null default 'standard'
  check (kind in ('standard', 'worldcup'));

create index if not exists boards_kind_idx on public.boards (kind);
