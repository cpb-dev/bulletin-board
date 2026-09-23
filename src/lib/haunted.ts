/**
 * The front door of the haunted house, and the wind that works it.
 *
 * Pure so the easing can be unit-tested; the mesh lives in
 * `props/HauntedHouse.tsx`. Same split as crab.ts does for the Beach
 * Hut. The spiders moved to `spider.ts` and the ghosts to `ghost.ts`
 * as each grew past a couple of functions; this is what is left.
 */

/** How far the front door can swing open, in radians (~75°). */
export const DOOR_MAX_SWING = 1.3;

/**
 * How far the front door stands open at time `t`, in radians.
 *
 * The wind does the work: three waves at frequencies that never line
 * up, so the door never settles into a rhythm. Only the pushing half
 * of that moves it — gravity and the frame bring it back.
 *
 * Two things stop it being dull. The frame is long past square, so the
 * door never quite shuts: it hangs a few degrees ajar and breathes,
 * which means there is always something moving to catch. And the gust
 * is raised to a power, so the wide swings stay occasional — roughly
 * one every fifteen seconds — rather than the door flapping.
 *
 * Always between 0 and `DOOR_MAX_SWING`: a negative angle would swing
 * the leaf through the wall.
 */
export function doorSwing(t: number, seed = 0): number {
  const s = seed * 1.7;
  const gust =
    Math.sin(t * 0.33 + s) * 0.5 +
    Math.sin(t * 0.79 + s * 2.1) * 0.32 +
    Math.sin(t * 1.61 + s * 3.7) * 0.18;
  const push = Math.max(0, gust);
  const ajar = 0.07 + Math.sin(t * 1.9 + s) * 0.045;
  return Math.min(DOOR_MAX_SWING, ajar + push ** 1.6 * (DOOR_MAX_SWING - 0.12));
}
