# Our Little Board

A private 3D bulletin board for two people. Next.js 15 + React Three Fiber on
Vercel, Supabase for auth/data/storage/realtime. See `docs/ARCHITECTURE.md`
for the shape of it and `docs/DESIGN.md` for the art direction.

## The one rule that matters most

**Boards that already exist must keep working and keep looking the same.**

Nine themes share a small set of components. Work on one theme must never
change another, and archived boards (memories) must render exactly as they
did when they were saved. Before changing anything under
`src/components/three/` or `src/themes/`, load the **theme-isolation**
skill.

## Conventions

- **Each theme owns its folder.** `src/themes/<id>/` holds that theme's
  palette, scene, props and logic, and its `index.ts` is the bridge that
  exports the one `ThemeModule` the catalogue sees. Adding a theme is a new
  folder plus one line in `src/themes/index.ts` and one in
  `src/themes/scenes.ts` — never a new branch in shared code.
- **New logic goes in `src/lib/` as pure functions, with unit tests** —
  or in `src/themes/<id>/lib/` when only one theme uses it. The meshes and
  components stay dumb. `src/themes/beach-hut/lib/crab.ts` and
  `src/themes/haunted-hollow/lib/haunted.ts` are the pattern: timing,
  easing and randomness live there and are tested without a renderer.
- **New UI behaviour gets a component test** against the real Zustand store,
  mocking only the network edge (`@/lib/api` or the Supabase client).
- **Schema changes are a new numbered file in `supabase/migrations/`.** Never
  edit a migration that has been applied — they are run by hand in the
  Supabase SQL editor and there is no rollback.
- **Themes must never break archived boards.** `getTheme` falls back to the
  first theme for unknown ids, and that fallback is load-bearing: a board
  saved under a theme id that later disappears still has to render.
  `src/themes/__tests__/palette-drift.test.ts` pins what every theme looks
  like; if it fails you have changed an existing theme, so change the
  digest deliberately and say so.
- **Import themes by what you need.** `@/themes` is palettes only (cheap);
  `@/themes/scenes` pulls in all nine 3D scenes and belongs to the board
  experience alone. Mixing them up quadruples a page's bundle.
- **Item coordinates are normalized** (`x, y ∈ [-1, 1]`) so the board can be
  resized or restyled without corrupting saved boards. Don't store world
  units.

## Checks

```bash
npm run lint && npm run typecheck   # both must be clean
npm run test                        # unit + component (vitest)
npm run e2e                         # Playwright smoke tests
npm run build                       # needs NEXT_PUBLIC_SUPABASE_* set
```

`dev` and `build` both run `build:viewer` first, which bundles
`src/viewer/` into the git-ignored `public/export/viewer.js` — the
offline board inside a keepsake export. See `docs/EXPORT.md`.

The build needs Supabase env vars. CI uses placeholders and so can you:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key npm run build
```

## CI and previews

`.github/workflows/ci.yml` runs on `pull_request` and on pushes to `main`
only. **A push to a feature branch runs nothing** — no CI, and no Vercel
preview either. Both need an open PR. Once a PR is open, every push to that
branch rebuilds the preview at a stable branch URL; merging to `main` is what
promotes to production.

## Working in 3D

Everything is built from primitives and canvas-generated textures. There are
no downloaded models and no image assets — keep it that way unless the change
is discussed first; it's what keeps first paint quick on bad wifi.

Headless Chromium renders WebGL in this environment, so 3D work does not have
to be done blind. Load the **model-detailing** skill before building or
reworking any prop.
