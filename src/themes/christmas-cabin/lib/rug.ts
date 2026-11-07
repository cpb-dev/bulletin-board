/**
 * The Christmas Cabin's rug (BB-35): a Beni Ourain-style Berber wool
 * shag. A cream field with a hand-drawn lattice of diamonds in charcoal,
 * a few rust and green flecks, and knotted fringe at both ends.
 *
 * The pattern is computed here as plain numbers (in rug units, 0..1
 * each way) so it's tested without a canvas; the texture just draws it.
 */

import { mulberry32 } from "@/components/three/textures";

export const RUG = {
  /** Size on the floor, in world units. */
  width: 3.8,
  depth: 2.6,
  /** Centre on the floor, in front of the board. */
  x: 0,
  z: 0.55,
  /** Plain border round the lattice, as a fraction of each side. */
  border: 0.07,
  /** Diamonds across the rug's width. */
  diamonds: 5,
  /** Fringe tassels along each short end. */
  fringe: 64,
} as const;

export interface Point {
  u: number;
  v: number;
}

/**
 * The lattice's lines: zig-zags running the length of the rug that touch
 * at their points to make a row of diamonds. Each point is nudged a
 * little, as if knotted by hand. All points stay inside the border.
 */
export function latticeLines(seed = 3): Point[][] {
  const rand = mulberry32(seed);
  const { border, diamonds } = RUG;
  const inner = 1 - border * 2;
  const cellU = inner / diamonds;
  // Diamonds roughly as tall as wide, in rug proportions.
  const rows = Math.max(2, Math.round(diamonds * (RUG.depth / RUG.width) * 1.4));
  const cellV = inner / rows;
  const wobble = Math.min(cellU, cellV) * 0.06;
  const nudge = () => (rand() - 0.5) * 2 * wobble;

  const lines: Point[][] = [];
  // Each column of diamonds is two zig-zags that mirror each other: one
  // leaves the column's left edge and swings right, the other leaves its
  // right edge and swings left. They swing in step, so they meet at the
  // column's middle and part again — a chain of diamonds — and their
  // outer points touch the next column's diamonds.
  for (let c = 0; c < diamonds; c++) {
    for (const dir of [1, -1]) {
      const edge = dir === 1 ? c : c + 1;
      const pts: Point[] = [];
      for (let r = 0; r <= rows * 2; r++) {
        const swing = r % 2 === 0 ? 0 : 0.5;
        const u = border + (edge + dir * swing) * cellU;
        const v = border + (r / 2) * cellV;
        pts.push({
          u: Math.min(1 - border, Math.max(border, u + nudge())),
          v: Math.min(1 - border, Math.max(border, v + (r === 0 || r === rows * 2 ? 0 : nudge()))),
        });
      }
      lines.push(pts);
    }
  }
  return lines;
}

/**
 * Small woven accent diamonds, set in the middle of some of the
 * lattice's diamonds — the way colour is placed in a real Berber rug,
 * rather than scattered. Terracotta mostly, with the odd sage one.
 */
export function flecks(seed = 11): (Point & { color: "rust" | "green" })[] {
  const rand = mulberry32(seed);
  const { border, diamonds } = RUG;
  const inner = 1 - border * 2;
  const rows = Math.max(2, Math.round(diamonds * (RUG.depth / RUG.width) * 1.4));
  const out: (Point & { color: "rust" | "green" })[] = [];
  for (let c = 0; c < diamonds; c++)
    for (let r = 0; r < rows; r++) {
      // Roughly one diamond in three carries an accent.
      if (rand() > 0.34) continue;
      out.push({
        u: border + (c + 0.5) * (inner / diamonds),
        v: border + (r + 0.5) * (inner / rows),
        color: rand() < 0.3 ? "green" : "rust",
      });
    }
  return out;
}

/** One tassel: where it hangs along the end, how long, and its lean. */
export interface Tassel {
  /** -0.5..0.5 along the rug's short end. */
  along: number;
  length: number;
  lean: number;
}

/** The fringe for one end of the rug. */
export function fringe(seed: number): Tassel[] {
  const rand = mulberry32(seed);
  const n = RUG.fringe;
  return Array.from({ length: n }, (_, i) => ({
    along: (i + 0.5) / n - 0.5 + (rand() - 0.5) * (0.4 / n),
    length: 0.09 + rand() * 0.035,
    lean: (rand() - 0.5) * 0.5,
  }));
}
