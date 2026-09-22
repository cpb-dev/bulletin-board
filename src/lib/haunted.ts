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

/** How long the zombie hand takes to rise, grasp and sink back. */
export const ZOMBIE_HAND_DURATION = 2.6;

/**
 * The hand's pose `p` of the way through its animation (0..1):
 * bursts up out of the soil, gropes around, then sinks back.
 *
 * `y` is metres above the grave (negative = still buried), `grasp`
 * drives the finger curl, `lean` is a slow sway while it's up.
 */
export function zombieHandPose(p: number): {
  y: number;
  grasp: number;
  lean: number;
} {
  if (p <= 0 || p >= 1) return { y: -0.45, grasp: 0, lean: 0 };

  const BURST_END = 0.22;
  const SINK_START = 0.72;

  let y: number;
  if (p < BURST_END) {
    // fast punch up out of the ground, easing out at the top
    const e = p / BURST_END;
    y = -0.45 + (1 - (1 - e) * (1 - e)) * 0.85;
  } else if (p < SINK_START) {
    // hovering, with a small unsettled drift
    y = 0.4 + Math.sin((p - BURST_END) * 9) * 0.04;
  } else {
    // slow, reluctant retreat
    const e = (p - SINK_START) / (1 - SINK_START);
    y = 0.4 - e * e * 0.85;
  }

  const up = p > BURST_END && p < SINK_START;
  return {
    y,
    grasp: up ? (Math.sin((p - BURST_END) * 11) * 0.5 + 0.5) * 0.9 : 0,
    lean: up ? Math.sin((p - BURST_END) * 4) * 0.25 : 0,
  };
}

/** How long a spider's dart between two points takes, in seconds. */
export const SPIDER_DART_DURATION = 0.32;

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
 * Where a spider sits along its thread at time `t`, as 0..1.
 *
 * Each `cycle` is one fast dart to the next waypoint followed by a
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
