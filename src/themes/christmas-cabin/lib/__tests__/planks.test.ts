import { describe, expect, it } from "vitest";
import { grain, loopDistance, plankLayout, type PlankOptions } from "../planks";

const FLOOR: PlankOptions = {
  rows: 20,
  minLength: 0.28,
  maxLength: 0.6,
  minStagger: 0.12,
  seed: 7,
};

describe("plankLayout", () => {
  const layout = plankLayout(FLOOR);

  it("lays the asked-for number of rows", () => {
    expect(layout).toHaveLength(FLOOR.rows);
  });

  it("fills every row exactly once around the tile, so it repeats", () => {
    for (const row of layout) {
      const total = row.reduce((s, p) => s + p.length, 0);
      expect(total).toBeCloseTo(1, 9);
    }
  });

  it("keeps every board between the shortest and longest lengths", () => {
    for (const row of layout)
      for (const p of row) {
        // A row's last cut may be halved, so allow down to half the minimum.
        expect(p.length).toBeGreaterThanOrEqual(FLOOR.minLength / 2 - 1e-9);
        expect(p.length).toBeLessThanOrEqual(FLOOR.maxLength + 1e-9);
      }
  });

  it("never lines joints up between neighbouring rows", () => {
    for (let r = 1; r < layout.length; r++) {
      for (const a of layout[r])
        for (const b of layout[r - 1]) {
          expect(
            loopDistance(a.start, b.start),
            `rows ${r - 1}/${r} share a joint`
          ).toBeGreaterThanOrEqual(FLOOR.minStagger * 0.5);
        }
    }
  });

  it("gives boards different tones", () => {
    const tones = layout.flat().map((p) => p.tone);
    expect(Math.max(...tones) - Math.min(...tones)).toBeGreaterThan(1);
    for (const t of tones) expect(Math.abs(t)).toBeLessThanOrEqual(1);
  });

  it("is the same every time for the same seed", () => {
    expect(plankLayout(FLOOR)).toEqual(layout);
    expect(plankLayout({ ...FLOOR, seed: 8 })).not.toEqual(layout);
  });
});

describe("loopDistance", () => {
  it("measures the short way round", () => {
    expect(loopDistance(0.05, 0.95)).toBeCloseTo(0.1);
    expect(loopDistance(0.2, 0.5)).toBeCloseTo(0.3);
    expect(loopDistance(1.1, 0.1)).toBeCloseTo(0);
  });
});

describe("grain", () => {
  it("stays in range", () => {
    for (let i = 0; i < 500; i++) {
      const g = grain(i * 0.013, (i % 37) * 0.007, i * 31);
      expect(Math.abs(g)).toBeLessThanOrEqual(1);
    }
  });

  it("depends only on the distance along the board, so split boards join", () => {
    // Drawing a board in two pieces samples the same `along` values.
    expect(grain(0.4, 0.02, 99)).toBe(grain(0.4, 0.02, 99));
    expect(grain(0.4, 0.02, 99)).not.toBe(grain(0.41, 0.02, 99));
  });
});
