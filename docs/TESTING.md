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
  export bundling.
- `image` — resize math, no upscaling, aspect preservation.

**Component tests (Testing Library)** — `src/components/ui/__tests__/`
Real user behaviour against the real store, mocked network:
- Toolbar: right actions per view, read-only hides editing, buttons
  drive the store.
- NoteComposer: can't pin empty, pinning calls the API with sane
  coordinates and walks the camera to the new note, failures keep the
  sheet open so nothing typed is lost.

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
