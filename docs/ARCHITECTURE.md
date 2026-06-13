# Architecture

## The shape of it

```
phones / browsers
   │  (PWA, later Capacitor wrappers pointing at the same URL)
   ▼
Next.js 15 on Vercel  ──  src/middleware.ts = auth wall (Supabase session)
   │
   ├─ /board            the live 3D board (client-rendered three.js)
   ├─ /memories         archive & browse saved boards
   ├─ /memories/[id]    a saved board, read-only in 3D
   └─ /login            sign in / first-time sign up
   │
   ▼
   ├─ /lists            shared checklists, separate to the board
   │
   ▼
Supabase
   ├─ Auth       email+password, signup restricted by DB trigger
   ├─ Postgres   boards / items / profiles / lists / list_items /
   │             allowed_members / push_subscriptions (+ RLS)
   ├─ Storage    private `photos` bucket, signed URLs
   ├─ Realtime   postgres_changes → both phones stay in sync
   └─ Edge fn    `notify` → web-push on new items/list items (optional)
```

## v2 additions

- **Edit mode** (`store.mode`) cleanly separates "looking" from
  "arranging": in view mode a drag pans/zooms and a tap opens a note to
  read; only in edit mode does a drag move a note or a corner handle
  resize it. This killed the "zoom accidentally grabbed a note" problem.
  Item size is a normalized `scale` column, so resizes survive restyles
  and archiving like positions do.
- **Lists** are a parallel, deliberately board-independent feature
  (`lists` + `list_items`), with their own page, their own archive, and
  their own realtime channel. They never enter the board "memories".
- **Notifications** are Web Push: a `push_subscriptions` table, a
  service worker (`public/sw.js`), and a Supabase edge function
  (`supabase/functions/notify`) triggered by Database Webhooks on insert.
  The web app only holds the public VAPID key; the private key lives in
  the function's secrets. Entirely optional — the 🔔 control hides itself
  until a public key is configured. See docs/NOTIFICATIONS.md.

## Key decisions (and why)

**Next.js + React Three Fiber over a game engine (Unity/Godot) or
plain three.js.** The web is the priority and the deploy target is
Vercel; R3F gives us declarative three.js that lives happily inside
React, shares state with the 2D UI, and tree-shakes to a reasonable
bundle. A game engine would make the "wrap it for mobile later" story
and Vercel hosting much harder.

**Supabase as the entire backend.** Auth, Postgres, file storage and
realtime in one free-tier project, with row-level security enforced in
the database rather than in API code we'd have to write and maintain.
There is deliberately **no custom server code** — the Next.js app talks
to Supabase directly with the anon key + the user's session, so there's
nothing to keep secret in the frontend and nothing to operate.

**Privacy via a database trigger, not application logic.** The
`allowed_members` table + `handle_new_user()` trigger reject any signup
that isn't one of your two emails *inside Postgres*. Even someone with
the (public by design) anon key cannot create an account. RLS policies
then simply say "any signed-in member can do anything" because the only
possible members are the two of you. Photos sit in a **private** bucket
and are served through short-lived signed URLs.

**Normalized item coordinates.** Items store `x, y ∈ [-1, 1]` relative
to the board, not world units — so the 3D board can be resized or
restyled without ever corrupting saved boards (including archived
memories). The mapping lives in `src/lib/board-geometry.ts` and is
fully unit-tested.

**Boards are append-only history.** "Backing up" a board flips it to
`archived` and creates a fresh `active` board. Nothing is copied,
nothing can be lost in the copy step, and archived boards render
through the exact same 3D component in read-only mode. A JSON keepsake
export exists as a belt-and-braces second backup.

**Realtime as enhancement, not requirement.** The app is fully
functional on plain request/response; the `postgres_changes`
subscription (`src/lib/use-realtime-board.ts`) just makes the other
person's pins appear live. Upserts are idempotent, and an item being
dragged locally is never clobbered by an incoming echo.

**Client-side data layer with injected client.** All Supabase calls go
through `src/lib/api.ts`, which takes the client as an argument — so
the entire data layer is unit-testable with a mocked client, and a
future swap to server actions wouldn't change call sites much.

## Data model

```sql
profiles          id (= auth.users.id), display_name
boards            id, title, theme, status active|archived, created_at, archived_at
items             id, board_id, kind note|photo, content, photo_path,
                  paper, x, y, rotation, scale, created_by, timestamps
lists             id, title, status active|archived, created_at, archived_at
list_items        id, list_id, content, done, position, created_by, timestamps
allowed_members   email   -- the guest list; no API access at all
push_subscriptions user_id, endpoint, p256dh, auth  -- per-device, owner-only RLS
storage: photos/  {board_id}/{uuid}.jpg  -- private bucket
```

## Folder map

```
src/
  middleware.ts            auth wall for every page
  app/                     routes (login, board, memories)
  components/
    BoardExperience.tsx    one board = 3D scene + overlay UI + data load
    three/                 Room, Board, NoteMesh, PhotoMesh, CameraRig…
    ui/                    Toolbar, composers, editor, theme picker…
  lib/
    api.ts                 all Supabase reads/writes
    board-geometry.ts      pure math (positions, wrapping, placement)
    themes.ts              the theme catalogue
    store.ts               Zustand: items, camera mode, open panels
    use-realtime-board.ts  live sync subscription
    image.ts               client-side photo compression
supabase/migrations/       the single source of truth for the schema
e2e/                       Playwright smoke tests
scripts/generate-icons.mjs zero-dependency PWA icon generator
```

## Performance notes

- Photos are downscaled to ≤1600px JPEG on the client before upload —
  uploads are fast on holiday wifi and the free storage tier lasts years.
- Note text is drawn to `CanvasTexture`s (no DOM-in-3D), cork and toon
  gradients are tiny generated textures, the room is all primitives —
  no model downloads, so first paint is quick even on hotel wifi.
- The 3D scene only ever renders one board; archived boards load the
  same way and are capped by whatever you pinned, not by history size.
