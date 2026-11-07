/**
 * Where everything stands in the Christmas Cabin (BB-35).
 *
 * Pure data and maths, so the arrangement is tested without a renderer:
 * nothing stands between the room camera and the board, nothing pokes
 * through a wall, the fireplace doesn't hide the alphabet wall, and the
 * tree stands close beside the window without hiding any of it.
 *
 * The room camera's default view only reaches about 4.5 units either
 * side of the board along the back wall; the side walls come into view
 * when you turn your head. So the back wall holds what should be seen
 * at once: the tree and the window left of the board, the fireplace
 * right. Presents trail from under the tree to under the window.
 *
 * Coordinates are world units. The board hangs on the back wall at
 * x = 0, z = BOARD.wallZ; the room camera stands at ROOM_CAMERA.
 */

import { BOARD } from "@/lib/board-geometry";

/** The room-view camera station (from CameraRig). */
export const ROOM_CAMERA = { x: 0.4, y: 1.45, z: 4.4 } as const;

/** The room's shell. */
export const ROOM = {
  /** Side walls at x = ±halfWidth. */
  halfWidth: 5.2,
  /** The back wall's face, just behind the board. */
  backZ: BOARD.wallZ - 0.16,
  /** How far forward the floor, ceiling and side walls run. */
  frontZ: 6,
  height: 4.4,
} as const;

/**
 * A floor prop's footprint on the floor plane: its centre and how far it
 * reaches either side along x and z. A rectangle, because a fireplace is
 * wide and shallow and a circle would push it through the wall.
 */
export interface Footprint {
  x: number;
  z: number;
  halfX: number;
  halfZ: number;
}

/** Back wall, right of the board. */
export const FIREPLACE = { x: 3.7, width: 2.2, depth: 0.7 } as const;

/**
 * On the right side wall, back towards the corner: painted letters under
 * a light string. Seen by turning your head right. `z` is the centre of
 * the panel along the wall, `width` its length along the wall.
 */
export const ALPHABET_WALL = {
  z: -1.1,
  y: 1.95,
  width: 1.8,
  height: 1.3,
  rows: ["ABCDEFGH", "IJKLMNOPQ", "RSTUVWXYZ"],
} as const;

/** Back wall, left of the board: a wide window onto the snow. */
export const SNOW_WINDOW = { x: -3.55, y: 2.15, width: 2.1, height: 1.3 } as const;

/**
 * In the back-left corner, just left of the window and stepped out from
 * the wall: as far into view as it can stand without hiding the glass.
 */
export const TREE = { x: -4.45, z: -1.35, radius: 0.7, height: 2.4 } as const;

/** One cone of the tree: its base height, base radius and height. */
export interface TreeTier {
  y: number;
  r: number;
  h: number;
}

/** The tree's three stacked cones, sized from TREE. */
export function treeTiers(): TreeTier[] {
  const { radius: R, height: H } = TREE;
  return [
    { y: 0.21 * H, r: R, h: 0.42 * H },
    { y: 0.48 * H, r: 0.75 * R, h: 0.365 * H },
    { y: 0.71 * H, r: 0.5 * R, h: 0.31 * H },
  ];
}

/** How far the tree's branches reach from its trunk at height `y`. */
export function treeRadiusAt(y: number): number {
  let r = 0;
  for (const t of treeTiers()) {
    if (y >= t.y && y <= t.y + t.h) r = Math.max(r, t.r * (1 - (y - t.y) / t.h));
  }
  return r;
}

/**
 * Whether the tree hides any of the window from the room camera. The
 * sight line runs from the camera's eye to the window's near-left corner
 * (its bottom-left, the corner closest to the tree), and is checked
 * against how wide the tree is at that height, which is far narrower
 * than its base.
 */
export function treeHidesWindow(): boolean {
  const to = { x: SNOW_WINDOW.x - SNOW_WINDOW.width / 2, z: ROOM.backZ };
  const y = SNOW_WINDOW.y - SNOW_WINDOW.height / 2;
  const r = treeRadiusAt(y);
  // Distance from the trunk to the camera-to-corner line, on the floor plane.
  const dx = to.x - ROOM_CAMERA.x;
  const dz = to.z - ROOM_CAMERA.z;
  const len = Math.hypot(dx, dz);
  const cross = Math.abs(dx * (TREE.z - ROOM_CAMERA.z) - dz * (TREE.x - ROOM_CAMERA.x));
  return cross / len < r;
}

/** A wrapped present on the floor. `rot` turns it about its own centre. */
export interface Present {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  rot: number;
  color: string;
  ribbon: string;
}

/**
 * Presents under the tree, trailing along the floor towards and under
 * the window. Placeholder sizes and colours, to be tuned when the tree
 * and presents are detailed.
 */
export const PRESENTS: Present[] = [
  // under the tree
  { x: -4.85, z: -1.0, w: 0.4, h: 0.34, d: 0.36, rot: 0.3, color: "#c22f2f", ribbon: "#e8b63a" },
  { x: -4.3, z: -0.75, w: 0.32, h: 0.26, d: 0.3, rot: -0.2, color: "#2f6b3f", ribbon: "#f4f1e8" },
  { x: -3.95, z: -1.1, w: 0.3, h: 0.42, d: 0.3, rot: 0.15, color: "#3f6fb0", ribbon: "#e0443a" },
  // trailing towards the window
  { x: -3.55, z: -1.75, w: 0.36, h: 0.22, d: 0.3, rot: -0.35, color: "#e8b63a", ribbon: "#c22f2f" },
  { x: -3.15, z: -1.95, w: 0.26, h: 0.3, d: 0.26, rot: 0.25, color: "#f4f1e8", ribbon: "#2f6b3f" },
  { x: -2.85, z: -1.7, w: 0.22, h: 0.18, d: 0.22, rot: -0.1, color: "#c22f2f", ribbon: "#f4f1e8" },
];

/** A present's footprint: its turned box, bounded by a square. */
export function presentFootprint(p: Present): Footprint {
  const half = Math.hypot(p.w, p.d) / 2;
  return { x: p.x, z: p.z, halfX: half, halfZ: half };
}

/** The floor props, for the clearance checks. */
export function floorFootprints(): Record<string, Footprint> {
  return {
    tree: { x: TREE.x, z: TREE.z, halfX: TREE.radius, halfZ: TREE.radius },
    ...Object.fromEntries(PRESENTS.map((p, i) => [`present ${i}`, presentFootprint(p)])),
    fireplace: {
      x: FIREPLACE.x,
      z: ROOM.backZ + FIREPLACE.depth / 2,
      halfX: FIREPLACE.width / 2,
      halfZ: FIREPLACE.depth / 2,
    },
  };
}

/**
 * Whether a footprint blocks the view of the board from the room camera:
 * true if it reaches into the wedge between the camera and either edge of
 * the board. Checked on the floor plane, which is conservative for
 * anything shorter than the camera.
 */
export function blocksBoard(f: Footprint): boolean {
  const left = -BOARD.width / 2;
  const right = BOARD.width / 2;
  // Only things between the camera and the board can block it.
  if (f.z + f.halfZ <= BOARD.wallZ || f.z - f.halfZ >= ROOM_CAMERA.z) return false;
  // The wedge is widest at the board, so test the footprint's back edge.
  const z = Math.max(f.z - f.halfZ, BOARD.wallZ);
  const t = (ROOM_CAMERA.z - z) / (ROOM_CAMERA.z - BOARD.wallZ);
  const minX = ROOM_CAMERA.x + (left - ROOM_CAMERA.x) * t;
  const maxX = ROOM_CAMERA.x + (right - ROOM_CAMERA.x) * t;
  return f.x + f.halfX > minX && f.x - f.halfX < maxX;
}

/** The two ends of the alphabet wall, on the floor plane. */
export function alphabetWallEnds(): { x: number; z: number }[] {
  const x = ROOM.halfWidth;
  return [
    { x, z: ALPHABET_WALL.z - ALPHABET_WALL.width / 2 },
    { x, z: ALPHABET_WALL.z + ALPHABET_WALL.width / 2 },
  ];
}

/**
 * Whether a footprint blocks the sight line from the room camera to a
 * point, on the floor plane. The footprint is treated as its bounding
 * rectangle; the line is sampled finely along its length.
 */
export function blocksSight(to: { x: number; z: number }, f: Footprint): boolean {
  const steps = 200;
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = ROOM_CAMERA.x + (to.x - ROOM_CAMERA.x) * t;
    const z = ROOM_CAMERA.z + (to.z - ROOM_CAMERA.z) * t;
    if (Math.abs(x - f.x) < f.halfX && Math.abs(z - f.z) < f.halfZ) return true;
  }
  return false;
}

/** Whether a footprint sits wholly inside the room's walls. */
export function insideRoom(f: Footprint): boolean {
  return (
    f.x - f.halfX >= -ROOM.halfWidth &&
    f.x + f.halfX <= ROOM.halfWidth &&
    f.z - f.halfZ >= ROOM.backZ - 0.01 &&
    f.z + f.halfZ <= ROOM.frontZ
  );
}
