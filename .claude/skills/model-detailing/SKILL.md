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
`&ox=<x offset>&oy=<y offset>&ty=<target height>` stages one prop on a
neutral turntable using the scene's own lighting, so what you judge matches
what the scene will show.

For anything **standing on the ground**, frame it with `ty` — the height the
camera aims at. `oy` moves the prop but *not* the stage's ground plane, so
using it on a tree buries the bottom of the trunk and leaves you judging a
shrub. `ox`/`oy` are for sliding a detail on a big model under the camera:
work out where the detail lands after the `a` rotation and offset it to the
origin.

`shoot-model.mjs` takes these as trailing arguments:
`<model> <outDir> <angles> <variant> <distance> <eye> <ox> <oy> <ty>`.

To watch something animate you need several frames from **one** page load —
each `goto` restarts the clock, so shooting the same angle twice gives you
the same frame. Load the page once, then `waitForTimeout` and screenshot
between waits. Keep the throwaway script inside the repo: a script in
`/tmp` cannot resolve `@playwright/test`.

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
- **Shadow acne on big flat surfaces.** On something house-sized it does not
  look like stipple at all — it looks like broad diagonal bands of shadow
  lying across a wall, convincing enough to be mistaken for a cast shadow
  from geometry that isn't there. The bands run diagonally because they
  follow the *light's* texel grid, not the world axes. Ruling it out is one
  render with the light's `castShadow={false}`: if the bands vanish, they
  were never geometry. A big prop needs roughly `shadow-bias={-0.0012}` and
  `shadow-normalBias={0.06}`.
- **A shadow camera that doesn't cover the prop.** The default directional
  shadow frustum is ±5 units. Set `shadow-camera-left/right/top/bottom/far`
  to contain the prop — **and** add
  `onUpdate={(self) => self.shadow.camera.updateProjectionMatrix()}`. R3F
  assigns those properties but never refreshes the projection matrix, so
  without it they are silently ignored.
- **A gradient baked into a repeating tile.** Damp rising up a wall, dirt
  settling at the foot of a post — put it in the tile and it repeats with
  the tile, banding the whole surface. Anything that varies across the
  *object* has to live on the object, not in a texture that wraps.
- **A pale detail on a lit surface.** A white cobweb over a lit window pane
  is invisible. Tint it dark and it silhouettes against the light. Give the
  component a `color` prop rather than baking two textures.
- **A colour map that leaves the tint nothing to do.** A map is *multiplied*
  by the material or instance colour. Paint the texture in full autumn red
  and every instance comes out the same dark red however you tint it. Draw
  the *light* — a pale, desaturated version — and let the colour do the
  colouring. This is what makes one instanced geometry read as a dozen
  different objects.
- **A texture that wanders but doesn't come back.** Grain, furrows, anything
  drawn by walking down the canvas with a random step will not line up at
  the seam, and on a repeating surface that shows as a hard ring every tile.
  Use a sum of sines over the tile's height instead — periodic by
  construction, so it joins.
- **Instances that are all one size.** Ragged geometry is not enough: if
  every cluster is scaled the same, the eye reads the repeat anyway. Vary
  the bulk per instance as well as the shape.
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
