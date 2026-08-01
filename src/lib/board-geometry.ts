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

/** Edge length of a note at scale 1, in world units. */
export const NOTE_BASE = 0.52;

/** Vertical field of view of the scene camera, in degrees. */
export const CAMERA_FOV = 46;
/** Distance from the cork when walked up at zoom 1; scales as 1/zoom. */
export const CAMERA_BASE_DIST = 1.6;

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

/**
 * World x/y (board space) -> normalized. X clamps to [-1, maxNx]; themes
 * with a second mini board pass EXTENDED_MAX_NX so items can be dragged
 * onto it (positions stay valid on any theme since rendering never clamps).
 */
export function worldToNorm(
  x: number,
  y: number,
  maxNx = 1
): { nx: number; ny: number } {
  const { hx, hy } = usableHalfExtents();
  return {
    nx: clamp(hx === 0 ? 0 : x / hx, -1, maxNx),
    ny: clamp(hy === 0 ? 0 : (y - BOARD.centerY) / hy, -1, 1),
  };
}

// ---------- Mini board (scenes with a second, smaller board) ----------

/** The "your day" mini board that sits beside the main board. */
export const MINI_BOARD = {
  /** World x of the mini board's centre. */
  offsetX: 4.6,
  width: 2.4,
  height: 1.7,
  centerY: 1.45,
} as const;

/** Furthest normalized x pannable/placeable when a mini board exists. */
export const EXTENDED_MAX_NX = 2.9;

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

/** A normalized rectangle that new item centres must stay inside. */
export interface PlacementBox {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

/** Where the close-up camera is looking, so new items land in view. */
export interface PlacementView {
  /** Normalized board coords at the centre of the screen. */
  focus: { x: number; y: number };
  /** Camera zoom (1 = default framing, larger = closer in). */
  zoom: number;
  /** Viewport aspect ratio (width / height). */
  aspect?: number;
  /** Furthest placeable x — EXTENDED_MAX_NX on mini-board themes. */
  maxNx?: number;
}

/** Keep new item centres this far inside a board's edge, in world units. */
const PLACE_INSET = NOTE_BASE / 2 + 0.04;
/** Hand-tuned keep-out on the main board, in normalized units. */
const MAIN_PLACE_HX = 0.85;
const MAIN_PLACE_HY = 0.75;

/**
 * Half of what the walked-up camera can see at `zoom`, in normalized
 * board units. Mirrors the framing in CameraRig.
 */
export function visibleHalfExtents(
  zoom: number,
  aspect = 1
): { nx: number; ny: number } {
  const dist = CAMERA_BASE_DIST / Math.max(zoom, 1e-3);
  const halfH = dist * Math.tan((CAMERA_FOV * Math.PI) / 360);
  const { hx, hy } = usableHalfExtents();
  return { nx: (halfH * aspect) / hx, ny: halfH / hy };
}

/** Normalized box of the mini board, inset so a note sits fully on it. */
function miniBoardBox(): PlacementBox {
  const { hx, hy } = usableHalfExtents();
  return {
    minX: (MINI_BOARD.offsetX - MINI_BOARD.width / 2 + PLACE_INSET) / hx,
    maxX: (MINI_BOARD.offsetX + MINI_BOARD.width / 2 - PLACE_INSET) / hx,
    minY:
      (MINI_BOARD.centerY - MINI_BOARD.height / 2 + PLACE_INSET - BOARD.centerY) /
      hy,
    maxY:
      (MINI_BOARD.centerY + MINI_BOARD.height / 2 - PLACE_INSET - BOARD.centerY) /
      hy,
  };
}

/** Shrink `want` so it never leaves `limit`. May collapse to a point. */
function clipBox(want: PlacementBox, limit: PlacementBox): PlacementBox {
  return {
    minX: clamp(want.minX, limit.minX, limit.maxX),
    maxX: clamp(want.maxX, limit.minX, limit.maxX),
    minY: clamp(want.minY, limit.minY, limit.maxY),
    maxY: clamp(want.maxY, limit.minY, limit.maxY),
  };
}

/**
 * The region a new item may land in: the whole main board when we have
 * no camera framing (standing back in the room), otherwise just what
 * the user is currently looking at, clipped to whichever board that is.
 */
export function placementBox(view?: PlacementView): PlacementBox {
  const main = {
    minX: -MAIN_PLACE_HX,
    maxX: MAIN_PLACE_HX,
    minY: -MAIN_PLACE_HY,
    maxY: MAIN_PLACE_HY,
  };
  if (!view) return main;

  const mini = miniBoardBox();
  // Panned past the gap between the two boards? Then place on the mini one.
  const onMini =
    (view.maxNx ?? 1) > 1 && view.focus.x > (main.maxX + mini.minX) / 2;
  const board = onMini ? mini : main;

  const { hx, hy } = usableHalfExtents();
  const seen = visibleHalfExtents(view.zoom, view.aspect ?? 1);
  // Pull in by half a note so the whole thing lands on screen, not just
  // its centre.
  const hxSpread = Math.max(0, seen.nx - PLACE_INSET / hx);
  const hySpread = Math.max(0, seen.ny - PLACE_INSET / hy);

  return clipBox(
    {
      minX: view.focus.x - hxSpread,
      maxX: view.focus.x + hxSpread,
      minY: view.focus.y - hySpread,
      maxY: view.focus.y + hySpread,
    },
    board
  );
}

/**
 * Pick a spot for a new item, preferring places far from existing
 * items so fresh notes do not land on top of each other. Samples a
 * handful of candidates and keeps the one with the best clearance.
 *
 * Pass `view` to keep the item where the user is currently looking —
 * without it a note can land at the far end of the board, off screen.
 */
export function suggestPlacement(
  existing: PlacedItem[],
  rand: () => number = Math.random,
  view?: PlacementView
): { x: number; y: number } {
  const box = placementBox(view);
  const midX = (box.minX + box.maxX) / 2;
  const midY = (box.minY + box.maxY) / 2;

  let best = { x: midX, y: midY };
  let bestScore = -Infinity;
  const candidates = 14;
  for (let i = 0; i < candidates; i++) {
    const cx = box.minX + rand() * (box.maxX - box.minX);
    const cy = box.minY + rand() * (box.maxY - box.minY);
    let nearest = Infinity;
    for (const item of existing) {
      const d = Math.hypot(cx - item.x, cy - item.y);
      nearest = Math.min(nearest, d);
    }
    // With nothing to dodge, sit near the middle of what's on screen.
    const score =
      existing.length === 0 ? -Math.hypot(cx - midX, cy - midY) : nearest;
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
