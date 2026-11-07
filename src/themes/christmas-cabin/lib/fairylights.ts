/**
 * Fairy lights swagged along the top of the walls (BB-35). Warm bulbs on
 * a cable that hangs in shallow loops between hooks just under the
 * ceiling. Pure, so the swag's shape is tested without a renderer.
 */

import { ROOM } from "./layout";

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** How far each loop drops, the hook spacing and the bulb spacing. */
export const SWAG = { drop: 0.16, hookEvery: 1.1, bulbEvery: 0.16, below: 0.32 } as const;

/** One wall's run of lights: from `a` to `b`, along the wall's face. */
function run(a: Vec3, b: Vec3): Vec3[] {
  const len = Math.hypot(b.x - a.x, b.z - a.z);
  const loops = Math.max(1, Math.round(len / SWAG.hookEvery));
  const bulbs = Math.round(len / SWAG.bulbEvery);
  return Array.from({ length: bulbs + 1 }, (_, i) => {
    const t = i / bulbs;
    // Within a loop, a parabola: 0 at the hooks, `drop` at the middle.
    const local = (t * loops) % 1;
    const sag = 4 * SWAG.drop * local * (1 - local);
    return { x: a.x + (b.x - a.x) * t, y: a.y - sag, z: a.z + (b.z - a.z) * t };
  });
}

/**
 * Bulb positions along the back wall and both side walls, just proud of
 * each wall, below the ceiling.
 */
export function fairyLightBulbs(): Vec3[] {
  const y = ROOM.height - SWAG.below;
  const off = 0.08;
  const back = ROOM.backZ + off;
  const left = -ROOM.halfWidth + off;
  const right = ROOM.halfWidth - off;
  const front = ROOM.frontZ - 1.5;
  return [
    ...run({ x: left, y, z: front }, { x: left, y, z: back }),
    ...run({ x: left, y, z: back }, { x: right, y, z: back }),
    ...run({ x: right, y, z: back }, { x: right, y, z: front }),
  ];
}
