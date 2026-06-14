# Our Little Board 📌

A private, cozy 3D bulletin board for two. Walk up to a corkboard in a
warm little room, pin handwritten notes and polaroid photos for each
other, redecorate with themes, and tuck full boards away as memories to
revisit later. Live-synced, installable on your phones, and only the
two of you can ever get in.

> a bulletin board app for me and Kalli to use 💛

## What it does

- **3D room you can walk around in** — start pulled back in a cozy
  toon-shaded room (Animal Crossing / Stardew energy), tap the board to
  walk up, pan and pinch-zoom around it, drag notes to re-pin them.
- **Notes & photos** — handwritten sticky notes in theme paper colours,
  and photos pinned up like polaroids with handwritten captions. Each
  note carries a little "posted by · date" stamp.
- **Live for both of you** — when one of you pins something, it pops
  onto the other's board in real time.
- **Move & resize in edit mode** — a dedicated ✏️ edit mode lets you
  drag notes around and pull a corner handle to resize them; outside it,
  panning and zooming never grab a note by accident.
- **Multiple boards** — one main board that's always there, plus any
  number of extra named boards you can switch between, edit, and later
  save as memories — all from the 🗂️ Boards dropdown.
- **Hold a note** — tap any pinned note or photo in view mode and it
  floats up close, like holding it in your hand (tilt it with your
  finger); editing happens in Edit mode.
- **Memories** — "back up" a full board to the memory box forever, start
  a fresh one, revisit old boards in 3D, download keepsake JSON exports.
- **Lists** — a separate 📝 Lists page for shared checklists (shopping,
  date ideas, films…); make as many as you like, tick things off
  together, archive old ones. Kept apart from the board's memories.
- **Phone notifications** — opt-in 🔔 web-push so the other person gets
  pinged when you pin a note or add to a list ([docs/NOTIFICATIONS.md](docs/NOTIFICATIONS.md)).
- **Themes** — Cozy Cabin 🪵 (log walls + a crackling, smoking
  fireplace), Peach Parfait 🍑, Midnight Picnic 🌙, Sage Meadow 🌼,
  Summer House 🌻 (a garden through the window + a flower bush), and
  Beach Hut 🏖️ — a whole outdoor scene: the board on an easel in the
  sand under a daytime sky, the sea rolling in, a sandcastle, gulls, and
  crabs you can **tap to play with**. Changing the theme redecorates
  everything for both of you instantly.
- **Private by design** — only emails on the guest list can ever create
  an account; photos live in a private bucket behind signed URLs.

## Getting it live (you can do this from your phone)

Follow **[docs/SETUP.md](docs/SETUP.md)** — about 15 minutes:
Supabase project → paste one SQL file → import this repo into Vercel →
sign up → *Add to Home Screen*. Done.

## Stack

| Layer | Choice |
| --- | --- |
| Web app | Next.js 15 + React 19 + TypeScript |
| 3D | three.js via React Three Fiber + drei |
| State | Zustand |
| Styling | Tailwind CSS 4 + a sprinkle of hand-rolled cute |
| Backend | Supabase (Auth, Postgres + RLS, Storage, Realtime) |
| Hosting | Vercel |
| Mobile | PWA now, Capacitor wrappers later ([docs/MOBILE.md](docs/MOBILE.md)) |
| Tests | Vitest + Testing Library (unit/component), Playwright (e2e), GitHub Actions CI |

Why these? See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). Art
direction and interaction decisions: [docs/DESIGN.md](docs/DESIGN.md).
Test strategy: [docs/TESTING.md](docs/TESTING.md).

## Development

```bash
cp .env.example .env.local   # fill in your Supabase project values
npm install
npm run dev                  # http://localhost:3000

npm run test                 # unit + component tests
npm run e2e                  # Playwright smoke tests
npm run lint && npm run typecheck
```

## Make it yours

- `NEXT_PUBLIC_APP_NAME` — the name shown in the app and on your home
  screen (set it in Vercel → Settings → Environment Variables).
- `src/lib/themes.ts` — every colour of every theme lives here; add a
  fifth theme by adding one object.
- `supabase/migrations/0001_init.sql` — the guest list of the two
  emails allowed to sign up.
- `node scripts/generate-icons.mjs` — regenerates the app icons.
