/**
 * Where everything stands in the Christmas Cabin (BB-35).
 *
 * Pure data and maths, so the arrangement is tested without a renderer:
 * nothing stands between the room camera and the board, nothing pokes
 * through a wall, and neither the tree nor the fireplace hides the
 * alphabet wall.
 *
 * The room camera's default view only reaches about 4.5 units either
 * side of the board along the back wall; the side walls come into view
 * when you turn your head. So the back wall holds what should be seen
 * at once: the window and sofa left of the board, the fireplace right.
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

/** Front-right of the room, forward enough to leave the light wall in view. */
export const TREE = { x: 4.25, z: 2.5, radius: 0.9, height: 2.6 } as const;

/** Back wall, left of the board: a wide window with the sofa under it. */
export const SNOW_WINDOW = { x: -3.75, y: 2.15, width: 2.4, height: 1.3 } as const;

/** Against the back wall under the window, facing into the room. */
export const SOFA = {
  x: SNOW_WINDOW.x,
  z: BOARD.wallZ - 0.16 + 0.9 / 2 + 0.03,
  length: 2.0,
  depth: 0.9,
} as const;

/** The floor props, for the clearance checks. */
export function floorFootprints(): Record<string, Footprint> {
  return {
    tree: { x: TREE.x, z: TREE.z, halfX: TREE.radius, halfZ: TREE.radius },
    fireplace: {
      x: FIREPLACE.x,
      z: ROOM.backZ + FIREPLACE.depth / 2,
      halfX: FIREPLACE.width / 2,
      halfZ: FIREPLACE.depth / 2,
    },
    sofa: { x: SOFA.x, z: SOFA.z, halfX: SOFA.length / 2, halfZ: SOFA.depth / 2 },
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
