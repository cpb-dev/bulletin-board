---
name: theme-isolation
description: Rules for changing anything that a board theme renders — scenes, props, the board itself, the theme catalogue, or shared three.js helpers. Use when working on one theme, adding a theme, detailing a model, or touching any file under src/components/three/ or src/themes/. Ensures existing and archived boards are never changed by work aimed at a different theme, and defines the Shared Surface Declaration required whenever shared code is touched.
---

# Theme isolation

## The prime directive

**Work aimed at one theme must not change any other theme, and must never
change how an archived board renders.**

Boards in this app are long-lived and personal. A memory saved a year ago
has to look the way it looked when it was saved. Someone opening Cozy Cabin
should see no difference because work happened on Haunted Hollow.

This is not "don't touch shared code". Shared code is normal and fine to
change. The rule is that **shared changes are declared and verified, never
silent**.

## The two kinds of change

**Isolated** — a file only one theme renders. Change freely.

**Shared** — a file more than one theme routes through. Allowed, but requires
a Shared Surface Declaration (below) before you finish.

### Sharedness is not import count

Do not judge this by how many files import something.
`src/components/three/Board.tsx` has exactly one importer and is rendered for
**all ten themes**. `Room.tsx` looks like "one scene" and serves **five**.

The real question is: **when this code runs, which boards can a person be
looking at?**

## Current map

This list is a starting point, not the truth — it will go stale as the app
grows. Always re-derive before relying on it (see *Deriving the surface*).

**Shared by every board — highest care:**

| File | Why |
| --- | --- |
| `src/components/three/Board.tsx` | the corkboard, frame, decor switch, pan/walk-up |
| `src/components/three/textures.ts` | `makeToonGradient`, `makeCorkTexture`, `drawNoteTexture`, `mulberry32` |
| `src/components/three/NoteMesh.tsx`, `PhotoMesh.tsx`, `Pin.tsx` | every pinned item |
| `src/components/three/HeldItem.tsx`, `SelectionFrame.tsx`, `useItemInteraction.ts`, `photo-texture.ts` | holding, selecting, dragging |
| `src/components/three/CameraRig.tsx` | both camera stations |
| `src/components/BoardExperience.tsx` | scene lookup, data load, overlay UI |
| `src/components/ThemeMorph.tsx` | the dissolve when a board switches between its main and second theme (BB-3) |
| `src/lib/theme-view.ts` | which of a board's two themes is on screen; remembered per device |
| `src/lib/day-cycle.ts` | the day/night phase (BB-21); only themes whose module sets `dayCycle` ever get anything but "day", and archived boards always get "day" |
| `src/themes/index.ts`, `scenes.ts`, `types.ts`, `groups.ts` | the catalogue and its types |
| `src/lib/board-geometry.ts`, `src/lib/store.ts` | coordinates and state |

**Shared by a group of themes:**

| File | Themes |
| --- | --- |
| `src/components/three/Room.tsx` | the five Everyday themes: cozy-cabin, peach-parfait, midnight-picnic, sage-meadow, summer-house |

**Isolated to one theme — everything under that theme's own folder:**

| Folder | Theme |
| --- | --- |
| `src/themes/beach-hut/` | beach-hut (scene, shell decor, crab logic) |
| `src/themes/world-cup/` | world-cup (stadium scene, football decor) |
| `src/themes/rose-picnic/` | rose-picnic (rose field scene, heart decor) |
| `src/themes/haunted-hollow/` | haunted-hollow (scene, every prop, its lib) |
| `src/themes/stars-hollow/` | stars-hollow (scene, every prop, its kit of textures, layout and batching lib) |
| `src/themes/<id>/palette.ts` | that theme's colours, and only that theme's |

All ten themes are in `THEMES` and all ten appear in the picker, grouped
by `palette.group` (`basic` / `special` / `seasonal` / `tv`). `world-cup` and
`rose-picnic` are no longer hidden, so a change to either is now a change
someone can see on an ordinary board — treat them like any other theme.

### Deriving the surface

Never trust the table above without checking. To find every consumer of a
file you are about to change:

```bash
# direct importers
grep -rn "from \"[./@a-z/]*<basename>\"" src --include=*.tsx --include=*.ts

# then walk UP: who imports those? keep going until you reach
# BoardExperience.tsx or a theme's index.ts, and note which themes
# those serve
grep -rn 'Scene:' src/themes/*/index.ts
```

A change is shared if that walk ends at more than one theme.

A file's folder is the fastest first answer: anything under
`src/themes/<id>/` belongs to that theme alone, and anything under
`src/components/three/` is shared by several. That is what the split is
for — but still walk the imports before changing shared code.

## Prefer isolation when adding

When building something new for one theme:

- **New props go in `src/themes/<id>/props/`**, imported only by that
  theme's scene. That is why `Pumpkin.tsx` lives under
  `src/themes/haunted-hollow/props/`.
- **A new theme should need no shared change at all.** Give it a folder
  with a `palette.ts` and an `index.ts` exporting its `ThemeModule`
  (palette, `Scene`, optional `BoardDecor`), then register it in
  `src/themes/index.ts` and `src/themes/scenes.ts`. If you find yourself
  adding a branch to `Board.tsx` or `BoardExperience.tsx`, stop — the
  module is meant to carry that.
- **Extend shared helpers additively.** If a prop needs richer shading, add
  a new function rather than changing the existing one — `makeToonRamp`
  exists precisely because `makeToonGradient` is used by all ten themes and
  must not drift.
- **Widening a union type is additive** and safe (`scene`, `boardDecor`).
  Adding a branch to a switch is additive. Changing an existing branch is
  not.
- **Pin shared values with a test** when you find one that matters. See
  `src/components/three/__tests__/textures.test.ts`, which fails loudly if
  the shared gradient's exact bytes ever change.

## Shared Surface Declaration

**Required whenever a change touches shared code.** Put it in the commit
message and the PR description. It is not optional and not a formality — it
is how a future reader knows what was considered.

State:

1. **Which shared file(s)** changed, and what changed in each.
2. **Every theme or area that routes through it** — name them, do not say
   "all themes". Include `world-cup` and `rose-picnic`, and include
   archived boards if the change could affect how a saved board renders.
3. **Why it is safe for each**, or what changed for each if the change is
   intentionally visible to all.
4. **How it was verified.**

Example:

> **Shared surface:** `src/components/three/Board.tsx` — added a `cobwebs`
> branch to the board decor switch; widened one import.
>
> **Routes through it:** all nine themes. cozy-cabin, peach-parfait,
> midnight-picnic, sage-meadow and summer-house take the `lights` default;
> beach-hut takes `shells`; world-cup takes `footballs`; rose-picnic takes
> `hearts`; only haunted-hollow takes the new branch. Archived boards resolve
> their decor the same way, through `getTheme`.
>
> **Safe because:** the change is a new `else if` before the existing
> default. No existing branch was modified.
>
> **Verified:** production build has the same 12 routes at the same sizes;
> 201 tests pass including the shared-gradient pin; all 26 e2e tests pass.

## Verifying no collateral change

- **Route sizes.** Build before and after; every unrelated route should be
  byte-identical. A changed size on `/lists` after a theme change means
  something leaked. Watch `/memories` especially: it wants palettes only,
  so it must import `@/themes`, never `@/themes/scenes`. Importing the
  scene registry from a page pulls every 3D scene into it (that
  mistake once took `/memories` from 7 kB to 286 kB).
- **The catalogue tests.** `src/themes/__tests__/catalogue.test.ts` asserts
  every theme has a scene, is filed under a real group, and appears exactly
  once in the picker; it also keeps the palette list and the scene list in
  step. `src/themes/__tests__/palette-drift.test.ts` pins a digest of every
  theme's look — if it fails you have changed how an existing theme renders,
  which is allowed only deliberately, with the digest updated in the same
  commit.
- **Look at the other themes.** Tests cannot see colour. If you changed
  anything shared, say so and ask for a visual check of at least one theme
  from each group: an indoor one, beach-hut, and `/worldcup`.
- **Open a memory.** Archived boards go through `getTheme`'s fallback path,
  which is easy to break and invisible in unit tests.

## Dev-only tooling

Anything that exists to help build themes must be **absent from the
production build**, not merely unreachable.

- Dev-only pages are named `page.dev.tsx`; `next.config.ts` only counts that
  extension as a route outside production.
- `src/middleware.ts` lets `/dev` through only when
  `NODE_ENV !== "production"`, so it can never sit in front of the auth wall.
- Verify by building and confirming the route is not listed at all.
- `/dev/scene?t=<theme>` (`src/app/dev/scene/page.dev.tsx`) renders a
  theme's whole scene and board from the room camera with no sign-in;
  `scripts/shoot-scene.mjs` screenshots it and
  `scripts/dev/scene-stats.mjs` prints its draw calls. Same rules: dev-only
  by construction.

## As the app grows

New kinds of shared component will appear. When you meet one that isn't in
the table above:

1. Work out its real reach by walking imports up to the themes.
2. Apply the same rule — declare and verify.
3. Add it to the table in this file, so the next session starts better
   informed than you did.
