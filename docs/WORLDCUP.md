# World Cup board ⚽ (temporary feature)

A separate, football-themed board for the FIFA World Cup, kept
deliberately apart from everything else so it can be removed cleanly
afterwards.

## What it does

- A **⚽ button** appears in the top bar during the tournament and takes
  you to `/worldcup`.
- The board uses an exclusive **World Cup theme** (pitch green & gold)
  that is *not* offered in the normal theme picker and can't be applied
  to other boards.
- The board stands on a **football pitch in a stadium** (`StadiumScene`):
  an animated, **tappable crowd** (touch anyone to set off a Mexican wave
  around the stands), **England** and **South Africa** flags fluttering
  beside the board, floodlights, and little **footballs** along the top of
  the board in place of fairy lights.
- A **fixtures panel** (the `⚽ fixtures` button, bottom-left) lists all
  fixtures and results, grouped by stage, refreshed from a live API.
- Each fixture has a **📌 pin** that drops it onto the board as a normal
  movable note — so you can decorate the games you watched with your own
  notes and photos. **Pinned fixtures stay live**: their scoreline
  updates automatically as games are played (the board re-polls the API
  every minute and fixture-linked notes redraw themselves).
- **Auto-retires:** two days after the final, the board moves itself
  into Memories and the ⚽ button disappears. The dates live in
  `src/lib/worldcup.ts` (`WORLD_CUP`).

It's self-contained: the board is a row with `kind = 'worldcup'`
(migration `0005`), excluded from the boards switcher and never
promotable/primary. Removing the feature later is just deleting the
`/worldcup` route, the ⚽ button, and the fixtures files.

## Live fixtures & results (free API)

Out of the box the board shows a small built-in fallback schedule. For
the **full live fixtures and results**, connect the (free)
[football-data.org](https://www.football-data.org/) API:

1. Register at football-data.org → get your **free API token**.
2. In **Vercel → Settings → Environment Variables**, add:
   - `FOOTBALL_DATA_TOKEN` = your token
   - (optional) `FOOTBALL_DATA_COMPETITION` = `WC` (the default)
3. Redeploy.

The token is only ever used server-side in `/api/worldcup/fixtures`
(never sent to the browser), and responses are cached for 5 minutes to
stay within the free tier. If the token is missing or the API hiccups,
the board falls back to the built-in schedule so it never breaks.

> Other providers (e.g. TheSportsDB, API-Football) can be slotted in by
> adding another branch in `src/app/api/worldcup/fixtures/route.ts` and a
> matching normaliser in `src/lib/worldcup.ts` — the rest of the app only
> sees the normalised `Fixture` shape.

## Setup

Run migrations
[`0005_worldcup_board.sql`](../supabase/migrations/0005_worldcup_board.sql)
and [`0006_fixture_notes.sql`](../supabase/migrations/0006_fixture_notes.sql)
once in the Supabase SQL editor (they add the `kind` column and the
`fixture_id` column for live-scoring notes; safe on existing data). The
board itself is created automatically the first time you open
`/worldcup`.
