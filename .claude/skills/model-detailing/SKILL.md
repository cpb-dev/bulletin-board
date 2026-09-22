---
name: model-detailing
description: How to build, rework or detail a 3D prop in this app's three.js scenes without working blind. Use when creating a new prop, improving how an existing one looks, or adjusting scene geometry, lighting or placement. Covers the dev model harness that renders a prop headlessly so it can actually be looked at, the modelling techniques that suit this art direction, and the specific mistakes that are invisible in code and obvious in a render.
---

# Detailing a 3D prop

## Render it. Do not work blind.

Headless Chromium in this environment renders WebGL via SwiftShader, so a
prop can be rendered and inspected directly. **Use this every time.**

Two bugs shipped before this existed: a ghost that was a white slab with two
dots, and pumpkins whose carved faces pointed away from the camera. Both
looked correct in code. Both were obvious in the first render.

### The loop

```bash
# 1. dev server (needs the placeholder env vars)
NEXT_PUBLIC_SUPABASE_URL=https://placeholder.supabase.co \
NEXT_PUBLIC_SUPABASE_ANON_KEY=placeholder-anon-key npm run dev

# 2. screenshot the prop at whatever angles you need
CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  node scripts/shoot-model.mjs <model> <outDir> <angles> <variant>

# e.g.
CHROME_PATH=... node scripts/shoot-model.mjs pumpkin /tmp/shots 0,35,90 1
```

Then **read the PNG**. Look at it. Iterate. Ten cheap passes beat one
expensive round trip through the person you're working with.

`CHROME_PATH` is only needed when the bundled Playwright browser is missing
(the pinned version often doesn't match what's installed here).

### The harness

`/dev/model?m=<prop>&a=<angle>&v=<variant>&d=<distance>&y=<eye height>`
stages one prop on a neutral turntable using the scene's own lighting, so
what you judge matches what the scene will show.

Register a new prop in the `MODELS` map in
`src/app/dev/model/ModelStage.tsx`.

It is dev-only by construction — see the theme-isolation skill. Do not make
it reachable in production.

### What the harness cannot tell you

Props are much smaller in the scene than on the turntable, seen from further
away, and against coloured ground rather than a neutral plane. Detail that
reads beautifully isolated can vanish entirely at real size.

**Always wire it into the scene and check again**, and say plainly which
questions still need a human's eyes.

## Mistakes that only show in a render

Check these every time — each one shipped at least once:

- **Origin not at the base.** A body centred on its origin sinks halfway
  into the ground. Put the origin where the prop meets the floor so callers
  place it at `y = 0`.
- **Overlay bigger than the body.** A face or decal on a patch larger than
  the mesh it sits on bleeds past the silhouette — a glow hanging in the air
  below the object.
- **Detail invisible under a flat ramp.** The shared 3-step toon gradient is
  too flat to show ribs, folds or bevels. Detail modelled under it simply
  will not appear. Use a richer ramp via `makeToonRamp` (never change the
  shared one).
- **Shadow acne on grooved surfaces.** Self-shadowing stipple across ribs.
  Fix with `shadow-bias={-0.0004}` and `shadow-normalBias={0.02}`, and a
  larger `shadow-mapSize`.
- **Facing the wrong way.** Anything with a front — a carved face, a sign,
  an epitaph — must be aimed at the room camera at `(0.4, 1.45, 4.4)`.
  `Math.atan2(camX - x, camZ - z)` gives the rotation.
- **Sub-parts rotating about their own centres.** Parts that must stay flush
  (a stone and the text carved into it) belong in one group with a shared
  transform, not positioned separately with matching rotations.
- **Too close to the camera.** Room view sits at `z = 4.4`. Props at
  `z > 2` are in the viewer's lap. Note also that the board casts a wide
  occlusion shadow — anything directly behind it is hidden.

## Techniques that suit this art direction

`docs/DESIGN.md` commits to *"chunky primitives, no realism — wonky-on-purpose
reads as cute; high-poly reads as uncanny."* The goal is better craft within
that style, not photorealism.

In rough order of payoff:

1. **Real profiles over stacked primitives.** `LatheGeometry` from a profile,
   or `ExtrudeGeometry` with a bevel, gives a true silhouette. A pumpkin is
   one lathe with lobes displaced into it, not seven spheres — see
   `src/components/three/props/Pumpkin.tsx`.
2. **Break symmetry.** Nothing should be a perfect sphere or a straight
   cylinder. Displace vertices, bend trunks with `CatmullRomCurve3` +
   `TubeGeometry`, weather stone.
3. **Richer shading where form must read.** `makeToonRamp([...])` with more
   steps. Only for the prop that needs it.
4. **Ground it.** `castShadow` / `receiveShadow`, and real light sources
   where they're implied — a `pointLight` inside a carved pumpkin.
5. **Canvas textures for surface detail.** Faces, lettering, bark, webs. No
   downloads, crisp at any zoom. See `makePumpkinFaceTexture` and
   `makeEpitaphTexture`.
6. **Animate the mesh, not just the transform.** Warping the vertices of a
   segmented plane each frame makes a ghost's shroud billow, where moving
   the whole plane reads as a sliding cut-out.

## Keep the behaviour testable

Timing, easing and randomness go in `src/lib/` as pure functions with unit
tests — `crab.ts` and `haunted.ts` are the pattern. The mesh stays dumb and
reads from them. That way the *behaviour* is verifiable without a renderer,
and only the *looks* need eyes.

## Budget

No model downloads, no image assets — primitives and canvas textures only.
This runs on phones: prefer one instanced mesh over many, share geometry and
textures between instances, and dispose anything created in a `useMemo` on
unmount.
