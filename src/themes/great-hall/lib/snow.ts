/**
 * Snow from the enchanted ceiling (BB-38): flakes fall from just under
 * the ceiling, drifting, and melt away well above the candles, so the
 * snow never lands. Pure, so it's tested without a renderer.
 */

import { HALL } from "./layout";

export const SNOW = {
  count: 700,
  /** Where flakes appear and where they're gone. */
  top: HALL.height - 0.2,
  bottom: 5.4,
  /** Metres per second. */
  speed: 0.35,
  halfWidth: HALL.halfWidth - 0.6,
  minZ: HALL.backZ + 0.4,
  maxZ: 11,
} as const;

/** One flake at `t`: where it is and how visible (0..1). */
export function snowFlake(seed: { x: number; z: number; phase: number }, t: number) {
  const span = SNOW.top - SNOW.bottom;
  const fall = ((t * SNOW.speed) / span + seed.phase) % 1; // 0 at the top, 1 gone
  const y = SNOW.top - fall * span;
  const drift = 0.25 * Math.sin(t * 0.6 + seed.phase * 20);
  const x = (seed.x * 2 - 1) * SNOW.halfWidth + drift;
  const z = SNOW.minZ + seed.z * (SNOW.maxZ - SNOW.minZ) + 0.15 * Math.cos(t * 0.5 + seed.phase * 9);
  // Fade in under the ceiling, melt away towards the bottom.
  const alpha = Math.min(1, fall / 0.1) * Math.min(1, (1 - fall) / 0.45) * 0.9;
  return { x, y, z, alpha };
}
