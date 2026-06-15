-- ============================================================
-- Live fixture notes.
--
-- A note pinned from the World Cup fixtures panel remembers which
-- fixture it represents, so the board can keep its scoreline live as
-- games are played. Safe on existing data.
-- ============================================================

alter table public.items
  add column if not exists fixture_id text;
