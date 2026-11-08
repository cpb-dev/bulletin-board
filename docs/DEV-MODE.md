# Dev mode

Look at any theme on a real board, on any device, without changing the
board, and decide which themes the picker offers. Built for making themes
(BB-36).

## Turning it on

1. Run `supabase/migrations/0010_theme_status.sql` in the Supabase SQL
   editor. It's needed for themes under construction (below), and it seeds
   every existing theme as live, so the picker doesn't change.
2. In Vercel (Production and Preview), set `DEV_EMAILS` to the email you
   sign in with. Separate several with commas. It's server-only: never
   prefix it `NEXT_PUBLIC_`. Setting a theme live or under construction
   also needs `SUPABASE_SERVICE_ROLE_KEY`, which notifications already
   use.
3. Redeploy and open a board. The theme picker (🎨) now has a
   **🛠️ Dev** section at the bottom.

Unset `DEV_EMAILS` to turn dev mode off for everyone. Locally, put it in
`.env.local`.

## Previewing

Previews are **on this device only, and never saved**. The other person
keeps seeing the board as it is, and archived boards aren't touched.

- **Preview a theme.** Tap any theme in the Dev section to see the board
  in it. Tap it again, or **exit** on the banner, to go back.
- **Time of day.** Force day, evening or night to check a theme's
  day/night cycle (BB-21). "Clock" goes back to the real time. A theme
  with no cycle stays in daylight, and a two-phase theme has no evening,
  just as it would live.
- **Sample notes.** Pin one note of every shape and paper, like
  `/dev/scene?notes=1`. This is the way to check how notes look in a
  theme. Taps go straight through them.

**A preview shows the theme as a fresh board.** While anything is
previewed, your board's own notes and photos aren't drawn, so they don't
sit over the preview or the sample notes. They're only hidden: nothing is
deleted or changed, they stay in the database, they keep updating live if
the other person pins something, and they're back the moment you exit.

**The board is view-only while anything is previewed.** You can't add,
edit, move or resize notes until you exit. 🎨 stays on the toolbar so you
can switch preview or stop. A banner says what's being previewed.

## Themes under construction

Each theme is either **live** (✅) or **under construction** (🚧). That's
stored in the `theme_status` table, not in code, and you flip it from the
switch beside each theme in the Dev section.

- **Under construction** themes aren't offered in the picker. They're
  only reachable through dev mode's preview.
- **A theme with no row counts as under construction.** So a new theme
  is hidden as soon as its code ships, before anyone runs any SQL.
  Release it from the Dev section when it's ready. No migration per theme
  is needed, though inserting a `'live'` or `'draft'` row in one works
  too.
- **Status only decides what the picker offers**, never how a board
  renders. A board already using a theme keeps rendering it, and the
  picker still shows a board's own themes even if they're under
  construction.
- If the table can't be read (not migrated yet, offline), nothing is
  treated as under construction, so the picker shows everything, as it
  did before.
- Only `/api/dev/themes` writes the table, after checking `DEV_EMAILS`,
  using the service role key. The table has no write policies, so a
  browser can't change it directly.

## Unchanged

`/dev/scene` and `/dev/model` are still local-only, and still the place
for camera angles and screenshots.
