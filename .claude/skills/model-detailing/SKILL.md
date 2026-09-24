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
- **A sky dome behind the far plane.** The harness camera's `far` has to
  clear the dome's radius or the sky never draws at all and you see the
  clear colour, which looks exactly like a sky that came out flat. The app
  uses 120 for a dome of 60.
- **Half a sky texture is underground.** A sphere's V runs pole to pole, so
  the horizon is at the *middle* of the texture, not the bottom. Spread a
  sky gradient over the full canvas height and the entire sky sits above
  the band you can see from a 1.45m eye. Put the zenith at the top, the
  skyline at the halfway line, and weight the cloud towards the skyline.
- **Flat-filled shapes where you meant soft ones.** Cloud, smoke, mist:
  overlapping solid ellipses read as a heap of discs no matter how many you
  stack. Each lobe needs a radial gradient falling to zero alpha.
- **A ground plane without anisotropy.** Seen at a grazing angle from eye
  level, every bit of grass and grit blurs into flat mud a few metres out.
  `texture.anisotropy = 8` is the whole fix.
- **A base colour with no headroom for its map.** A colour chosen when a
  surface was untextured is usually too dark once it is multiplied by a
  map: the detail is all there and all invisible. Lift the level, keep the
  hue.
- **Instances that are all one size.** Ragged geometry is not enough: if
  every cluster is scaled the same, the eye reads the repeat anyway. Vary
  the bulk per instance as well as the shape.
- **Facing the wrong way.** Anything with a front — a carved face, a sign,
  an epitaph — must be aimed at the room camera at `(0.4, 1.45, 4.4)`.
  `Math.atan2(camX - x, camZ - z)` gives the rotation.
- **Sub-parts rotating about their own centres.** Parts that must stay flush
  (a stone and the text carved into it) belong in one group with a shared
  transform, not positioned separately with matching rotations.
- **Standing off the end of the world.** A prop that looks like it is
  floating is often fine — it is the *ground* that ran out. Check the scene's
  floor plane covers where you put it: a `planeGeometry` is centred on its
  mesh position, so `args={[40, 24]}` at `z = 1.5` stops at `z = -10.5`, and
  anything further back has nothing under it. If the edge also falls inside
  the fog's near plane it reads as a hard line with sky behind it. Widen the
  ground until its edge is well into the fog — but keep it inside the sky
  dome's radius, or it will cut through and leave a seam.
- **Judging a detail while craning up at it.** The harness camera sits at
  `y = <eye>` and looks at `(0, ty, 0)`, so leaving `y` at 0 and raising `ty`
  to frame something high on a prop tilts the view steeply upward. Anything
  standing slightly proud of a surface — a face plane on a head, a decal, a
  web over a frame — then shifts up the screen by its offset times the sine
  of that angle, and looks misplaced when it is exactly where it should be.
  Chasing that cost three passes on the window ghost. Frame a detail with
  `y` and `ty` set to roughly the same height, and only tilt on purpose.
- **An additive overlay sitting over the thing you are judging.** A glow
  plane in front of a window lights the boards around it beautifully and
  also adds its warmth back over the glass, the glazing bars and everything
  behind them — which reads as "the texture came out too bright" and sends
  you off to fix the texture. If an overlay is meant to light what is
  *around* an opening, punch the opening out of it, and feather that hole
  *inwards*: feathering outwards erases the glow exactly where it should be
  strongest and leaves a dark halo hugging the opening, which reads as a
  shadow cast by nothing.
- **A figure that has to stay behind something in a shallow recess.** A
  solid of revolution is as deep as it is wide, so a body modelled to look
  right head-on will push its chest through a window's glazing bars and
  stand in front of them. Squash it on the axis it is never seen along.
- **Raising an arm partly from its Z rotation.** Euler order is `XYZ`,
  which means the Z swing is applied *innermost* — it fans the arm out
  sideways before the raise ever gets to it, and the figure comes out as a
  scarecrow. Drive a raise almost entirely from X, in the plane the limb
  already hangs in, and keep Z for a few degrees of elbow.
- **A hand, or anything with fingers, built from radial smears.** Each blob
  reads as its own glowing bead and the whole thing comes out as a firework.
  Draw it small — palm ellipse, finger strokes with a pad on the end — onto
  its own little canvas and `drawImage` it up to size. The upscale is what
  softens it, the pads stay joined to the palm, and it needs no filter
  support.
- **A face over-shadowed long before it looks gaunt.** Sockets, temples,
  cheek hollows, nose shadow and jaw shadow each look reasonable alone and
  together blanket the face into a dark smudge. Gaunt is not "more shadow":
  it is brow, cheekbone and jaw *catching light* out of small deep hollows.
  Two big round sockets with a rim of light in them is a pumpkin.
- **A mouth curve bowed the wrong way.** A quadratic whose control point
  sits below its endpoints draws a smile. On anything meant to be grim, put
  the corners below the middle — a smiling gaunt face is a party mask.
- **Vertex colours are read as linear.** Bake shading into a colour
  attribute and a value of 0.6 leaves the screen at about 0.8, so a careful
  falloff comes out as one flat marshmallow. Square it on the way in.
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
   `src/themes/haunted-hollow/props/Pumpkin.tsx`.
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

## Some things only the tests catch

The renders are for how it looks. A couple of classes of bug are invisible
in a still and obvious in a unit test, so pin them there:

- **A pose that oversteps the clearance it was sized against.** If a figure
  is allowed to come "up to the glass" at `z = 1`, and the gap to whatever
  is in front of it was measured off exactly that, then a lean that takes
  `z` to 1.06 puts it through. Assert the range.
- **Two phases of an animation that do not meet.** An approach that ends at
  one value and a hold that starts at another snaps by the difference on a
  single frame, which no still will ever show. Walk the whole pass at a few
  hundred steps and assert nothing moves more than a frame's worth between
  adjacent samples.

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
