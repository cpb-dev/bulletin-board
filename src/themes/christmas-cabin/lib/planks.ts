/**
 * Plank layouts for the Christmas Cabin's wooden surfaces (BB-35): the
 * wide-plank oak floor and the tongue-and-groove ceiling.
 *
 * A layout is one repeating tile: `rows` boards side by side, each row
 * cut into lengths that run off one end of the tile and back in at the
 * other, so the tile repeats with no seam. Neighbouring rows never put
 * their end joints close together — the "stair-step" or H-joint that
 * makes a floor look fake.
 *
 * Pure and seeded, so it's tested without a canvas.
 */

import { mulberry32 } from "@/components/three/textures";

export interface PlankSegment {
  /** Which row of boards, 0 at one edge of the tile. */
  row: number;
  /** Where the board starts along the row, as a fraction of the tile. */
  start: number;
  /** Its length, as a fraction of the tile. */
  length: number;
  /** -1..1: how much lighter or darker this board is than the average. */
  tone: number;
  /** A per-board seed for its grain and knots. */
  seed: number;
}

export interface PlankOptions {
  rows: number;
  /** Shortest and longest board, as fractions of the tile length. */
  minLength: number;
  maxLength: number;
  /** The closest two joints in neighbouring rows may be, as a fraction. */
  minStagger: number;
  seed: number;
}

/** Distance between two positions on a loop of length 1. */
export function loopDistance(a: number, b: number): number {
  const d = Math.abs(a - b) % 1;
  return Math.min(d, 1 - d);
}

/** Cut one row (a loop of length 1) into board lengths. */
function cutRow(rand: () => number, min: number, max: number): number[] {
  const lengths: number[] = [];
  let left = 1;
  while (left > max + min) {
    const l = min + rand() * (max - min);
    lengths.push(l);
    left -= l;
  }
  // What's left is between min and max + min: one board, or two halves.
  if (left > max) lengths.push(left / 2, left / 2);
  else lengths.push(left);
  return lengths;
}

/** The joint positions of a row, given where its first board starts. */
function joints(offset: number, lengths: number[]): number[] {
  const out: number[] = [];
  let at = offset;
  for (const l of lengths) {
    out.push(at % 1);
    at += l;
  }
  return out;
}

export function plankLayout(opts: PlankOptions): PlankSegment[][] {
  const rand = mulberry32(opts.seed);
  const rows: PlankSegment[][] = [];
  let previous: number[] = [];

  for (let row = 0; row < opts.rows; row++) {
    const lengths = cutRow(rand, opts.minLength, opts.maxLength);
    // Turn the row until no joint sits near one in the row before it.
    let offset = rand();
    let best = offset;
    let bestGap = -1;
    for (let tries = 0; tries < 60; tries++) {
      const mine = joints(offset, lengths);
      const gap = Math.min(
        Infinity,
        ...mine.flatMap((j) => previous.map((p) => loopDistance(j, p)))
      );
      if (gap > bestGap) {
        best = offset;
        bestGap = gap;
      }
      if (gap >= opts.minStagger) break;
      offset = rand();
    }

    let at = best;
    rows.push(
      lengths.map((length) => {
        const seg = {
          row,
          start: at % 1,
          length,
          tone: rand() * 2 - 1,
          seed: Math.floor(rand() * 1e9),
        };
        at += length;
        return seg;
      })
    );
    previous = joints(best, lengths);
  }
  return rows;
}

/**
 * Grain along a board: a sum of sines in the distance along the board,
 * so a board drawn in two pieces (because it runs off the end of the
 * tile) lines up exactly where it comes back in. Returns -1..1.
 */
export function grain(along: number, across: number, seed: number): number {
  const p = (seed % 997) / 997;
  return (
    0.5 * Math.sin(across * 38 + Math.sin(along * 2.1 + p * 6.28) * 1.8 + p * 12) +
    0.3 * Math.sin(across * 91 + Math.sin(along * 5.3 + p * 3.1) * 0.9) +
    0.2 * Math.sin(across * 170 + along * 0.7 + p * 20)
  );
}
