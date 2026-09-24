# Design notes 🎨

## Art direction

The reference points were Animal Crossing and Stardew Valley: soft,
rounded, warm, a little handmade. Concretely that became:

- **Toon shading** (`MeshToonMaterial` with a 3-step gradient map) on
  the room and props — flat, friendly colour with just enough light
  response to feel 3D.
- **Chunky primitives, no realism.** The lamp is a cone, the plant is a
  pot of icosahedrons. Wonky-on-purpose reads as cute; high-poly reads
  as uncanny.
- **Handwriting everywhere.** Notes and captions render in Patrick Hand
  (drawn onto canvas textures so they're crisp at any zoom); UI chrome
  uses Quicksand, a soft rounded sans.
- **Motion = life.** The camera bobs slightly as you "walk up", sways
  with your pointer, papers tilt at random angles, fairy lights drape
  across the board. Nothing is ever perfectly still or perfectly straight.

## The interaction model

One room, one board, two distances:

1. **Room view** — you're standing back. The whole scene breathes;
   tapping the board (or the button) walks you up, aimed at the spot
   you tapped.
2. **Board view** — you're nose-to-cork. Drag empty cork to slide along
   the board, pinch/scroll to lean in, drag a note to re-pin it, tap a
   note to read/edit it, step back when you're done.

Adding things intentionally happens in 2D bottom sheets (typing in 3D
is misery on a phone); the moment you pin, the camera swings to where
the new item landed on the board.

**Add vs Edit (v2).** The bottom bar now separates *making* from
*arranging*. **➕ Add** opens a little Note/Photo chooser; **✏️ Edit**
flips into edit mode, where notes show a selection outline and a corner
handle — drag the body to move, pull the handle to resize — with a clear
**✓ Done** to leave. Outside edit mode, dragging only ever pans the
board and a tap opens a note to read, so zooming never "grabs" a note by
accident. Standing back in the room, you can now **drag to look around**
before walking up.

New items pick their own spot with `suggestPlacement` — it samples
candidate positions and keeps the one furthest from existing pins, so
the board fills up organically like a real corkboard instead of
stacking in the middle.

## Themes

A theme is a full redecoration: room colours, board frame and cork,
lighting temperature, pin colours, the four note-paper colours, the
garland colour, the set dressing (books / bunting / stars / flowers)
and the 2D UI palette. Each lives in its own folder under `src/themes/`:
`palette.ts` is the typed object, `index.ts` bridges it to the scene and
board decor it renders with.

The picker groups them: **Everyday** (Cozy Cabin, Peach Parfait, Midnight
Picnic, Sage Meadow, Summer House), **Special** (World Cup, Rose Picnic)
**Seasonal** (Haunted Hollow, Beach Hut) and **TV** (Stars Hollow). A theme
names its own group in its palette.

| Theme | Mood |
| --- | --- |
| 🪵 Cozy Cabin | warm wood, lamplight, gingham-red accents |
| 🍑 Peach Parfait | pastel pink cottage, white frame, bunting |
| 🌙 Midnight Picnic | navy night, stars, a moon, gold fairy lights |
| 🌼 Sage Meadow | soft green, daisies on the floor, honey tones |
| 🌻 Summer House | sunlit blue & white; a garden through the window and a pink/white flower bush |
| 🏖️ Beach Hut | a whole outdoor scene — see below |
| ☕ Stars Hollow | the Gilmore Girls town square in October — see below |

Themes carry small optional flags so a single `Room` can restyle itself:
`wallStyle: "logs"` + `roomFeature: "fireplace"` give **Cozy Cabin** its
log walls and an animated, smoking fireplace with a chimney to the
ceiling (in place of the window); `windowView: "garden"` paints a sunny
garden in the window and `plantStyle: "flowerbush"` swaps the pot plant
for a blossoming bush (**Summer House**). A theme that exports a
`BoardDecor` strings that across the board top instead of fairy lights —
Beach Hut's seashells, World Cup's footballs, Rose Picnic's hearts,
Haunted Hollow's cobwebs.

A theme's module names its own `Scene`, which is how **Beach Hut** swaps
the indoor room entirely for its own environment
(`src/themes/beach-hut/BeachScene.tsx`): a bright daytime
gradient sky with drifting clouds, the board on a wooden easel in the
sand, a vertex-animated sea rolling in with foam crests, a sandcastle,
`useFrame`-driven gulls, and **tappable crabs** — poke one for a random
reaction from a pool of eight (hop, spin, scuttle, wave, dig, bubble,
hearts, shake), never repeating the last, so it feels alive. New scenes
plug in by branching on `theme.scene` in `BoardExperience`.

## Tone of voice

Lowercase, gentle, a bit silly: "pin it to the board 📌", "the board is
feeling a little empty…", "really take it down?", "tucking it away…".
Errors never blame anyone and always suggest the next step. This is an
app two people in love open every day — it should sound like that.

## Personalisation hooks

- The app name (`NEXT_PUBLIC_APP_NAME`) appears in the HUD, on the
  login screen and on your home screens.
- Display names are chosen at signup and shown on every pinned item
  ("pinned by Kalli · 12 Jun 2026").
- The icon set is generated by a script you control — change the
  colours in `scripts/generate-icons.mjs` and re-run it.

## Stars Hollow ☕

The board stands on the green of the town square from *Gilmore Girls*, in
October. The town sign — white posts with ball finials, a scrolled
pediment, lattice, and STARS HOLLOW · FOUNDED 1779 in cream on cornflower
blue — stands just off the board's left edge, with the gazebo behind it:
red brick base, slim columns, X-braced railings, a dentilled cornice and a
cupola. Main Street runs away on the right with **Luke's** on the corner:
the old WILLIAMS HARDWARE fascia, gingham café curtains on brass rails,
fairy lights round the windows, "Food" in the glass and the yellow cup
sign on its scroll bracket. Doose's, the antiques shop, the bookshop and
the rest line the street beyond; the church spire, the town hall and Miss
Patty's show over the top of the board.

Autumn without pumpkins: maples turning red and gold, a sycamore nearly
bare, leaves on the grass and in raked heaps and drifting down all the
time, corn stalks tied to posts and lamps, hay bales, pots of mums, leaf
garlands wound up the gazebo's columns — and one across the top of the
board, with warm bulbs threaded through it.

It is built like Haunted Hollow: `src/themes/stars-hollow/` holds the
scene, a prop per file under `props/`, and the plan of the town
(`lib/layout.ts`), the trees, the falling leaves and the static batching
under `lib/`, each unit-tested. The buildings are modelled as many small
painted pieces for the joinery to read, then welded by material once they
have mounted (`lib/batch.ts`), which keeps the whole town to fewer draw
calls than the Haunted Hollow.
