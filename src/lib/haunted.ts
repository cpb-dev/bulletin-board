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

/** How long a spider's dart between two points takes, in seconds. */
export const SPIDER_DART_DURATION = 0.5;

/**
 * A deterministic 0..1 waypoint for spider `seed` at step `i`. Hashed
 * rather than sequenced so any frame can be evaluated on its own —
 * no per-frame state to drift out of sync.
 */
export function spiderWaypoint(seed: number, i: number): number {
  let h = (Math.imul(seed, 374761393) + Math.imul(i, 668265263)) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Where a spider sits along one axis at time `t`, as 0..1.
 *
 * Each `cycle` is one dart to the next waypoint followed by a
 * stillness — spiders skitter and freeze, they don't glide.
 */
export function spiderProgress(
  t: number,
  seed: number,
  cycle: number
): number {
  if (cycle <= 0) return spiderWaypoint(seed, 0);
  const step = Math.floor(t / cycle);
  const from = spiderWaypoint(seed, step);
  const to = spiderWaypoint(seed, step + 1);
  const local = (t - step * cycle) / SPIDER_DART_DURATION;
  if (local >= 1) return to; // arrived — hold still until the next cycle
  const e = local * local * (3 - 2 * local); // smoothstep dart
  return from + (to - from) * e;
}

/**
 * Salt that gives a spider's vertical path its own waypoint sequence.
 * Without it both axes would share a sequence and every spider would
 * crawl the board's diagonal.
 */
const SPIDER_Y_SALT = 0x5bf0;

/**
 * A spider's position on the board at time `t`, as 0..1 on each axis.
 *
 * Both axes advance on the same cycle, so each dart is a single move to
 * a new spot rather than two independent slides — the spider picks a
 * corner, scurries there, freezes, then picks another.
 */
export function spiderPoint(
  t: number,
  seed: number,
  cycle: number
): { x: number; y: number } {
  return {
    x: spiderProgress(t, seed, cycle),
    y: spiderProgress(t, (seed + SPIDER_Y_SALT) | 0, cycle),
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
