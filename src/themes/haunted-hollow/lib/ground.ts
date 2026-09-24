/**
 * The shape of the ground in Haunted Hollow, and what is scattered on it.
 *
 * Pure so the terrain and the scatter can be checked without a
 * renderer — in particular that the ground stays dead flat everywhere
 * the scene actually stands something, which is the property that
 * stops the graves and the house from floating.
 */

/** Local PRNG — keeps this file free of component imports. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Where the scene's props stand. Everything placed by HauntedScene —
 * the house at x -5.8, the furthest tree at z -11.8, the graves, the
 * board — sits inside this disc.
 */
export const STAGE_CENTRE = { x: 1, z: -5 };
/** Radius the ground is held perfectly flat. */
export const STAGE_FLAT = 16;
/** How far beyond that the undulation fades in. */
export const STAGE_FADE = 11;
/** Tallest the far ground ever rises or falls. */
export const GROUND_RELIEF = 0.95;

/**
 * Height of the ground at `x, z`.
 *
 * Zero across the whole stage, so nothing the scene places has to know
 * about the terrain, then rolling gently beyond it so the horizon is
 * not a ruled line. The fade is smoothstepped, so there is no crease
 * where the flat part ends.
 */
export function groundHeight(x: number, z: number): number {
  const d = Math.hypot(x - STAGE_CENTRE.x, z - STAGE_CENTRE.z);
  if (d <= STAGE_FLAT) return 0;
  const t = Math.min(1, (d - STAGE_FLAT) / STAGE_FADE);
  const ease = t * t * (3 - 2 * t);

  // Three wavelengths that don't divide into each other, so the relief
  // never repeats into a visible grid.
  const h =
    Math.sin(x * 0.083 + 1.7) * Math.cos(z * 0.067 - 0.4) * 0.6 +
    Math.sin(x * 0.041 - z * 0.055) * 0.28 +
    Math.cos(x * 0.137 + z * 0.111 + 2.2) * 0.12;

  return h * ease * GROUND_RELIEF;
}

export interface ScatterArea {
  x0: number;
  x1: number;
  z0: number;
  z1: number;
}

export interface Scattered {
  x: number;
  z: number;
  /** Radians about the vertical — litter lies flat, pointing anywhere. */
  rot: number;
  scale: number;
  /** 0..1, for picking a tint from a palette. */
  shade: number;
}

/**
 * Leaf litter, deterministically scattered over `area`.
 *
 * `clear` is a list of discs to stay out of — the foot of the board
 * posts, say, where a leaf lying half-inside a post reads as a bug.
 * Rejected points are re-rolled rather than pushed aside, so the
 * result stays evenly spread instead of ringing the obstacle.
 */
export function scatterLitter(
  seed: number,
  count: number,
  area: ScatterArea,
  clear: { x: number; z: number; r: number }[] = []
): Scattered[] {
  const rand = mulberry(seed * 2246822519 + 5);
  const out: Scattered[] = [];
  let guard = 0;

  while (out.length < count && guard < count * 40) {
    guard++;
    const x = area.x0 + rand() * (area.x1 - area.x0);
    const z = area.z0 + rand() * (area.z1 - area.z0);
    if (clear.some((c) => Math.hypot(x - c.x, z - c.z) < c.r)) continue;
    out.push({
      x,
      z,
      rot: rand() * Math.PI * 2,
      scale: 0.7 + rand() * 0.65,
      shade: rand(),
    });
  }

  return out;
}
