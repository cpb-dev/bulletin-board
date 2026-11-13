/**
 * The Christmas tree's insides (BB-35): its branches, its string of
 * lights and how they twinkle, and where its baubles hang. Pure, so it's
 * tested without a renderer; the meshes just read from here.
 *
 * Coordinates are the tree's own: y up from the floor, x/z out from the
 * trunk. The outline it fills is `treeRadiusAt` in `layout.ts`.
 */

import { mulberry32 } from "@/components/three/textures";
import { TREE, TREE_SKIRT_Y, treeRadiusAt } from "./layout";

// ---- branches ---------------------------------------------------------------

export interface Branch {
  /** Where it leaves the trunk. */
  y: number;
  /** Which way it points round the trunk, and how far it droops (radians). */
  yaw: number;
  droop: number;
  /** How long it is, and how wide its spray of needles. */
  length: number;
  width: number;
  /** A per-branch shade: -1 darker .. 1 lighter. */
  tone: number;
}

/** Height between whorls of branches. */
export const WHORL_GAP = 0.085;

/**
 * Whorls of branches up the trunk, the way a fir grows: a ring every
 * WHORL_GAP, more branches in the wide lower rings, each ring turned by
 * the golden angle so the gaps never line up. Lower branches are longer
 * and droop more; every tip lands on the tree's outline.
 */
export function branches(seed = 3): Branch[] {
  const r = mulberry32(seed);
  const out: Branch[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  let ring = 0;
  for (let y = TREE_SKIRT_Y + 0.04; y < TREE.height - 0.12; y += WHORL_GAP, ring++) {
    const reach = treeRadiusAt(y);
    const k = reach / TREE.radius; // 1 at the bottom, ~0 at the tip
    const count = Math.max(7, Math.round(8 + 12 * k));
    for (let i = 0; i < count; i++) {
      const droop = 0.12 + 0.38 * k + (r() - 0.5) * 0.1;
      // Long enough that the tip, drooped, reaches the outline at its height.
      const length = (reach * (0.92 + r() * 0.12)) / Math.cos(droop);
      out.push({
        y,
        yaw: ring * golden + (i / count) * Math.PI * 2 + (r() - 0.5) * 0.25,
        droop,
        length,
        width: Math.max(0.16, length * 0.72),
        tone: r() * 2 - 1,
      });
    }
  }
  return out;
}

/** Where a branch's tip is, in the tree's own space. */
export function branchTip(b: Branch): { x: number; y: number; z: number } {
  const reach = b.length * Math.cos(b.droop);
  return {
    x: Math.cos(b.yaw) * reach,
    y: b.y - b.length * Math.sin(b.droop),
    z: Math.sin(b.yaw) * reach,
  };
}

// ---- lights -----------------------------------------------------------------

export const LIGHTS = { count: 150, turns: 8, inset: 0.86 } as const;

export interface Light {
  x: number;
  y: number;
  z: number;
}

/**
 * The string of lights, wound round the tree from just above the bottom
 * whorl to just under the star, a little inside the outline so the
 * branches half-cover them — the way real lights sit in a tree. Spaced
 * evenly along the wire.
 */
export function lightString(): Light[] {
  const bottom = TREE_SKIRT_Y + 0.12;
  const top = TREE.height - 0.22;
  // Sample the spiral finely, then walk it placing bulbs at equal spacing.
  const fine: Light[] = [];
  const steps = 4000;
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    const y = bottom + (top - bottom) * u;
    const a = u * LIGHTS.turns * Math.PI * 2;
    const rad = treeRadiusAt(y) * LIGHTS.inset;
    fine.push({ x: Math.cos(a) * rad, y, z: Math.sin(a) * rad });
  }
  const lengths = [0];
  for (let i = 1; i < fine.length; i++) {
    const a = fine[i - 1];
    const b = fine[i];
    lengths.push(lengths[i - 1] + Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z));
  }
  const total = lengths[lengths.length - 1];
  const out: Light[] = [];
  let j = 0;
  for (let k = 0; k < LIGHTS.count; k++) {
    const want = (k / (LIGHTS.count - 1)) * total;
    while (j < lengths.length - 1 && lengths[j + 1] < want) j++;
    out.push(fine[j]);
  }
  return out;
}

/**
 * How bright light `i` is at time t, 0.15..1: a slow swell and fade,
 * each bulb on its own 3–7 second rhythm so they never pulse together.
 * Smooth — a twinkle, not a blink.
 */
export function twinkle(i: number, t: number): number {
  const r = mulberry32(5000 + i);
  const period = 3 + r() * 4;
  const phase = r() * Math.PI * 2;
  const depth = 0.35 + r() * 0.5;
  const wave = 0.5 + 0.5 * Math.sin((t / period) * Math.PI * 2 + phase);
  return 1 - depth * wave;
}

// ---- baubles ------------------------------------------------------------------

export interface Bauble {
  x: number;
  y: number;
  z: number;
  size: number;
  color: string;
}

const BAUBLE_COLOURS = ["#b3202a", "#d9a63a", "#efe2c8", "#2f5a3a", "#8a1c24", "#c9b07a"];

/**
 * Baubles hung on the branch tips, spread over the tree by a golden
 * spiral (no clumps, no bare patches), a touch inside the outline so
 * they hang among the needles. Smaller towards the top.
 */
export function baubles(count = 34, seed = 9): Bauble[] {
  const r = mulberry32(seed);
  const golden = Math.PI * (3 - Math.sqrt(5));
  const bottom = TREE_SKIRT_Y + 0.15;
  const top = TREE.height - 0.35;
  return Array.from({ length: count }, (_, i) => {
    const u = (i + 0.5) / count;
    const y = bottom + (top - bottom) * Math.sqrt(u) ** 1.2;
    const a = i * golden;
    const rad = treeRadiusAt(y) * 0.92;
    const k = treeRadiusAt(y) / TREE.radius;
    return {
      x: Math.cos(a) * rad,
      y,
      z: Math.sin(a) * rad,
      size: 0.035 + 0.035 * k + r() * 0.01,
      color: BAUBLE_COLOURS[Math.floor(r() * BAUBLE_COLOURS.length)],
    };
  });
}
