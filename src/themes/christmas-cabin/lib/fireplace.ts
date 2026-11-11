/**
 * The Christmas Cabin's fireplace (BB-35): its shape, and everything that
 * moves in it. The fire's flicker, the sparks, the smoke drawn up the
 * chimney, the double-tap that brings Santa's boots down, and how they
 * dangle. Plus the stone courses and the stocking's outline.
 *
 * All pure — time in seconds in, numbers out — so the behaviour is tested
 * without a renderer, and the meshes just read from here. Coordinates are
 * the fireplace's own: x across its face (0 at the middle), y up from the
 * floor, z out of the wall (0 at the middle of its depth).
 */

import { mulberry32 } from "@/components/three/textures";
import { FIREPLACE } from "./layout";

// ---- shape ----------------------------------------------------------------

/** The hearth slab, the opening, the lintel, the mantel and the breast. */
export const HEARTH = { height: 0.16, overhang: 0.25 } as const;
export const OPENING = { width: 1.2, bottom: HEARTH.height, top: 1.35 } as const;
export const LINTEL = { top: 1.6 } as const;
export const MANTEL = { y: 1.69, thickness: 0.17, depth: 0.42, overhang: 0.18 } as const;
export const BREAST = { width: 1.5, bottom: MANTEL.y + MANTEL.thickness / 2 } as const;
/** The firebox's back wall, recessed into the stone. */
export const FIREBOX_BACK_Z = -FIREPLACE.depth / 2 + 0.07;
/** The front face of the stone. */
export const FACE_Z = FIREPLACE.depth / 2;
/** Where the fire sits, and how high its tallest flame reaches. */
export const FIRE = { y: 0.24, z: -0.05, flameTop: 0.95 } as const;
/** Where smoke disappears up the flue: just inside the top of the opening. */
export const THROAT = { y: OPENING.top - 0.04, z: FIREBOX_BACK_Z + 0.12 } as const;

// ---- the fire's flicker -----------------------------------------------------

/**
 * How bright the fire is at time t, around 1: a slow breathing, a
 * quicker waver and a fast crackle. Sums of sines, so it's smooth (no
 * frame-to-frame jumps) yet never visibly repeats.
 */
export function flicker(t: number): number {
  return (
    1 +
    0.1 * Math.sin(t * 1.3) +
    0.07 * Math.sin(t * 3.7 + 1.1) +
    0.05 * Math.sin(t * 9.1 + 0.3) +
    0.03 * Math.sin(t * 17.3 + 2.2)
  );
}

// ---- sparks -------------------------------------------------------------------

export const SPARKS = { count: 28, life: 1.6 } as const;

export interface Spark {
  x: number;
  y: number;
  z: number;
  /** 0 when unborn or dead, up to 1 at its brightest. */
  glow: number;
}

/**
 * Spark `i` at time t. Each one loops: it spits up out of the logs,
 * slows as it rises, drifts and wavers, and fades before the opening's
 * top — so none ever floats out of the fireplace.
 */
export function spark(i: number, t: number): Spark {
  const r = mulberry32(1000 + i);
  const period = SPARKS.life * (0.7 + r() * 0.6);
  const offset = r() * period;
  const age = ((t + offset) % period) / period; // 0..1
  const x0 = (r() - 0.5) * OPENING.width * 0.55;
  const drift = (r() - 0.5) * 0.25;
  const rise = 0.45 + r() * 0.45;
  // Decelerating rise: fast off the fire, slowing as it cools.
  const h = rise * (1 - (1 - age) ** 2);
  const waver = Math.sin(age * 9 + i) * 0.03;
  const y = Math.min(FIRE.y + 0.15 + h, OPENING.top - 0.08);
  return {
    x: Math.max(-OPENING.width / 2 + 0.08, Math.min(OPENING.width / 2 - 0.08, x0 + drift * age + waver)),
    y,
    z: FIRE.z + (r() - 0.5) * 0.2,
    // Flares up, then fades.
    glow: Math.min(1, age * 8) * (1 - age) ** 1.5,
  };
}

// ---- smoke drawn up the chimney ---------------------------------------------

export const SMOKE = { count: 10, life: 3.2 } as const;

export interface Puff {
  x: number;
  y: number;
  z: number;
  scale: number;
  opacity: number;
}

/**
 * Smoke puff `i` at time t: rises off the flame tips, swells and drifts
 * back towards the flue as the chimney draws it, curling a little, and
 * fades into the throat at the top of the opening.
 */
export function smokePuff(i: number, t: number): Puff {
  const r = mulberry32(2000 + i);
  const offset = (i / SMOKE.count) * SMOKE.life + r() * 0.3;
  const age = ((t + offset) % SMOKE.life) / SMOKE.life;
  const start = FIRE.flameTop - 0.15;
  const y = start + (THROAT.y - start) * age;
  // Drawn back into the flue as it climbs.
  const z = FIRE.z + (THROAT.z - FIRE.z) * age ** 0.8;
  const x = (r() - 0.5) * 0.3 * (1 - age) + Math.sin(t * 0.9 + i * 1.7) * 0.06 * age;
  return {
    x,
    y,
    z,
    scale: 0.12 + age * 0.3,
    // Fades in off the flames, thins out into the throat.
    opacity: 0.32 * Math.min(1, age * 5) * (1 - age) ** 1.2,
  };
}

// ---- double tap -------------------------------------------------------------

/** Two taps this close together (seconds) are a double tap. */
export const DOUBLE_TAP = 0.45;

export interface TapState {
  /** When the last unpaired tap landed, or null. */
  last: number | null;
}

export const NO_TAPS: TapState = { last: null };

/**
 * Feed in each tap's time; it says when two have landed close enough to
 * count as a double tap. A third tap starts again rather than firing a
 * second time, and taps are ignored while `busy` (Santa's still out).
 */
export function registerTap(
  state: TapState,
  time: number,
  busy = false
): { state: TapState; double: boolean } {
  if (busy) return { state: NO_TAPS, double: false };
  if (state.last !== null && time - state.last <= DOUBLE_TAP && time >= state.last) {
    return { state: NO_TAPS, double: true };
  }
  return { state: { last: time }, double: false };
}

// ---- Santa's boots ------------------------------------------------------------

/** Down, dangling and kicking, then yanked back up — seconds each. */
export const SANTA = { down: 1.1, dangle: 3.6, up: 0.6 } as const;
export const SANTA_TOTAL = SANTA.down + SANTA.dangle + SANTA.up;

/** How tall a boot is, sole to cuff, and how far its soles hang out. */
export const BOOT = { height: 0.2 } as const;
/** Soles tucked up out of sight, and at their lowest when dangling. */
export const SOLE_HIDDEN = LINTEL.top + 0.05;
export const SOLE_LOWEST = FIRE.flameTop + 0.08;

export interface SantaPose {
  /** Height of the soles above the floor. */
  soleY: number;
  /** Each leg's swing about the hip, in radians: left, right. */
  swing: [number, number];
  /** False before and after: nothing to draw. */
  visible: boolean;
}

const easeOutBack = (x: number) => {
  // A little bounce at the bottom, like legs dropping onto their length.
  const c = 1.4;
  return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
};
const easeInQuad = (x: number) => x * x;

/**
 * Santa's boots `t` seconds after the double tap: lowered down the
 * chimney, dangling and kicking above the fire (never into it), then
 * yanked back up. Every phase meets the next without a jump.
 */
export function santaPose(t: number): SantaPose {
  if (t <= 0 || t >= SANTA_TOTAL) {
    return { soleY: SOLE_HIDDEN, swing: [0, 0], visible: false };
  }
  const span = SOLE_HIDDEN - SOLE_LOWEST;
  if (t < SANTA.down) {
    const k = easeOutBack(t / SANTA.down);
    // easeOutBack overshoots past 1: never let that take the boots lower.
    const soleY = Math.max(SOLE_LOWEST, SOLE_HIDDEN - span * k);
    return { soleY, swing: [0, 0], visible: true };
  }
  if (t < SANTA.down + SANTA.dangle) {
    const d = t - SANTA.down;
    // Swings build up and settle back, so the edges join the other phases.
    const env = Math.sin((d / SANTA.dangle) * Math.PI);
    const kick = (phase: number) =>
      env * (0.32 * Math.sin(d * 5.2 + phase) + 0.12 * Math.sin(d * 11.5 + phase * 2));
    // A small bob as he shifts his weight, also zero at the edges.
    const bob = env * 0.015 * Math.sin(d * 3.1);
    return { soleY: SOLE_LOWEST + bob, swing: [kick(0), kick(Math.PI * 0.85)], visible: true };
  }
  const u = (t - SANTA.down - SANTA.dangle) / SANTA.up;
  return { soleY: SOLE_LOWEST + span * easeInQuad(u), swing: [0, 0], visible: true };
}

// ---- stone courses ----------------------------------------------------------

export interface Stone {
  /** Centre of the stone on the face, and its size, in metres. */
  x: number;
  y: number;
  w: number;
  h: number;
  /** -1..1: lighter or darker than the average stone. */
  tone: number;
  /** Which of the stone colours it takes. */
  hue: number;
  seed: number;
}

/**
 * Lay a face `width` × `height` (centred on x = 0, from y = 0) in rough
 * courses of fieldstone: rows of varying height, stones of varying
 * width, each row's joints offset from the last, a mortar gap all round.
 * No stone overlaps another or pokes past the face's edges.
 */
export function stoneCourses(width: number, height: number, seed: number, gap = 0.018): Stone[] {
  const r = mulberry32(seed);
  const stones: Stone[] = [];
  let y = 0;
  while (y < height - 0.04) {
    let rowH = Math.min(height - y, 0.11 + r() * 0.08);
    // Don't leave a strip too thin for a stone: stretch the last course.
    if (height - (y + rowH) < 0.1) rowH = height - y;
    let x = -width / 2;
    // Start each course part-way into a stone, so joints don't stack.
    let first = true;
    while (x < width / 2 - 0.04) {
      const want = (first ? 0.08 + r() * 0.12 : 0.17 + r() * 0.16) * (rowH / 0.15);
      first = false;
      const w = Math.min(width / 2 - x, want);
      // Fold a sliver left at the end into the stone before it.
      if (width / 2 - (x + w) < 0.06 && x + w < width / 2) {
        const rest = width / 2 - x;
        stones.push(stone(x, y, rest, rowH));
        x = width / 2;
        break;
      }
      stones.push(stone(x, y, w, rowH));
      x += w;
    }
    y += rowH;
  }
  return stones;

  function stone(x: number, y: number, w: number, h: number): Stone {
    return {
      x: x + w / 2,
      y: y + h / 2,
      w: Math.max(0.01, w - gap),
      h: Math.max(0.01, h - gap),
      tone: r() * 2 - 1,
      hue: Math.floor(r() * 4),
      seed: Math.floor(r() * 1e9),
    };
  }
}

// ---- the stocking's outline ---------------------------------------------

/**
 * A stocking's silhouette, hung from its top-left corner at (0, 0) and
 * hanging down: a leg, a heel and a foot that points right (the toe).
 * In metres. Used to extrude the stocking's body.
 */
export function stockingOutline(): [number, number][] {
  return [
    [0, 0],
    [0.17, 0],
    [0.17, -0.27],
    // instep down to the toe
    [0.2, -0.32],
    [0.27, -0.35],
    [0.31, -0.39],
    [0.3, -0.44],
    // sole back to the heel
    [0.24, -0.47],
    [0.09, -0.47],
    [0.03, -0.45],
    [0, -0.4],
  ];
}
