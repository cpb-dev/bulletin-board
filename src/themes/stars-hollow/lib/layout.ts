/**
 * Where everything stands in Stars Hollow.
 *
 * Pure numbers, so the plan of the town can be checked without a
 * renderer: that nothing is in the viewer's lap, that no shop stands in
 * the road or on top of its neighbour, and that everything with a front
 * is turned to be seen. The meshes in `../props/` read from here and
 * never place themselves.
 *
 * The plan, as you stand in front of the board:
 *
 *  - the board stands on the grass of the town square;
 *  - the town sign stands just off its left edge, and the gazebo behind
 *    that, further back on the square;
 *  - off to the right, Main Street runs away from you, Luke's on the
 *    near corner and the rest of the shops lining it into the distance;
 *  - across the far side of the square, a second row of buildings, tall
 *    enough to show over the top of the board.
 */

/** The room-view camera, from `CameraRig`. */
export const CAMERA = { x: 0.4, y: 1.45, z: 4.4 } as const;

/** The yaw (about +y) that turns a prop's +z face towards the camera. */
export function faceCamera(x: number, z: number): number {
  return Math.atan2(CAMERA.x - x, CAMERA.z - z);
}

/** The town sign, just off the board's left edge. */
export const SIGN = { x: -4.15, z: -3.4 } as const;

/**
 * The gazebo, behind the sign on the square — behind and a little to
 * its left, so the sign stands in front of it the way it does on the
 * real square, without hiding the whole of it from the room view.
 */
export const GAZEBO = { x: -8.8, z: -9.8, radius: 3.0, scale: 1.2 } as const;

/**
 * Which way the gazebo's steps face: not straight at the viewer, which
 * would run its path through the sign, but across towards the board,
 * so the path from the steps passes the sign on its right.
 */
export const GAZEBO_YAW = Math.atan2(0 - GAZEBO.x, -3.2 - GAZEBO.z);

/* ------------------------------------------------------------------ */
/*  Main Street                                                        */
/* ------------------------------------------------------------------ */

/**
 * Main Street runs away from the viewer along a line through `through`,
 * leaning left as it goes so the far shops come out from behind the
 * board rather than disappearing off the right of the screen.
 */
export const STREET = {
  /** A point on the street's centre line, level with the board. */
  through: { x: 5.1, z: -2.2 },
  /** Direction of travel, away from the viewer (unit length). */
  dir: normalise(-0.25, -0.968),
  /** Half the width of the carriageway. */
  halfWidth: 1.45,
  /** Kerb to shopfront. */
  sidewalk: 1.35,
  /** How far the street runs back from `through`, and forward of it. */
  back: 46,
  front: 9,
} as const;

function normalise(x: number, z: number): { x: number; z: number } {
  const l = Math.hypot(x, z);
  return { x: x / l, z: z / l };
}

/** To the right of the direction of travel. */
export const STREET_RIGHT = { x: -STREET.dir.z, z: STREET.dir.x } as const;

/**
 * A point `s` metres along the street from `through` (positive is away
 * from the viewer), `offset` metres to its right.
 */
export function streetPoint(s: number, offset = 0): { x: number; z: number } {
  return {
    x: STREET.through.x + STREET.dir.x * s + STREET_RIGHT.x * offset,
    z: STREET.through.z + STREET.dir.z * s + STREET_RIGHT.z * offset,
  };
}

/**
 * The yaw that turns a prop's +z face to look across the street at
 * the square — the way every shopfront on the right-hand side faces.
 */
export const SHOPFRONT_YAW = Math.atan2(-STREET_RIGHT.x, -STREET_RIGHT.z);

/** The yaw along the street, for things that run with it (the road). */
export const STREET_YAW = Math.atan2(STREET.dir.x, STREET.dir.z);

/** Distance from the centre line to the shopfronts. */
export const FRONT_LINE = STREET.halfWidth + STREET.sidewalk;

export type ShopKind =
  | "lukes"
  | "brick-teal"
  | "brick-arched"
  | "victorian"
  | "clapboard"
  | "brick-tall";

export interface ShopLot {
  kind: ShopKind;
  /** What's painted over the shop window. */
  sign?: string;
  /** Frontage along the street, metres. */
  width: number;
  /** Depth back from the pavement, metres. */
  depth: number;
  /** Storeys above the shop. */
  floors: number;
  /** Where the lot starts and ends along the street. */
  s0: number;
  s1: number;
  /** World position of the middle of the shopfront, at ground level. */
  x: number;
  z: number;
  /** Yaw turning the shopfront (+z) to face the street. */
  rot: number;
  /** Seeds colours and small variations. */
  seed: number;
}

/**
 * The shops down the right-hand side of Main Street, nearest first.
 * Luke's takes the corner. The rest are the town the show was set in —
 * a market, the antiques shop, the bookshop — without being copies of
 * any one frontage.
 */
const SHOPS: Omit<ShopLot, "s0" | "s1" | "x" | "z" | "rot">[] = [
  { kind: "lukes", width: 4.6, depth: 3.6, floors: 1, seed: 1 },
  { kind: "brick-teal", sign: "DOOSE'S MARKET", width: 5.2, depth: 5, floors: 1, seed: 2 },
  { kind: "victorian", sign: "ANTIQUES", width: 4.2, depth: 5, floors: 2, seed: 3 },
  { kind: "brick-arched", sign: "BOOKS", width: 4.6, depth: 5, floors: 1, seed: 4 },
  { kind: "clapboard", sign: "BAKERY", width: 3.8, depth: 5, floors: 1, seed: 5 },
  { kind: "brick-tall", sign: "HARDWARE", width: 5.0, depth: 5, floors: 2, seed: 6 },
  { kind: "brick-teal", sign: "FLOWERS", width: 4.0, depth: 5, floors: 1, seed: 7 },
  { kind: "victorian", sign: "SODA SHOPPE", width: 4.6, depth: 5, floors: 2, seed: 8 },
];

/** Where Luke's corner starts along the street. */
export const FIRST_LOT_S = 3.4;

/** A narrow alley between some of the shops, so the row isn't a wall. */
const GAPS = [0, 0.15, 0, 0.9, 0.1, 0, 0.8, 0];

export function shopLots(): ShopLot[] {
  const lots: ShopLot[] = [];
  let s = FIRST_LOT_S;
  SHOPS.forEach((shop, i) => {
    s += GAPS[i] ?? 0;
    const s0 = s;
    const s1 = s + shop.width;
    const mid = streetPoint((s0 + s1) / 2, FRONT_LINE);
    lots.push({ ...shop, s0, s1, x: mid.x, z: mid.z, rot: SHOPFRONT_YAW });
    s = s1;
  });
  return lots;
}

/**
 * Street lamps along the kerb on the shop side, and on the square side.
 * `side` is +1 for the shop side, -1 for the square.
 */
export function streetLamps(): { x: number; z: number; side: 1 | -1 }[] {
  const out: { x: number; z: number; side: 1 | -1 }[] = [];
  for (const s of [-1, 9, 19, 29]) {
    const p = streetPoint(s, STREET.halfWidth + 0.35);
    out.push({ ...p, side: 1 });
  }
  for (const s of [3.5, 15, 27]) {
    const p = streetPoint(s, -(STREET.halfWidth + 0.45));
    out.push({ ...p, side: -1 });
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  The far side of the square                                         */
/* ------------------------------------------------------------------ */

export type BackdropKind = "church" | "town-hall" | "studio" | "house" | "inn";

export interface BackdropBuilding {
  kind: BackdropKind;
  x: number;
  z: number;
  rot: number;
  width: number;
  seed: number;
  sign?: string;
}

/**
 * The buildings across the far side of the square. Tall enough that
 * their roofs and the church spire show over the top of the board.
 */
export function backdrop(): BackdropBuilding[] {
  const rows: (Omit<BackdropBuilding, "rot"> & { rot?: number })[] = [
    { kind: "town-hall", x: -15.5, z: -17, width: 8, seed: 11 },
    { kind: "studio", x: -7.5, z: -21, width: 6, seed: 12, sign: "MISS PATTY'S" },
    { kind: "church", x: -1.2, z: -25, width: 6, seed: 13 },
    { kind: "house", x: 4.8, z: -26, width: 5.5, seed: 14 },
    { kind: "inn", x: -21, z: -9, width: 7, seed: 15 },
    // Down the side street past Luke's, facing back up it.
    ...[10.5, 17.5].map((t, i) => {
      const kerb = streetPoint(FIRST_LOT_S - 1.4 - 1.5, STREET.halfWidth + t);
      return {
        kind: "house" as const,
        // back from the side street by its half-width, a pavement and
        // the depth of a porch
        x: kerb.x + STREET.dir.x * 5.6,
        z: kerb.z + STREET.dir.z * 5.6,
        width: 5.5,
        seed: 16 + i,
        rot: Math.atan2(-STREET.dir.x, -STREET.dir.z),
      };
    }),
  ];
  return rows.map((b) => ({
    ...b,
    // Turned partly towards the viewer, not squarely, so each one reads
    // as a building rather than a flat.
    rot: b.rot ?? faceCamera(b.x, b.z) * 0.55,
  }));
}

/* ------------------------------------------------------------------ */
/*  Trees, and what's under them                                       */
/* ------------------------------------------------------------------ */

export interface TreeSpot {
  species: "maple" | "street" | "sycamore";
  x: number;
  z: number;
  seed: number;
  scale: number;
}

/**
 * The square's trees, and the little ones planted along Main Street.
 *
 * Big maples stand back on the green where their crowns fill the sky
 * either side of the gazebo and over the top of the board; the old
 * sycamore stands behind the board, tall enough to be seen over it, as
 * the big bare tree does in the middle of the real square.
 */
export function trees(): TreeSpot[] {
  const square: TreeSpot[] = [
    { species: "maple", x: -13.4, z: -12.8, seed: 3, scale: 1.15 },
    { species: "maple", x: -2.6, z: -13.8, seed: 5, scale: 1.05 },
    { species: "maple", x: -11.4, z: -3.2, seed: 8, scale: 0.95 },
    { species: "maple", x: -0.6, z: -10.2, seed: 12, scale: 1.0 },
    { species: "maple", x: -17.5, z: -19, seed: 21, scale: 1.2 },
    { species: "maple", x: -9.5, z: -26, seed: 23, scale: 1.25 },
    { species: "sycamore", x: -4.8, z: -19.5, seed: 2, scale: 1.1 },
    { species: "sycamore", x: 7.5, z: -31, seed: 4, scale: 1.0 },
    // the corner across the side street from Luke's
    { species: "maple", x: 11.2, z: -0.6, seed: 27, scale: 0.95 },
    { species: "maple", x: 16.5, z: -2.2, seed: 29, scale: 1.1 },
  ];
  // Along the kerb on the shop side, between the lamps — and none in
  // front of Luke's, which stays in full view.
  const street: TreeSpot[] = [14, 24, 34].map((s, i) => ({
    species: "street" as const,
    ...streetPoint(s, STREET.halfWidth + 0.55),
    seed: 31 + i,
    scale: 1 + (i % 2) * 0.12,
  }));
  return [...square, ...street];
}

/** Heaps of raked leaves on the green. */
export function leafPiles(): { x: number; z: number; r: number; seed: number }[] {
  return [
    { x: -5.3, z: -3.6, r: 0.75, seed: 1 },
    { x: -9.8, z: -4.6, r: 0.95, seed: 2 },
    { x: -3.2, z: -7.4, r: 0.6, seed: 3 },
    { x: 2.4, z: -5.8, r: 0.7, seed: 4 },
  ];
}
