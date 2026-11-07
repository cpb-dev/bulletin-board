/**
 * Where everything stands in the Christmas Cabin (BB-35).
 *
 * Pure data and maths, so the arrangement is tested without a renderer:
 * nothing stands between the room camera and the board, nothing pokes
 * through a wall, and the tree doesn't hide the alphabet wall.
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

/** Back wall, left of the board. */
export const FIREPLACE = { x: -3.7, width: 2.2, depth: 0.7 } as const;

/** Back wall, right of the board: painted letters under a light string. */
export const ALPHABET_WALL = {
  x: 3.85,
  y: 1.95,
  width: 2.5,
  height: 1.5,
  rows: ["ABCDEFGH", "IJKLMNOPQ", "RSTUVWXYZ"],
} as const;

/** Front-right of the room, forward enough to leave the light wall in view. */
export const TREE = { x: 4.1, z: 1.4, radius: 0.9, height: 2.6 } as const;

/** Against the left wall, facing into the room. */
export const SOFA = { x: -4.55, z: 1.2, length: 2.0, depth: 0.9 } as const;

/** In the left wall, above the sofa. */
export const SNOW_WINDOW = { z: 1.2, y: 2.15, width: 1.5, height: 1.2 } as const;

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
    // Turned side-on against the left wall: long along z.
    sofa: { x: SOFA.x, z: SOFA.z, halfX: SOFA.depth / 2, halfZ: SOFA.length / 2 },
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

/**
 * Where the sight line from the room camera to a point on the back wall
 * crosses depth `z`, as an x. Used to check the tree stands clear of the
 * line to the alphabet wall.
 */
export function sightLineX(wallX: number, z: number): number {
  const t = (ROOM_CAMERA.z - z) / (ROOM_CAMERA.z - ROOM.backZ);
  return ROOM_CAMERA.x + (wallX - ROOM_CAMERA.x) * t;
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
