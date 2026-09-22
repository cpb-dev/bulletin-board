---
name: theme-isolation
description: Rules for changing anything that a board theme renders — scenes, props, the board itself, the theme catalogue, or shared three.js helpers. Use when working on one theme, adding a theme, detailing a model, or touching any file under src/components/three/ or src/lib/themes.ts. Ensures existing and archived boards are never changed by work aimed at a different theme, and defines the Shared Surface Declaration required whenever shared code is touched.
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
**all nine themes**. `Room.tsx` looks like "one scene" and serves **five**.

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
| `src/components/BoardExperience.tsx` | scene switch, data load, overlay UI |
| `src/lib/themes.ts` | the catalogue and its types |
| `src/lib/board-geometry.ts`, `src/lib/store.ts` | coordinates and state |

**Shared by a group of themes:**

| File | Themes |
| --- | --- |
| `src/components/three/Room.tsx` | the five indoor themes: cozy-cabin, peach-parfait, midnight-picnic, sage-meadow, summer-house |

**Isolated to one theme:**

| File | Theme |
| --- | --- |
| `BeachScene.tsx` | beach-hut |
| `StadiumScene.tsx` | world-cup (special, outside `THEMES`) |
| `RoseFieldScene.tsx` | rose-picnic (special, surprise boards only) |
| `HauntedScene.tsx` | haunted-hollow |
| `src/components/three/props/*.tsx` | whichever scene imports it |

Note that `world-cup` and `rose-picnic` are deliberately **not** in `THEMES`,
so they never appear in the theme picker. They are still real boards people
can be looking at — include them in any impact check.

### Deriving the surface

Never trust the table above without checking. To find every consumer of a
file you are about to change:

```bash
# direct importers
grep -rn "from \"[./@a-z/]*<basename>\"" src --include=*.tsx --include=*.ts

# then walk UP: who imports those? keep going until you reach
# BoardExperience.tsx or a scene file, and note which themes those serve
grep -n 'scene === ' src/components/BoardExperience.tsx
grep -n 'scene:' src/lib/themes.ts
```

A change is shared if that walk ends at more than one theme.

## Prefer isolation when adding

When building something new for one theme:

- **New props go in `src/components/three/props/`**, imported only by that
  theme's scene. That is why `Pumpkin.tsx` lives there.
- **Extend shared helpers additively.** If a prop needs richer shading, add
  a new function rather than changing the existing one — `makeToonRamp`
  exists precisely because `makeToonGradient` is used by all nine themes and
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
  something leaked.
- **The catalogue test.** `src/lib/__tests__/themes.test.ts` asserts every
  theme maps to a scene that exists — a theme naming a missing scene falls
  back silently to the indoor room.
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

## As the app grows

New kinds of shared component will appear. When you meet one that isn't in
the table above:

1. Work out its real reach by walking imports up to the themes.
2. Apply the same rule — declare and verify.
3. Add it to the table in this file, so the next session starts better
   informed than you did.
