/**
 * Where everything stands in the Great Hall (BB-38).
 *
 * The room camera stands in the aisle between the long tables, looking
 * down the hall at the board, which hangs on the far wall on a low dais
 * under a tall arched window. The top table is split in two either side
 * of the board, so it never hides it. Candles float above everyone's
 * heads, under an enchanted ceiling that follows the time of day.
 *
 * Pure data and maths, tested without a renderer: nothing stands between
 * the camera and the board, nothing pokes through a wall, and no candle
 * floats low enough to cross the view of the board.
 */

import { BOARD } from "@/lib/board-geometry";

/** The room-view camera station (from CameraRig). */
export const ROOM_CAMERA = { x: 0.4, y: 1.45, z: 4.4 } as const;

/** The hall's stone shell. Side walls at x = ±halfWidth. */
export const HALL = {
  halfWidth: 7.5,
  /** The far wall's face, just behind the board. */
  backZ: BOARD.wallZ - 0.16,
  /** How far the hall runs back past the camera, into the fog. */
  frontZ: 16,
  /** Where the walls meet the enchanted ceiling. */
  height: 9,
} as const;

/** The raised dais the board and the top table stand on, across the far end. */
export const DAIS = { depth: 2.0, height: 0.22 } as const;

/** A table, bench or tree's footprint on the floor plane. */
export interface Footprint {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
}

/** Table top height above whatever it stands on. */
export const TABLE_HEIGHT = 0.76;

/**
 * The top table, in two halves either side of the board on the dais,
 * facing down the hall.
 */
export const TOP_TABLE = { x: 4.35, z: HALL.backZ + 1.05, width: 2.5, depth: 0.8 } as const;

/**
 * The four long tables running down the hall, two each side of the
 * aisle, each with a bench along both sides.
 */
export const LONG_TABLE = { xs: [-5.6, -2.95, 2.95, 5.6], fromZ: -0.05, toZ: 11, width: 0.95 } as const;
/** Benches: how far out from the table's centre line, and their width. */
export const BENCH = { offset: 0.78, width: 0.32, height: 0.45 } as const;

/** Christmas trees: two in the far corners and two along the side walls. */
export const TREES = [
  { x: -6.35, z: -1.2, height: 5.6, radius: 1.05 },
  { x: 6.35, z: -1.2, height: 5.6, radius: 1.05 },
  { x: -6.55, z: 3.6, height: 4.8, radius: 0.85 },
  { x: 6.55, z: 3.6, height: 4.8, radius: 0.85 },
] as const;

/** The tall arched window above the board. `sill` and `top` are heights. */
export const BACK_WINDOW = { width: 2.7, sill: 3.55, top: 8.1 } as const;

/** Arched windows down both side walls, at these z. */
export const SIDE_WINDOWS = { zs: [0.2, 4.4, 8.6], width: 1.7, sill: 2.7, top: 7.4 } as const;

/** Stone pillars along the side walls, between the windows. */
export const PILLARS = { zs: [-1.9, 2.3, 6.5, 10.7], width: 0.7 } as const;

/** Banners hung on the far wall, either side of the window. */
export const BANNERS = {
  xs: [-5.5, -3.35, 3.35, 5.5],
  width: 1.15,
  top: 7.6,
  bottom: 3.5,
  colours: ["#8e1c22", "#1f5a36", "#1f3a78", "#b8892a"],
} as const;

/** Where the floating candles drift, and how many. */
export const CANDLES = { count: 140, minY: 3.7, maxY: 6.8, minZ: -1.6, maxZ: 10, halfWidth: 6.6 } as const;

function footprint(x: number, z: number, w: number, d: number): Footprint {
  return { x, z, halfX: w / 2, halfZ: d / 2 };
}

/** Every floor prop, for the clearance checks. */
export function floorFootprints(): Record<string, Footprint> {
  const out: Record<string, Footprint> = {};
  for (const s of [-1, 1]) {
    out[`top table ${s}`] = footprint(s * TOP_TABLE.x, TOP_TABLE.z, TOP_TABLE.width, TOP_TABLE.depth);
  }
  const len = LONG_TABLE.toZ - LONG_TABLE.fromZ;
  const mid = (LONG_TABLE.fromZ + LONG_TABLE.toZ) / 2;
  LONG_TABLE.xs.forEach((x, i) => {
    out[`table ${i}`] = footprint(x, mid, LONG_TABLE.width, len);
    for (const s of [-1, 1]) out[`bench ${i}${s}`] = footprint(x + s * BENCH.offset, mid, BENCH.width, len);
  });
  TREES.forEach((t, i) => (out[`tree ${i}`] = footprint(t.x, t.z, t.radius * 2, t.radius * 2)));
  return out;
}

/**
 * Whether a footprint blocks the view of the board from the room camera:
 * true if it reaches into the wedge between the camera and either edge of
 * the board, on the floor plane (conservative for anything low).
 */
export function blocksBoard(f: Footprint): boolean {
  const left = -BOARD.width / 2;
  const right = BOARD.width / 2;
  const nearZ = Math.max(f.z - f.halfZ, BOARD.wallZ);
  const farZ = Math.min(f.z + f.halfZ, ROOM_CAMERA.z);
  if (farZ <= nearZ) return false;
  // Check the stretch of the footprint between the board and the camera.
  for (let k = 0; k <= 20; k++) {
    const z = nearZ + ((farZ - nearZ) * k) / 20;
    const t = (ROOM_CAMERA.z - z) / (ROOM_CAMERA.z - BOARD.wallZ);
    const minX = ROOM_CAMERA.x + (left - ROOM_CAMERA.x) * t;
    const maxX = ROOM_CAMERA.x + (right - ROOM_CAMERA.x) * t;
    if (f.x + f.halfX > minX && f.x - f.halfX < maxX) return true;
  }
  return false;
}

/** Whether a footprint sits inside the hall's walls. */
export function insideHall(f: Footprint): boolean {
  return (
    f.x - f.halfX >= -HALL.halfWidth &&
    f.x + f.halfX <= HALL.halfWidth &&
    f.z - f.halfZ >= HALL.backZ - 0.01 &&
    f.z + f.halfZ <= HALL.frontZ
  );
}

/**
 * The highest the sight line from the camera to the top of the board
 * gets anywhere along the way: the board's top edge, since it rises the
 * whole way. Anything floating above this never crosses the board.
 */
export function boardSightTop(): number {
  return BOARD.centerY + BOARD.height / 2;
}
