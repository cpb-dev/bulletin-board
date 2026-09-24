-- ============================================================
-- A second theme per board (BB-3).
--
-- A board can carry one secondary theme alongside its main one.
-- Which of the two each person sees is remembered on their own
-- device, not here — this column only records which themes the
-- board has. Null means no secondary theme.
--
-- Additive and safe to run on existing data: every existing board,
-- active or archived, gets null and renders exactly as before.
-- ============================================================

alter table public.boards
  add column if not exists secondary_theme text;
