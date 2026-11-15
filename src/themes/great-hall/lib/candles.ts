/**
 * The floating candles (BB-38): where they hang, how they bob, and how
 * their flames flicker. Seeded and pure, so it's tested without a
 * renderer, and every visit shows the same hall.
 */

import { mulberry32 } from "@/components/three/textures";
import { CANDLES, TREES } from "./layout";

export interface Candle {
  x: number;
  y: number;
  z: number;
  /** Candle height in metres: they've burned down by different amounts. */
  length: number;
  /** Phase offset, so they don't bob or flicker together. */
  phase: number;
}

/** Whether a point is inside or just above one of the trees. */
function inTree(x: number, y: number, z: number): boolean {
  return TREES.some((t) => Math.hypot(x - t.x, z - t.z) < t.radius + 0.4 && y < t.height + 0.5);
}

/** Every candle, scattered through the air above the tables. */
export function candles(seed = 38): Candle[] {
  const r = mulberry32(seed);
  const out: Candle[] = [];
  let guard = 0;
  while (out.length < CANDLES.count && guard++ < CANDLES.count * 20) {
    const x = (r() * 2 - 1) * CANDLES.halfWidth;
    const z = CANDLES.minZ + r() * (CANDLES.maxZ - CANDLES.minZ);
    const y = CANDLES.minY + r() * (CANDLES.maxY - CANDLES.minY);
    if (inTree(x, y, z)) continue;
    // Not too close to another, so they read as separate candles.
    if (out.some((c) => Math.hypot(c.x - x, c.y - y, c.z - z) < 0.55)) continue;
    out.push({ x, y, z, length: 0.16 + r() * 0.16, phase: r() * Math.PI * 2 });
  }
  return out;
}

/** How far a candle has bobbed from its resting height at `t` (metres). */
export function bob(c: Pick<Candle, "phase">, t: number): number {
  return 0.06 * Math.sin(t * 0.45 + c.phase) + 0.02 * Math.sin(t * 1.1 + c.phase * 1.7);
}

/** A flame's brightness at `t`: steady, with small quick flutters (0.7..1.1). */
export function flicker(c: Pick<Candle, "phase">, t: number): number {
  const a = Math.sin(t * 7.3 + c.phase * 3);
  const b = Math.sin(t * 13.1 + c.phase * 5.3);
  const s = Math.sin(t * 2.1 + c.phase);
  return 0.9 + 0.08 * a + 0.05 * b + 0.07 * s;
}
