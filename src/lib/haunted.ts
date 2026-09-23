/**
 * Timing and motion for the Haunted Hollow scene.
 *
 * Pure so the picker, the schedules and the easing can be unit-tested;
 * the meshes themselves live in HauntedScene / Board. Same split as
 * crab.ts does for the Beach Hut.
 */

/** How long one ghost takes to drift across a window, in seconds. */
export const GHOST_PASS_DURATION = 2.8;

/** Gap between a window's ghost sightings, in seconds. */
export const GHOST_GAP_MIN = 7;
export const GHOST_GAP_MAX = 17;

/**
 * When this window should next be haunted. Deliberately a wide random
 * gap: a ghost on a timer stops being a "did you just see that?" and
 * becomes wallpaper.
 */
export function nextGhostTime(now: number, rand: () => number = Math.random) {
  return now + GHOST_GAP_MIN + rand() * (GHOST_GAP_MAX - GHOST_GAP_MIN);
}

/**
 * A ghost's pose `p` of the way through its pass (0..1), as an offset
 * across the window in window-widths and an opacity. Returns null
 * outside the pass so callers can skip rendering entirely.
 */
export function ghostPass(
  p: number
): { x: number; opacity: number; bob: number } | null {
  if (p < 0 || p > 1) return null;
  return {
    // drifts from just off one edge to just off the other
    x: -0.6 + p * 1.2,
    // fades up and back down so it never pops in or out
    opacity: Math.sin(p * Math.PI) ** 1.5,
    bob: Math.sin(p * Math.PI * 3) * 0.05,
  };
}

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
