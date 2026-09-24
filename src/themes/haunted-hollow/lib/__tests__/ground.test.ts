import { describe, expect, it } from "vitest";
import {
  GROUND_RELIEF,
  groundHeight,
  scatterLitter,
  STAGE_CENTRE,
  STAGE_FADE,
  STAGE_FLAT,
} from "../ground";

/** Everything HauntedScene places, so the flat-stage claim is testable. */
const PLACED: [number, number][] = [
  [-5.8, -7.0], // the house
  [0, 0], // the board
  [2.8, -1.5], // graves
  [5.4, -0.8],
  [5.0, -2.6],
  [-2.6, -9.8], // trees
  [1.8, -10.5],
  [6.8, -8.6],
  [9.2, -5.4],
  [10.4, -9.2],
  [10.8, -2.4],
  [7.6, -11.8],
  [4.3, -3.5], // a pumpkin
];

describe("groundHeight", () => {
  it("is dead flat everywhere the scene stands something", () => {
    for (const [x, z] of PLACED) {
      expect(groundHeight(x, z)).toBe(0);
    }
  });

  it("is flat across the whole stage disc, not just at its centre", () => {
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      // Strictly inside: sweeping to exactly STAGE_FLAT lands a hair
      // outside it once cos/sin have rounded, which is the fade doing
      // its job rather than the stage failing.
      for (const r of [0, 4, 9, 14, STAGE_FLAT - 0.001]) {
        const x = STAGE_CENTRE.x + Math.cos(a) * r;
        const z = STAGE_CENTRE.z + Math.sin(a) * r;
        expect(groundHeight(x, z)).toBe(0);
      }
    }
  });

  it("starts from nothing at the stage edge", () => {
    for (let a = 0; a < Math.PI * 2; a += 0.1) {
      const x = STAGE_CENTRE.x + Math.cos(a) * STAGE_FLAT;
      const z = STAGE_CENTRE.z + Math.sin(a) * STAGE_FLAT;
      expect(groundHeight(x, z)).toBeCloseTo(0, 9);
    }
  });

  it("rolls once it is past the stage", () => {
    let moved = false;
    for (let a = 0; a < Math.PI * 2; a += 0.2) {
      const r = STAGE_FLAT + STAGE_FADE + 8;
      const h = groundHeight(
        STAGE_CENTRE.x + Math.cos(a) * r,
        STAGE_CENTRE.z + Math.sin(a) * r
      );
      if (Math.abs(h) > 0.15) moved = true;
    }
    expect(moved).toBe(true);
  });

  it("never exceeds the relief it promises", () => {
    for (let x = -45; x <= 45; x += 0.9) {
      for (let z = -40; z <= 40; z += 0.9) {
        expect(Math.abs(groundHeight(x, z))).toBeLessThanOrEqual(GROUND_RELIEF);
      }
    }
  });

  it("has no crease where the flat part ends", () => {
    // Step outwards across the boundary; no single step may jump.
    for (let a = 0; a < Math.PI * 2; a += 0.15) {
      let prev = 0;
      for (let r = STAGE_FLAT - 2; r < STAGE_FLAT + STAGE_FADE + 4; r += 0.1) {
        const h = groundHeight(
          STAGE_CENTRE.x + Math.cos(a) * r,
          STAGE_CENTRE.z + Math.sin(a) * r
        );
        expect(Math.abs(h - prev)).toBeLessThan(0.06);
        prev = h;
      }
    }
  });

  it("is deterministic", () => {
    expect(groundHeight(31.5, -27.25)).toBe(groundHeight(31.5, -27.25));
  });

  it("does not repeat into a grid", () => {
    // If one wavelength dominated, points a period apart would match.
    const a = groundHeight(34, -30);
    const b = groundHeight(34 + 2 * Math.PI / 0.083, -30);
    expect(Math.abs(a - b)).toBeGreaterThan(0.01);
  });
});

describe("scatterLitter", () => {
  const area = { x0: -20, x1: 20, z0: -18, z1: 6 };

  it("is deterministic", () => {
    expect(scatterLitter(3, 40, area)).toEqual(scatterLitter(3, 40, area));
  });

  it("produces what it was asked for", () => {
    expect(scatterLitter(3, 64, area)).toHaveLength(64);
  });

  it("stays inside the area", () => {
    for (const s of scatterLitter(9, 300, area)) {
      expect(s.x).toBeGreaterThanOrEqual(area.x0);
      expect(s.x).toBeLessThanOrEqual(area.x1);
      expect(s.z).toBeGreaterThanOrEqual(area.z0);
      expect(s.z).toBeLessThanOrEqual(area.z1);
    }
  });

  it("keeps out of the discs it is told to avoid", () => {
    const clear = [
      { x: 0, z: 0, r: 3 },
      { x: -8, z: -7, r: 4.5 },
    ];
    for (const s of scatterLitter(11, 250, area, clear)) {
      for (const c of clear) {
        expect(Math.hypot(s.x - c.x, s.z - c.z)).toBeGreaterThanOrEqual(c.r);
      }
    }
  });

  it("stays evenly spread rather than ringing an obstacle", () => {
    const clear = [{ x: 0, z: -6, r: 5 }];
    const out = scatterLitter(13, 400, area, clear);
    // count the ones in the annulus just outside the disc vs a band of
    // equal area further out; a push-aside implementation piles them up
    const ring = out.filter((s) => {
      const d = Math.hypot(s.x, s.z + 6);
      return d >= 5 && d < 6;
    }).length;
    const outer = out.filter((s) => {
      const d = Math.hypot(s.x, s.z + 6);
      return d >= 6 && d < Math.sqrt(6 * 6 + (6 * 6 - 5 * 5));
    }).length;
    expect(ring).toBeLessThan(outer * 2.2);
  });

  it("gives up rather than spinning forever when nowhere is free", () => {
    const impossible = [{ x: 0, z: -6, r: 500 }];
    const out = scatterLitter(17, 50, area, impossible);
    expect(out).toHaveLength(0);
  });

  it("points litter in every direction and varies its size", () => {
    const out = scatterLitter(21, 200, area);
    const quadrants = new Set(out.map((s) => Math.floor(s.rot / (Math.PI / 2))));
    expect(quadrants.size).toBe(4);
    const scales = out.map((s) => s.scale);
    expect(Math.max(...scales) - Math.min(...scales)).toBeGreaterThan(0.4);
  });

  it("gives different seeds different fields", () => {
    expect(scatterLitter(1, 20, area)[0]).not.toEqual(
      scatterLitter(2, 20, area)[0]
    );
  });
});
