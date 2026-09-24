# Testing strategy 🧪

The goal: future changes (new themes, new item kinds, camera tweaks)
shouldn't be able to silently break pinning, syncing or archiving.

## The pyramid

**Unit tests (Vitest)** — `src/lib/__tests__/`
The math and logic everything else leans on:
- `board-geometry` — coordinate mapping & round-tripping, clamping to
  the frame, text wrapping, photo sizing, placement suggestions.
- `themes` — catalogue integrity (unique ids, complete palettes) and
  graceful fallbacks for unknown ids (critical: an archived board must
  still render if a theme is ever renamed).
- `store` — camera transitions, zoom/focus clamping, item upsert/move/
  remove, "only one panel open" invariants.
- `api` — the whole data layer against a mocked Supabase client:
  first-visit board creation, archive-then-create ordering (never
  create the new board if archiving failed), photo cleanup on delete,
  export bundling, and downloading the bytes behind every photo.
- `image` — resize math, no upscaling, aspect preservation.
- `zip` — the hand-written archive writer: CRC-32 against a known test
  vector, DOS date packing, and a walk of the central directory back to
  each file, which is what proves a real unzip can read it.
- `export-bundle` — the keepsake folder: its layout and file names, the
  photo manifest, base64 against the platform encoder, and the offline
  page (a `</script>` inside someone's note must not escape the block).

**Component tests (Testing Library)** — `src/components/ui/__tests__/`,
`src/app/memories/__tests__/`
Real user behaviour against the real store, mocked network:
- Toolbar: right actions per view, read-only hides editing, buttons
  drive the store.
- NoteComposer: can't pin empty, pinning calls the API with sane
  coordinates and walks the camera to the new note, failures keep the
  sheet open so nothing typed is lost.
- Memory export: only the data layer is mocked, so the ZIP, the folder
  layout and the offline page are built for real and asserted on the
  actual bytes handed to the browser — including the progress line and
  what it says when a photo can't be reached.

**E2E smoke tests (Playwright)** — `e2e/`
Run against a real `next dev` server with placeholder credentials —
they verify the auth wall (every page redirects to /login), the login
UI in both modes, and the PWA manifest + icons. Desktop Chrome and a
Pixel 5 mobile profile.

## CI

`.github/workflows/ci.yml` runs on every push/PR, in parallel jobs:
lint + typecheck + unit tests · production build · e2e smoke tests
(with the Playwright report uploaded on failure). If all three are
green, a deploy is safe.

## What's deliberately not automated (yet)

- **3D rendering correctness** — verified by eye; the logic feeding the
  scene (positions, themes, textures' text wrapping) is unit-tested.
  If regressions ever bite, add Playwright screenshot tests on a seeded
  board.
- **Full e2e against live Supabase** — needs a dedicated test project.
  Recipe: create a throwaway Supabase project, run the migration, set
  `NEXT_PUBLIC_SUPABASE_URL/_ANON_KEY` env vars, then write specs that
  sign up, pin, archive. The Playwright config already forwards those
  env vars when present.

## Conventions for future changes

- New logic goes in `src/lib/` as pure functions → unit test it.
- New UI behaviour → component test with the store, mock only the
  network edge (`@/lib/api` or the Supabase client).
- Schema changes → a **new** numbered file in `supabase/migrations/`
  (never edit an applied migration).

## Looking at an export

Unit tests can prove an export contains the right files; they cannot see
whether the board inside it draws. `npm run export:preview` builds a real
export, opens it from `file://` in headless Chromium and screenshots the
room and the walked-up board — the same "don't work blind" idea as the
`/dev` model harness. See docs/EXPORT.md.
