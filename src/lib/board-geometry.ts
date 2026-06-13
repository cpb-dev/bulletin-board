/**
 * Pure geometry helpers for the bulletin board.
 *
 * Item positions are stored normalized (-1..1 on both axes) so the
 * physical board can change size or aspect without breaking saved
 * boards. World units are three.js metres.
 */

export const BOARD = {
  /** Total board width in world units. */
  width: 4.6,
  /** Total board height in world units. */
  height: 2.7,
  /** Height of the board centre above the floor. */
  centerY: 1.62,
  /** Wall sits at this z; board hangs just in front. */
  wallZ: -2.2,
  /** Keep-out margin so items never poke past the frame. */
  margin: 0.3,
} as const;

/** Z of the board's front (cork) surface in world space. */
export const BOARD_SURFACE_Z = BOARD.wallZ + 0.09;

/** Items float just proud of the cork. */
export const ITEM_Z = BOARD_SURFACE_Z + 0.02;

/** Half-extent actually usable by item centres, in world units. */
export function usableHalfExtents(
  itemHalfWidth = 0,
  itemHalfHeight = 0
): { hx: number; hy: number } {
  return {
    hx: Math.max(0, BOARD.width / 2 - BOARD.margin - itemHalfWidth),
    hy: Math.max(0, BOARD.height / 2 - BOARD.margin - itemHalfHeight),
  };
}

/** Normalized (-1..1) board coords -> world x/y. */
export function normToWorld(nx: number, ny: number): { x: number; y: number } {
  const { hx, hy } = usableHalfExtents();
  return { x: nx * hx, y: BOARD.centerY + ny * hy };
}

/** World x/y (board space) -> normalized, clamped to -1..1. */
export function worldToNorm(x: number, y: number): { nx: number; ny: number } {
  const { hx, hy } = usableHalfExtents();
  return {
    nx: clamp(hx === 0 ? 0 : x / hx, -1, 1),
    ny: clamp(hy === 0 ? 0 : (y - BOARD.centerY) / hy, -1, 1),
  };
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v));
}

/** Small random paper tilt in radians (about +/- 5 degrees). */
export function randomTilt(rand: () => number = Math.random): number {
  return (rand() - 0.5) * 0.18;
}

export interface PlacedItem {
  x: number;
  y: number;
}

/**
 * Pick a spot for a new item, preferring places far from existing
 * items so fresh notes do not land on top of each other. Samples a
 * handful of candidates and keeps the one with the best clearance.
 */
export function suggestPlacement(
  existing: PlacedItem[],
  rand: () => number = Math.random
): { x: number; y: number } {
  let best = { x: 0, y: 0 };
  let bestScore = -Infinity;
  const candidates = 14;
  for (let i = 0; i < candidates; i++) {
    const cx = (rand() * 2 - 1) * 0.85;
    const cy = (rand() * 2 - 1) * 0.75;
    let nearest = Infinity;
    for (const item of existing) {
      const d = Math.hypot(cx - item.x, cy - item.y);
      nearest = Math.min(nearest, d);
    }
    const score = existing.length === 0 ? -Math.hypot(cx, cy) : nearest;
    if (score > bestScore) {
      bestScore = score;
      best = { x: cx, y: cy };
    }
  }
  return { x: round3(best.x), y: round3(best.y) };
}

export function round3(v: number): number {
  return Math.round(v * 1000) / 1000;
}

// ---------- Item sizing & resize ----------

/** Edge length of a note at scale 1, in world units. */
export const NOTE_BASE = 0.52;
export const MIN_ITEM_SCALE = 0.6;
export const MAX_ITEM_SCALE = 2.4;

export function clampScale(scale: number): number {
  if (!Number.isFinite(scale)) return 1;
  return clamp(scale, MIN_ITEM_SCALE, MAX_ITEM_SCALE);
}

/**
 * New scale while dragging a corner resize handle. The handle was
 * grabbed when the pointer sat `grabDist` from the item's centre at
 * `scaleAtGrab`; resizing keeps that ratio so the corner tracks the
 * finger. Pure so it can be unit-tested without a 3D scene.
 */
export function scaleFromHandleDrag(
  grabDist: number,
  currentDist: number,
  scaleAtGrab: number
): number {
  if (grabDist <= 1e-4) return clampScale(scaleAtGrab);
  return round3(clampScale((scaleAtGrab * currentDist) / grabDist));
}

/**
 * Word-wrap for canvas-rendered notes. Takes a measure function so it
 * stays pure and unit-testable without a DOM canvas.
 */
export function wrapLines(
  text: string,
  maxWidth: number,
  measure: (s: string) => number
): string[] {
  const lines: string[] = [];
  for (const rawLine of text.split("\n")) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let current = "";
    for (const word of words) {
      const candidate = current ? current + " " + word : word;
      if (measure(candidate) <= maxWidth || current === "") {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    lines.push(current);
  }
  return lines;
}

/**
 * Photo display size: fixed width, height follows the photo's aspect
 * ratio but stays within cute polaroid-ish bounds.
 */
export function photoPlaneSize(
  imageWidth: number,
  imageHeight: number
): { width: number; height: number } {
  const width = 0.62;
  const aspect =
    imageWidth > 0 && imageHeight > 0 ? imageHeight / imageWidth : 1;
  const height = clamp(width * aspect, 0.4, 0.85);
  return { width, height: round3(height) };
}
