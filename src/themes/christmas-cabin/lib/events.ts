/**
 * Little things that happen outside the Christmas Cabin's window, now and
 * then (BB-35): a snowball splatting on the glass, a cardinal landing on
 * the sill, Santa's sleigh crossing the sky, a shooting star.
 *
 * The schedule is seeded, so it's random-looking but tested. Each event's
 * motion is a pure function of how far through it is. The meshes just
 * read from here.
 */

import { mulberry32 } from "@/components/three/textures";
import type { DayPhase } from "@/lib/day-cycle";
import { SNOW_WINDOW } from "./layout";
import { alongRay, GLASS_Z, onGlass, type V3, WALL_OUT_Z } from "./outdoor";

export type EventKind = "snowball" | "bird" | "sleigh" | "shootingStar";

/** How long each lasts, in seconds. */
export const DURATION: Record<EventKind, number> = {
  snowball: 10,
  bird: 8,
  sleigh: 9,
  shootingStar: 1.6,
};

/** How likely each is, by the part of the day. Zero: never then. */
export const WEIGHTS: Record<DayPhase, Partial<Record<EventKind, number>>> = {
  day: { snowball: 0.55, bird: 0.45 },
  evening: { snowball: 0.4, bird: 0.15, sleigh: 0.25, shootingStar: 0.2 },
  night: { snowball: 0.3, sleigh: 0.35, shootingStar: 0.35 },
};

/** The first event comes soon after load; then a pause between each. */
export const TIMING = { firstMin: 6, firstMax: 14, gapMin: 18, gapMax: 50 } as const;

export interface ScheduledEvent {
  kind: EventKind;
  start: number;
  duration: number;
  /** A per-event seed for where exactly it happens. */
  seed: number;
}

/** Every event that starts before `until` seconds, in order. */
export function scheduleEvents(phase: DayPhase, seed: number, until: number): ScheduledEvent[] {
  const r = mulberry32(seed);
  const weights = Object.entries(WEIGHTS[phase]) as [EventKind, number][];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  const out: ScheduledEvent[] = [];
  let t = TIMING.firstMin + r() * (TIMING.firstMax - TIMING.firstMin);
  while (t < until) {
    let pick = r() * total;
    let kind = weights[0][0];
    for (const [k, w] of weights) {
      if (pick < w) {
        kind = k;
        break;
      }
      pick -= w;
    }
    const ev = { kind, start: t, duration: DURATION[kind], seed: Math.floor(r() * 1e9) };
    out.push(ev);
    t += ev.duration + TIMING.gapMin + r() * (TIMING.gapMax - TIMING.gapMin);
  }
  return out;
}

/** The event under way at time t, and how far through it is (0..1). */
export function eventAt(schedule: ScheduledEvent[], t: number): { event: ScheduledEvent; p: number } | null {
  for (const e of schedule) {
    if (t >= e.start && t < e.start + e.duration) return { event: e, p: (t - e.start) / e.duration };
    if (e.start > t) break;
  }
  return null;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const smooth = (x: number) => {
  const t = clamp01(x);
  return t * t * (3 - 2 * t);
};

// ---- snowball -------------------------------------------------------------

/** Flight is this fraction of the snowball event; the rest is the splat. */
export const SNOWBALL_FLIGHT = 0.09;

/** Where on the glass a snowball lands, kept clear of the frame. */
export function snowballTarget(seed: number): { u: number; v: number } {
  const r = mulberry32(seed);
  return { u: 0.2 + r() * 0.6, v: 0.3 + r() * 0.5 };
}

export interface Snowball {
  /** The ball in flight, or null once it's hit. */
  ball: V3 | null;
  /** The splat on the glass: its spot, size (0..1) and opacity. */
  splat: { u: number; v: number; size: number; opacity: number; slide: number } | null;
  /** Bits of snow bursting off it, as a 0..1 progress, or null. */
  burst: number | null;
}

/**
 * A snowball thrown from out in the yard: it arcs up and in, hits the
 * glass, bursts, and leaves a splat that holds, then slides down a
 * touch and melts away.
 */
export function snowball(p: number, seed: number): Snowball {
  const r = mulberry32(seed + 1);
  const target = snowballTarget(seed);
  const hit = onGlass(target.u, target.v);
  if (p < SNOWBALL_FLIGHT) {
    const f = p / SNOWBALL_FLIGHT;
    // Thrown from about 9 m out, a little to the side, from about head
    // height on the slope; on an arc that tops out above the line.
    const from = alongRay(target.u + (r() - 0.5) * 0.6, -0.15, 9);
    const arc = Math.sin(f * Math.PI) * 0.9;
    return {
      ball: { x: lerp(from.x, hit.x, f), y: lerp(from.y, hit.y, f) + arc, z: lerp(from.z, hit.z - 0.01, f) },
      splat: null,
      burst: null,
    };
  }
  const after = (p - SNOWBALL_FLIGHT) / (1 - SNOWBALL_FLIGHT);
  const pop = smooth(after / 0.025);
  const melt = smooth((after - 0.62) / 0.38);
  return {
    ball: null,
    splat: {
      u: target.u,
      v: target.v,
      size: 0.6 + 0.4 * pop,
      opacity: 1 - melt,
      slide: melt * 0.1,
    },
    burst: after < 0.06 ? after / 0.06 : null,
  };
}

// ---- the cardinal ---------------------------------------------------------

/**
 * The snowy ledge outside, where the cardinal perches: its top stands
 * just above the frame's bottom rail inside (which hides the lowest
 * 6 cm of the glass), so a bird on it is seen.
 */
export const OUTSIDE_SILL = {
  y: SNOW_WINDOW.y - SNOW_WINDOW.height / 2 + 0.07,
  z: (GLASS_Z + WALL_OUT_Z) / 2 - 0.05,
} as const;

export interface BirdPose {
  pos: V3;
  /** Which way it faces: +1 flying/hopping to the right, -1 left. */
  facing: number;
  /** Wing angle: 0 folded, up to ~1 spread. */
  wings: number;
  /** A little head bob or tilt while it's perched. */
  peck: number;
}

/**
 * A cardinal swoops in from one side, lands on the snowy sill outside
 * the glass, looks about and hops along it, then flies off the other
 * way. Seen through the bottom of the window.
 */
export function bird(p: number, seed: number): BirdPose {
  const r = mulberry32(seed + 2);
  const dir = r() < 0.5 ? 1 : -1;
  const { x, width } = SNOW_WINDOW;
  const land = x + (r() - 0.5) * width * 0.5;
  const hopTo = land + dir * 0.18;
  const outX = (side: number) => x + side * (width / 2 + 1.5);
  const z = OUTSIDE_SILL.z;
  const perchY = OUTSIDE_SILL.y;
  const flap = (t: number) => 0.6 + 0.4 * Math.sin(t * 60);

  if (p < 0.2) {
    // In from the side, gliding down onto the sill.
    const f = smooth(p / 0.2);
    return {
      pos: { x: lerp(outX(-dir), land, f), y: perchY + (1 - f) * 0.7 + Math.sin(f * Math.PI) * 0.15, z },
      facing: dir,
      wings: f < 0.95 ? flap(p) : 0,
      peck: 0,
    };
  }
  if (p < 0.8) {
    // Perched: looks about, hops once along the sill, looks again.
    const f = (p - 0.2) / 0.6;
    const hop = smooth((f - 0.45) / 0.1);
    const hopUp = Math.sin(clamp01((f - 0.45) / 0.1) * Math.PI) * 0.06;
    return {
      pos: { x: lerp(land, hopTo, hop), y: perchY + hopUp, z },
      facing: dir,
      wings: 0,
      peck: Math.sin(f * 14) * 0.5 * (f < 0.4 || f > 0.6 ? 1 : 0),
    };
  }
  // Off and away the other side, climbing.
  const f = smooth((p - 0.8) / 0.2);
  return {
    pos: { x: lerp(hopTo, outX(dir), f), y: perchY + f * f * 1.2, z },
    facing: dir,
    wings: flap(p),
    peck: 0,
  };
}

// ---- Santa's sleigh ---------------------------------------------------------

/** How far off the sleigh flies, so it reads as a small shape in the sky. */
export const SLEIGH_DEPTH = 55;

export interface SleighPose {
  pos: V3;
  /** Its heading across the view: +1 to the right, -1 to the left. */
  dir: number;
  /** A gentle bank and bob. */
  bank: number;
}

/** Santa's sleigh crossing the sky, high in the window, on a shallow arc. */
export function sleigh(p: number, seed: number): SleighPose {
  const r = mulberry32(seed + 3);
  const dir = r() < 0.5 ? 1 : -1;
  const u = dir > 0 ? lerp(-0.4, 1.4, p) : lerp(1.4, -0.4, p);
  const v = 0.72 + 0.12 * Math.sin(p * Math.PI) + r() * 0.08;
  return { pos: alongRay(u, v, SLEIGH_DEPTH), dir, bank: Math.sin(p * Math.PI * 3) * 0.08 };
}

// ---- shooting star ------------------------------------------------------------

export const STAR_DEPTH = 85;

/**
 * A shooting star: its head races across the upper sky on a slight
 * downward slant, its tail trailing, brightening then fading.
 */
export function shootingStar(p: number, seed: number): { head: V3; tail: V3; glow: number } {
  const r = mulberry32(seed + 4);
  const u0 = 0.1 + r() * 0.5;
  const v0 = 0.95 + r() * 0.1;
  const along = (q: number) => alongRay(u0 + q * 0.55, v0 - q * 0.3, STAR_DEPTH);
  const head = smooth(p);
  return { head: along(head), tail: along(Math.max(0, head - 0.22)), glow: Math.sin(clamp01(p) * Math.PI) };
}
