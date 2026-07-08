# Surprise boards 🎁

A board that's **completely private to whoever created it** until a
reveal date — then it unlocks for your partner with a personal push
notification. Built for birthdays; reusable for anniversaries or any
occasion.

## How to use it

1. Top bar → **🗂️ boards** → **🎁 plan a surprise**.
2. Name it, pick the **reveal date & time** (her timezone is your
   phone's timezone), and write the **message she'll receive** as the
   notification.
3. Build it out over the days before — pin notes (including the
   exclusive **pink heart notes**), photos, move things around. She
   sees nothing and gets **no notifications** about any of it.
4. At the reveal moment the board unlocks for her automatically and she
   gets your message as a push notification, linking straight to it.
5. Pan right on the board to find the smaller **“your day” board** — a
   space you both fill together on the day itself.

The reveal date and message can be edited any time before the moment
(boards menu → the 🔒 panel on the surprise board).

## Privacy — how it's guaranteed

- Visibility is enforced in the **database** (row-level security), not
  the UI: a board with `private_to` set, and its items, simply don't
  exist in any query, realtime stream, or board list for anyone else
  until `reveal_at` passes. There is nothing the client can do to see
  it early.
- The notification sender skips items on still-secret boards, so
  "left you a note 💌" pushes can't leak the surprise.
- A still-secret board can't be made the main board (it would vanish
  from your partner's view), and it never appears in her boards menu.
- When the moment arrives, visibility flips **by time, in the
  database** — even if no cron ever ran, opening the app after the
  moment shows the board.

## The reveal notification

Delivery is belt-and-braces:

- A **Vercel cron** (see `vercel.json`, daily at 06:00 UTC) calls
  `/api/reveal`, which finds due surprises, pushes the personal message
  to everyone except the creator, and stamps them as announced (so it
  can only ever send once — idempotent, race-safe).
- The app also calls `/api/reveal` **whenever it's opened**, so if the
  cron hasn't fired yet the push goes out the first time either of you
  opens the app after the moment.

Want the push to land at an exact minute? The Hobby-plan cron is
once-daily, so either rely on the on-open sweep (fine in practice — the
push fires the moment anyone opens the app), point an external
scheduler (e.g. cron-job.org) at `POST /api/reveal`, or upgrade the
Vercel plan for finer cron schedules. The endpoint is safe to call as
often as you like.

## The Rose Picnic theme 🌹

Exclusive to surprise boards (never offered in the theme picker):

- A rose field at golden hour — hundreds of pink roses, drifting petals
  and pollen shimmer, a low sun and warm haze. Rendered in a more
  realistic style than the toon rooms (physically-based materials, soft
  shadows, real glass for the drinks).
- A picnic beneath the boards: gingham blanket, woven basket, cushions,
  a plate of baguette/cheese/strawberries/grapes, **a beer and an
  Aperol spritz**.
- The main board plus the smaller **“your day”** board with letter
  bunting; a garland of **pink hearts** along the main board's top.
- The exclusive **heart paper**: when writing a note on this board,
  pick the "Heart" colour and the note itself is a pink heart.

## Setup

Run migration
[`0007_surprise_boards.sql`](../supabase/migrations/0007_surprise_boards.sql)
once in the Supabase SQL editor (adds the privacy columns and tightens
the row-level-security policies; safe on existing data). The Vercel
cron in `vercel.json` deploys automatically with the site. Push
notifications use the existing NOTIFICATIONS.md setup — nothing new
needed.
