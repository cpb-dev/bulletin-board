/**
 * Leaves coming down over the square.
 *
 * Each leaf lets go somewhere under a crown, sways and tumbles on the
 * way down, lies on the grass for a while, and then quietly goes —
 * shrinking away rather than vanishing, so nobody catches one blink
 * out — before letting go again from a new spot on the next cycle.
 *
 * Pure so it can be tested without a renderer; the instanced mesh in
 * `props/FallingLeaves.tsx` reads a pose per leaf per frame.
 */

import { rng } from "./tree";

export interface LeafSource {
  x: number;
  z: number;
  /** Height the leaf lets go from. */
  y: number;
  /** Radius around (x, z) it can start from. */
  spread: number;
}

export interface Leaf {
  source: LeafSource;
  seed: number;
  /** Seconds into its cycle at t = 0, so they don't all fall together. */
  offset: number;
  /** Metres per second, on the way down. */
  speed: number;
  /** Seconds lying on the ground. */
  rest: number;
  /** Sideways sway, metres. */
  sway: number;
  /** Sway cycles per second. */
  swayRate: number;
  /** Tumble, radians per second. */
  spin: number;
}

export interface LeafPose {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
  /** 0 hidden to 1 full size. */
  scale: number;
}

/** How long a leaf takes to shrink away, and to appear, in seconds. */
export const FADE = 0.6;
/** Height the leaf lies at on the grass, so it doesn't z-fight it. */
export const REST_Y = 0.015;

export function makeLeaves(sources: LeafSource[], count: number, seed = 1): Leaf[] {
  const rand = rng(seed);
  const leaves: Leaf[] = [];
  for (let i = 0; i < count; i++) {
    leaves.push({
      source: sources[i % sources.length],
      seed: Math.floor(rand() * 1e6),
      offset: rand() * 40,
      speed: 0.35 + rand() * 0.35,
      rest: 3 + rand() * 5,
      sway: 0.25 + rand() * 0.45,
      swayRate: 0.25 + rand() * 0.3,
      spin: 0.8 + rand() * 1.8,
    });
  }
  return leaves;
}

/** Length of one leaf's full cycle: fall, lie, fade. */
export function cycleLength(leaf: Leaf): number {
  return leaf.source.y / leaf.speed + leaf.rest + FADE;
}

/** Where a leaf is at time `t`, in seconds. */
export function leafPose(leaf: Leaf, t: number): LeafPose {
  const T = cycleLength(leaf);
  const local = t + leaf.offset;
  const cycle = Math.floor(local / T);
  const u = local - cycle * T;

  // A fresh starting spot each cycle, from the leaf's seed and the
  // cycle number, so a leaf doesn't land in the same place forever.
  const r = rng(leaf.seed + cycle * 131);
  const a = r() * Math.PI * 2;
  const d = Math.sqrt(r()) * leaf.source.spread;
  const x0 = leaf.source.x + Math.cos(a) * d;
  const z0 = leaf.source.z + Math.sin(a) * d;
  const drift = r() * Math.PI * 2;

  const fallTime = leaf.source.y / leaf.speed;
  // Time spent falling — frozen once it has landed, so it lies where
  // it landed rather than sliding along the grass.
  const f = Math.min(u, fallTime);
  const w = f * leaf.swayRate * Math.PI * 2;
  // The sway builds from nothing: a leaf that has just let go hasn't
  // started swinging yet, which also means it starts exactly at its
  // spot.
  const swing = Math.sin(w) * leaf.sway * Math.min(1, f / 1.2);
  const x = x0 + Math.cos(drift) * swing + Math.sin(drift) * f * 0.12;
  const z = z0 + Math.sin(drift) * swing - Math.cos(drift) * f * 0.12;
  const y = Math.max(REST_Y, leaf.source.y - leaf.speed * f);

  // Tumbling while it falls, settling flat over its last half metre —
  // blended rather than switched, so it never snaps flat on landing.
  const land = Math.min(1, Math.max(0, (REST_Y + 0.5 - y) / 0.5));
  const tumble = Math.sin(w * 0.9) * 0.9 + 0.2;
  const rx = tumble + (-Math.PI / 2 - tumble) * land;
  const rz = f * leaf.spin;
  const ry = drift + Math.cos(w) * 0.6 * (1 - land);

  let scale = 1;
  if (u < FADE) scale = u / FADE;
  const gone = fallTime + leaf.rest;
  if (u > gone) scale = Math.max(0, 1 - (u - gone) / FADE);

  return { x, y, z, rx, ry, rz, scale };
}
