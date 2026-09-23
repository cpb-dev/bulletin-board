/**
 * The glass in the haunted house's windows.
 *
 * A window used to be one flat rectangle of `#d9b25c` behind a single
 * cross of glazing bars. Five of them, all the same, all perfectly
 * steady — which reads as five rectangles of paint rather than five
 * rooms with something burning in them.
 *
 * This file decides how a pane is divided into lights, which light (if
 * any) has been broken, and how the lamp behind it behaves. Pure, so
 * the grid the canvas paints and the grid the glazing bars are built
 * from come from one place and can never drift apart — a muntin half a
 * light away from the shadow it is meant to cast is the sort of thing
 * that looks like a texture bug forever.
 */

/** Local PRNG — keeps this file free of component imports. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/*
 * Where the parts of a window sit in its reveal, measured from the
 * back of it. The wall is 0.22 deep, so everything here lives inside
 * that.
 *
 * The sash sits near the outside face, not half way down the reveal.
 * That is where a sash actually is, and it is also what gives a
 * figure room to come up to the glass without its shoulders pushing
 * through the glazing bars.
 */
export const GLASS_Z = 0.02;
export const GHOST_Z = 0.05;
export const MARK_Z = 0.14;
export const SASH_Z = 0.2;
/** Thickness of a glazing bar, so its back face is SASH_Z - half. */
export const BAR_DEPTH = 0.03;

/** How tall a figure is in a pane `h` high, before its form scales it. */
export const FIGURE_HEIGHT = 0.52;

export interface PaneGrid {
  cols: number;
  rows: number;
}

/**
 * How a pane `w` x `h` divides into lights.
 *
 * Aimed at lights a little taller than they are wide, the way sash
 * glazing runs, and clamped so a small window never ends up with one
 * pane of glass or a grid too fine to read at scene scale.
 */
export function paneGrid(w: number, h: number): PaneGrid {
  const target = 0.3; // roughly a hand's width per light
  const cols = Math.max(2, Math.min(3, Math.round(w / target)));
  const rows = Math.max(2, Math.min(4, Math.round(h / (target * 1.15))));
  return { cols, rows };
}

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * One light's rectangle in pane coordinates, 0..1 from the bottom
 * left. Lights are numbered left to right, bottom to top.
 */
export function lightRect(grid: PaneGrid, index: number): Rect {
  const i = ((index % (grid.cols * grid.rows)) + grid.cols * grid.rows) %
    (grid.cols * grid.rows);
  const cx = i % grid.cols;
  const cy = Math.floor(i / grid.cols);
  return {
    x0: cx / grid.cols,
    y0: cy / grid.rows,
    x1: (cx + 1) / grid.cols,
    y1: (cy + 1) / grid.rows,
  };
}

/**
 * Which light has gone, or null if this window is still whole.
 *
 * Most windows keep their glass: a house where every window is broken
 * reads as derelict rather than lived in by something. The break is
 * never in the bottom row, which is the row a sill and a boarded
 * window already crowd.
 */
export function brokenLight(seed: number, grid: PaneGrid): number | null {
  const rand = mulberry(seed * 2654435761 + 31);
  if (rand() > 0.45) return null;
  const above = grid.cols * (grid.rows - 1);
  return grid.cols + Math.floor(rand() * above);
}

/**
 * Whether this window's glass has misted over.
 *
 * Not every one: a row of identically fogged windows reads as a
 * filter laid over the whole house. On the ones that have, a figure
 * behind the glass is softer and a handprint on it is sharper, which
 * is the contrast the whole thing turns on.
 */
export function misted(seed: number): boolean {
  const rand = mulberry(seed * 668265263 + 97);
  return rand() < 0.45;
}

/**
 * How bright the lamp behind a pane is at time `t`, as a multiplier.
 *
 * Three waves that never line up, plus an occasional guttering dip. A
 * flame that pulses on one frequency reads as a slow strobe, which is
 * the one thing candlelight never does.
 */
export function candleFlicker(t: number, seed = 0): number {
  const s = seed * 1.7;
  const base =
    1 +
    Math.sin(t * 2.3 + s) * 0.045 +
    Math.sin(t * 5.7 + s * 2.3) * 0.03 +
    Math.sin(t * 11.3 + s * 3.9) * 0.018;
  // a gutter now and then, sharp on the way down and slow coming back
  const gutter = Math.sin(t * 0.37 + s * 5.1);
  const dip = gutter > 0.93 ? (gutter - 0.93) / 0.07 : 0;
  return Math.max(0.55, base - dip * 0.38);
}
