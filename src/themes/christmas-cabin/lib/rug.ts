/**
 * The Christmas Cabin's rug (BB-35): a big Nordic Fair Isle knit rug in
 * front of the board. Its pattern is in `fairisle.ts`; this is its size
 * and place.
 */

export const RUG = {
  /** Size on the floor, in world units. */
  width: 3.8,
  depth: 2.6,
  /** Centre on the floor, in front of the board. */
  x: 0,
  z: 0.55,
  /** How thick it stands off the floor. */
  thickness: 0.022,
} as const;
