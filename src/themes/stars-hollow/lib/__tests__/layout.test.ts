import { describe, expect, it } from "vitest";
import { BOARD, CAMERA_FOV } from "@/lib/board-geometry";
import {
  backdrop,
  CAMERA,
  faceCamera,
  FIRST_LOT_S,
  FRONT_LINE,
  GAZEBO,
  GAZEBO_YAW,
  leafPiles,
  SHOPFRONT_YAW,
  shopLots,
  SIGN,
  STREET,
  STREET_RIGHT,
  streetLamps,
  streetPoint,
  trees,
} from "../layout";

/** The disc of ground in props/Ground.tsx. */
const GROUND_RADIUS = 57;
/** The board's frame, left and right edges. */
const BOARD_LEFT = -BOARD.width / 2 - 0.12;
const BOARD_RIGHT = BOARD.width / 2 + 0.12;

/** Horizontal angle of (x, z) off the room camera's line of sight. */
function offAxis(x: number, z: number): number {
  // the camera looks at the middle of the board
  const lx = 0 - CAMERA.x;
  const lz = BOARD.wallZ - CAMERA.z;
  const dx = x - CAMERA.x;
  const dz = z - CAMERA.z;
  // signed angle from the line of sight, positive to the right
  return Math.atan2(lz * dx - lx * dz, lx * dx + lz * dz) * -1;
}
/** Half the horizontal field of view on a 16:9 screen. */
const HALF_HFOV = Math.atan(Math.tan(((CAMERA_FOV / 2) * Math.PI) / 180) * (16 / 9));

describe("faceCamera", () => {
  it("turns a prop's +z face towards the room camera", () => {
    for (const [x, z] of [
      [-4, -3],
      [6, -8],
      [0, -20],
    ]) {
      const yaw = faceCamera(x, z);
      const facing = { x: Math.sin(yaw), z: Math.cos(yaw) };
      const toCam = { x: CAMERA.x - x, z: CAMERA.z - z };
      const len = Math.hypot(toCam.x, toCam.z);
      expect(facing.x * (toCam.x / len) + facing.z * (toCam.z / len)).toBeCloseTo(1, 6);
    }
  });
});

describe("the square", () => {
  it("stands the sign just off the board's left edge, clear of it", () => {
    const signHalfWidth = 1.2; // posts, finials and the stalks tied to them
    expect(SIGN.x + signHalfWidth).toBeLessThan(BOARD_LEFT);
    expect(SIGN.x).toBeGreaterThan(BOARD_LEFT - 3);
  });

  it("puts the sign on screen in the room view", () => {
    expect(Math.abs(offAxis(SIGN.x, SIGN.z))).toBeLessThan(HALF_HFOV);
  });

  it("stands the gazebo behind the sign", () => {
    expect(GAZEBO.z).toBeLessThan(SIGN.z - 3);
    // and to its left, so the sign can't hide the whole of it
    expect(GAZEBO.x).toBeLessThan(SIGN.x);
  });

  it("turns the gazebo's steps away from the sign", () => {
    // The path runs out from the steps; if it pointed at the sign it
    // would run under it.
    const steps = { x: Math.sin(GAZEBO_YAW), z: Math.cos(GAZEBO_YAW) };
    const toSign = { x: SIGN.x - GAZEBO.x, z: SIGN.z - GAZEBO.z };
    const along = steps.x * toSign.x + steps.z * toSign.z;
    const across = Math.abs(steps.x * toSign.z - steps.z * toSign.x);
    expect(along).toBeGreaterThan(0);
    expect(across).toBeGreaterThan(1.8);
  });
});

describe("Main Street", () => {
  const lots = shopLots();

  it("runs past the board without the road touching it", () => {
    // where the street crosses the board's depth
    const t = (BOARD.wallZ - STREET.through.z) / STREET.dir.z;
    const kerb = STREET.through.x + STREET.dir.x * t - STREET.halfWidth / Math.abs(STREET.dir.z);
    // the square-side pavement is 1.1 m wide
    expect(kerb - 1.1).toBeGreaterThan(BOARD_RIGHT);
  });

  it("measures along the street and off to its right", () => {
    const p = streetPoint(10, 2);
    expect(p.x).toBeCloseTo(STREET.through.x + STREET.dir.x * 10 + STREET_RIGHT.x * 2);
    expect(p.z).toBeCloseTo(STREET.through.z + STREET.dir.z * 10 + STREET_RIGHT.z * 2);
    // right is a right angle to the direction of travel
    expect(STREET.dir.x * STREET_RIGHT.x + STREET.dir.z * STREET_RIGHT.z).toBeCloseTo(0);
  });

  it("puts Luke's on the corner, first in the row", () => {
    expect(lots[0].kind).toBe("lukes");
    expect(lots[0].s0).toBe(FIRST_LOT_S);
    expect(lots.filter((l) => l.kind === "lukes")).toHaveLength(1);
  });

  it("has Luke's corner in the room view, without turning your head", () => {
    const corner = streetPoint(lots[0].s0, FRONT_LINE);
    expect(Math.abs(offAxis(corner.x, corner.z))).toBeLessThan(HALF_HFOV);
    // and not hidden behind the board
    const boardEdge = offAxis(BOARD_RIGHT, BOARD.wallZ);
    expect(offAxis(corner.x, corner.z)).toBeGreaterThan(boardEdge);
  });

  it("lines the shops up along the street without overlapping", () => {
    for (let i = 1; i < lots.length; i++) {
      expect(lots[i].s0).toBeGreaterThanOrEqual(lots[i - 1].s1);
    }
    for (const lot of lots) {
      expect(lot.s1 - lot.s0).toBeCloseTo(lot.width);
      expect(lot.s1).toBeLessThanOrEqual(STREET.back);
    }
  });

  it("turns every shopfront to face across the street", () => {
    for (const lot of lots) {
      expect(lot.rot).toBe(SHOPFRONT_YAW);
      const facing = { x: Math.sin(lot.rot), z: Math.cos(lot.rot) };
      // facing is exactly left of the direction of travel: at the road
      expect(facing.x).toBeCloseTo(-STREET_RIGHT.x);
      expect(facing.z).toBeCloseTo(-STREET_RIGHT.z);
    }
  });

  it("lets the shopfronts be seen from the square", () => {
    // a shopfront turned away from the viewer would show its back wall
    for (const lot of lots) {
      const facing = { x: Math.sin(lot.rot), z: Math.cos(lot.rot) };
      const toCam = { x: CAMERA.x - lot.x, z: CAMERA.z - lot.z };
      expect(facing.x * toCam.x + facing.z * toCam.z).toBeGreaterThan(0);
    }
  });

  it("keeps the lamps on the pavement, not in the road", () => {
    for (const lamp of streetLamps()) {
      const dx = lamp.x - STREET.through.x;
      const dz = lamp.z - STREET.through.z;
      const off = dx * STREET_RIGHT.x + dz * STREET_RIGHT.z;
      expect(Math.abs(off)).toBeGreaterThan(STREET.halfWidth);
      expect(Math.sign(off)).toBe(lamp.side);
    }
  });
});

describe("the whole plan", () => {
  const everything = [
    ...shopLots().map((l) => ({ what: l.kind, x: l.x, z: l.z })),
    ...backdrop().map((b) => ({ what: b.kind, x: b.x, z: b.z })),
    ...trees().map((t) => ({ what: t.species, x: t.x, z: t.z })),
    ...leafPiles().map((p) => ({ what: "leaves", x: p.x, z: p.z })),
    { what: "sign", x: SIGN.x, z: SIGN.z },
    { what: "gazebo", x: GAZEBO.x, z: GAZEBO.z },
  ];

  it("stands everything on the ground, well inside its edge", () => {
    for (const o of everything) {
      expect(Math.hypot(o.x, o.z), o.what).toBeLessThan(GROUND_RADIUS - 8);
    }
  });

  it("keeps everything out of the viewer's lap", () => {
    for (const o of everything) {
      expect(o.z, o.what).toBeLessThan(0);
    }
  });

  it("keeps the square's trees off the road, the gazebo and the sign", () => {
    for (const t of trees().filter((t) => t.species !== "street")) {
      expect(Math.hypot(t.x - GAZEBO.x, t.z - GAZEBO.z)).toBeGreaterThan(GAZEBO.radius + 1);
      expect(Math.hypot(t.x - SIGN.x, t.z - SIGN.z)).toBeGreaterThan(2);
      const off = (t.x - STREET.through.x) * STREET_RIGHT.x + (t.z - STREET.through.z) * STREET_RIGHT.z;
      expect(Math.abs(off)).toBeGreaterThan(STREET.halfWidth + 1);
    }
  });

  it("keeps the street trees off Luke's frontage", () => {
    const [lukes] = shopLots();
    for (const t of trees().filter((t) => t.species === "street")) {
      const s = (t.x - STREET.through.x) * STREET.dir.x + (t.z - STREET.through.z) * STREET.dir.z;
      expect(s < lukes.s0 - 1 || s > lukes.s1 + 1).toBe(true);
    }
  });

  it("gives every building a different seed", () => {
    const seeds = [...shopLots(), ...backdrop()].map((b) => b.seed);
    expect(new Set(seeds).size).toBe(seeds.length);
  });
});
