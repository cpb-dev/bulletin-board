-- ============================================================
-- Note shapes (BB-24).
--
-- A note's silhouette (square, heart, circle, cloud, star, torn
-- page) is now chosen separately from its paper colour, which stays
-- in `paper`.
--
-- Additive and safe to run on existing data: every existing note,
-- on active and archived boards alike, gets null. The app resolves
-- a null shape exactly as notes have always rendered — `paper =
-- 'heart'` is a heart, everything else is a square — so existing
-- heart notes stay hearts and nothing changes on screen.
--
-- No check constraint on purpose: the app falls back to the legacy
-- shape for any value it doesn't know, so a shape added (or removed)
-- later can never stop a saved board from rendering.
-- ============================================================

alter table public.items
  add column if not exists shape text;
