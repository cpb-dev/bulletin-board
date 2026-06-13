-- ============================================================
-- Populate created_by automatically.
--
-- Until now inserts never set created_by, so it was always NULL. That
-- caused two bugs:
--   * the notify route couldn't exclude the author -> you got pinged
--     for your own notes
--   * notes had no author for the new "posted by" stamp
--
-- Defaulting the column to auth.uid() means every insert from a signed-in
-- member is stamped with their id automatically, with no app changes.
-- ============================================================

alter table public.items       alter column created_by set default auth.uid();
alter table public.list_items  alter column created_by set default auth.uid();
alter table public.lists       alter column created_by set default auth.uid();
alter table public.boards      alter column created_by set default auth.uid();

-- Existing rows keep their NULL author (we can't know who made them);
-- everything created from now on is attributed correctly.
