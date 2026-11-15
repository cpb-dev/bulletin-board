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
 * On the right side wall: letters painted straight onto the boards, each
 * under a bulb on a sagging string, between the wainscot and the fairy
 * lights, in the stretch of wall beside the chimney that a portrait phone
 * still sees with your head turned fully right. `z` is the
 * centre of the painted area along the wall, `width` its length along the
 * wall, `y` its centre height.
 */
export const ALPHABET_WALL = {
  z: -0.8,
  y: 2.48,
  width: 2.3,
  height: 1.9,
  rows: ["ABCDEFGH", "IJKLMNOPQ", "RSTUVWXYZ"],
} as const;

/** Back wall, left of the board: a wide window onto the snow. */
export const SNOW_WINDOW = { x: -3.55, y: 2.15, width: 2.1, height: 1.3 } as const;

/**
 * A tall fir in the front-left of the room, stepped forward along the
 * left wall so the whole window stays in view behind it. From the room
 * camera it stands at the left edge, just left of the window.
 */
export const TREE = { x: -4.2, z: -0.35, radius: 0.95, height: 3.0 } as const;

/** Where the branches start: below this is bare trunk over the presents. */
export const TREE_SKIRT_Y = 0.45;

/**
 * How far the branches reach from the trunk at height `y`: widest at the
 * bottom whorl, narrowing to the tip in a slightly convex fir outline.
 * Zero below the branches and above the tip.
 */
export function treeRadiusAt(y: number): number {
  if (y < TREE_SKIRT_Y || y > TREE.height) return 0;
  const k = (TREE.height - y) / (TREE.height - TREE_SKIRT_Y);
  return TREE.radius * k ** 0.9;
}

/**
 * Whether the tree hides any of the window from the room camera. The
 * sight line runs from the camera's eye to the window's near-left corner
 * (its bottom-left, the corner closest to the tree), and is checked
 * against how wide the tree is at the height the line passes it.
 */
export function treeHidesWindow(): boolean {
  const to = { x: SNOW_WINDOW.x - SNOW_WINDOW.width / 2, z: ROOM.backZ };
  const sill = SNOW_WINDOW.y - SNOW_WINDOW.height / 2;
  const dx = to.x - ROOM_CAMERA.x;
  const dz = to.z - ROOM_CAMERA.z;
  const len = Math.hypot(dx, dz);
  // Where along the line the tree is, and how high the line is there.
  const along = ((TREE.x - ROOM_CAMERA.x) * dx + (TREE.z - ROOM_CAMERA.z) * dz) / (len * len);
  const y = ROOM_CAMERA.y + (sill - ROOM_CAMERA.y) * along;
  const cross = Math.abs(dx * (TREE.z - ROOM_CAMERA.z) - dz * (TREE.x - ROOM_CAMERA.x));
  return cross / len < treeRadiusAt(y);
}

/** The wrapping papers a present can have (drawn in props/tree/). */
export type Wrap =
  | "plaid"
  | "gold"
  | "dots"
  | "kraft"
  | "snowflakes"
  | "candy"
  | "stars"
  | "tartan"
  | "berry";

/**
 * A wrapped present. `x`, `z` and `rot` place it on the floor, or, with
 * `on`, on top of another present (by index), off-centre by `x`, `z`.
 */
export interface Present {
  x: number;
  z: number;
  w: number;
  h: number;
  d: number;
  rot: number;
  wrap: Wrap;
  ribbon: string;
  on?: number;
}

/**
 * A spot on a ring round the tree's trunk: `angle` round from the room's
 * +x (towards the window side), `radius` out from the trunk. The present
 * is turned to lie along the ring, so a row of them follows the curve of
 * the tree; `turn` adds a little twist so they don't look set by a jig.
 */
export function aroundTree(angle: number, radius: number, turn = 0): { x: number; z: number; rot: number } {
  return {
    x: TREE.x + Math.cos(angle) * radius,
    z: TREE.z + Math.sin(angle) * radius,
    // Three's Y rotation takes a box's local x to (cos r, -sin r); the
    // ring's tangent here is (-sin a, cos a), so r = -a - pi/2.
    rot: -angle - Math.PI / 2 + turn,
  };
}

/**
 * Which way the room camera is from the tree, as an `aroundTree` angle:
 * the middle of the arc of presents that's in view.
 */
export const TREE_FACING = Math.atan2(ROOM_CAMERA.z - TREE.z, ROOM_CAMERA.x - TREE.x);

/**
 * The presents. Most go round the tree on two rings on the side facing
 * the room: low, flat ones tucked in under the branches, and taller ones
 * in an outer ring just clear of them, each turned along the curve. A
 * few more spill off towards the window, and a couple are stacked.
 *
 * Tune them freely here: the tests keep them apart, out from under any
 * branch that would cut through them, inside the room, out of the
 * board's way, and resting on whatever they're stacked on.
 */
const F = TREE_FACING;
export const PRESENTS: Present[] = [
  // Off towards the window (unchanged).
  { x: -3.1, z: -1.45, w: 0.26, h: 0.5, d: 0.26, rot: 0.1, wrap: "snowflakes", ribbon: "#c22f2f" },
  { x: -3.62, z: -1.85, w: 0.5, h: 0.24, d: 0.36, rot: -0.2, wrap: "candy", ribbon: "#2f6b3f" },
  { x: -0.04, z: 0.02, w: 0.2, h: 0.16, d: 0.2, rot: 0.4, wrap: "stars", ribbon: "#d8d8dc", on: 1 },
  { x: -2.75, z: -1.95, w: 0.3, h: 0.2, d: 0.28, rot: 0.3, wrap: "berry", ribbon: "#e2b23c" },

  // Outer ring, just clear of the lowest branches.
  { ...aroundTree(F - 1.05, 1.32, 0.1), w: 0.4, h: 0.3, d: 0.32, wrap: "dots", ribbon: "#c22f2f" },
  { ...aroundTree(F - 0.6, 1.38, -0.12), w: 0.48, h: 0.36, d: 0.4, wrap: "plaid", ribbon: "#e2b23c" },
  { x: 0.02, z: -0.02, w: 0.26, h: 0.18, d: 0.24, rot: -0.3, wrap: "gold", ribbon: "#b3202a", on: 5 },
  { ...aroundTree(F - 0.18, 1.24, 0.08), w: 0.3, h: 0.42, d: 0.28, wrap: "tartan", ribbon: "#efe6d2" },
  { ...aroundTree(F + 0.2, 1.2, -0.06), w: 0.44, h: 0.26, d: 0.34, wrap: "snowflakes", ribbon: "#2f6b3f" },
  { ...aroundTree(F + 0.6, 1.24, 0.14), w: 0.34, h: 0.34, d: 0.3, wrap: "kraft", ribbon: "#b3202a" },
  { ...aroundTree(F + 1.0, 1.2, -0.1), w: 0.4, h: 0.24, d: 0.32, wrap: "berry", ribbon: "#efe6d2" },

  // Inner ring: low ones tucked in under the branches.
  { ...aroundTree(F - 0.9, 0.74, 0.2), w: 0.26, h: 0.14, d: 0.22, wrap: "candy", ribbon: "#b3202a" },
  { ...aroundTree(F - 0.44, 0.76, -0.15), w: 0.3, h: 0.16, d: 0.24, wrap: "stars", ribbon: "#e2b23c" },
  { ...aroundTree(F + 0.02, 0.74, 0.1), w: 0.24, h: 0.13, d: 0.22, wrap: "gold", ribbon: "#2f6b3f" },
  { ...aroundTree(F + 0.46, 0.76, -0.2), w: 0.3, h: 0.15, d: 0.24, wrap: "plaid", ribbon: "#efe6d2" },
  { ...aroundTree(F + 0.9, 0.74, 0.12), w: 0.26, h: 0.14, d: 0.22, wrap: "dots", ribbon: "#e2b23c" },
];

/** Where a present stands in the room: its centre on the floor, and its base height. */
export function presentPlace(i: number): { x: number; z: number; base: number; rot: number } {
  const p = PRESENTS[i];
  if (p.on === undefined) return { x: p.x, z: p.z, base: 0, rot: p.rot };
  const under = presentPlace(p.on);
  const below = PRESENTS[p.on];
  return { x: under.x + p.x, z: under.z + p.z, base: under.base + below.h, rot: under.rot + p.rot };
}

/** A present's footprint: its turned box, bounded by a square. */
export function presentFootprint(i: number): Footprint {
  const p = PRESENTS[i];
  const at = presentPlace(i);
  const half = Math.hypot(p.w, p.d) / 2;
  return { x: at.x, z: at.z, halfX: half, halfZ: half };
}

/** The floor props, for the clearance checks. */
export function floorFootprints(): Record<string, Footprint> {
  return {
    tree: { x: TREE.x, z: TREE.z, halfX: TREE.radius, halfZ: TREE.radius },
    ...Object.fromEntries(PRESENTS.map((_, i) => [`present ${i}`, presentFootprint(i)])),
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
