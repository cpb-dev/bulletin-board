import { describe, expect, it } from "vitest";
import {
  brokenLight,
  candleFlicker,
  lightRect,
  paneGrid,
} from "@/lib/window-pane";

/** The two window sizes the haunted house actually uses. */
const BIG = { w: 0.9, h: 1.1 };
const SMALL = { w: 0.8, h: 0.9 };

describe("paneGrid", () => {
  it("divides the house's own windows into readable lights", () => {
    for (const { w, h } of [BIG, SMALL]) {
      const grid = paneGrid(w, h);
      expect(grid.cols).toBeGreaterThanOrEqual(2);
      expect(grid.rows).toBeGreaterThanOrEqual(2);
      // fine enough to read as glazing, coarse enough to read at all
      expect(grid.cols * grid.rows).toBeLessThanOrEqual(12);
    }
  });

  it("keeps lights taller than they are wide, the way sash glazing runs", () => {
    for (const { w, h } of [BIG, SMALL]) {
      const grid = paneGrid(w, h);
      expect(h / grid.rows).toBeGreaterThan((w / grid.cols) * 0.8);
    }
  });

  it("never returns a single sheet of glass, however small the window", () => {
    for (const w of [0.1, 0.3, 0.6, 0.9, 2]) {
      for (const h of [0.1, 0.4, 0.9, 1.4, 3]) {
        const grid = paneGrid(w, h);
        expect(grid.cols).toBeGreaterThanOrEqual(2);
        expect(grid.rows).toBeGreaterThanOrEqual(2);
        expect(Number.isInteger(grid.cols)).toBe(true);
        expect(Number.isInteger(grid.rows)).toBe(true);
      }
    }
  });
});

describe("lightRect", () => {
  const grid = paneGrid(BIG.w, BIG.h);
  const count = grid.cols * grid.rows;

  it("tiles the pane exactly, with no gap and no overlap", () => {
    let area = 0;
    for (let i = 0; i < count; i++) {
      const r = lightRect(grid, i);
      expect(r.x1).toBeGreaterThan(r.x0);
      expect(r.y1).toBeGreaterThan(r.y0);
      expect(r.x0).toBeGreaterThanOrEqual(0);
      expect(r.y0).toBeGreaterThanOrEqual(0);
      expect(r.x1).toBeLessThanOrEqual(1);
      expect(r.y1).toBeLessThanOrEqual(1);
      area += (r.x1 - r.x0) * (r.y1 - r.y0);
    }
    expect(area).toBeCloseTo(1, 10);
  });

  it("numbers left to right, bottom to top", () => {
    expect(lightRect(grid, 0)).toEqual({
      x0: 0,
      y0: 0,
      x1: 1 / grid.cols,
      y1: 1 / grid.rows,
    });
    expect(lightRect(grid, 1).x0).toBeGreaterThan(lightRect(grid, 0).x0);
    expect(lightRect(grid, grid.cols).y0).toBeGreaterThan(
      lightRect(grid, 0).y0
    );
  });

  it("wraps rather than running off the pane", () => {
    expect(lightRect(grid, count)).toEqual(lightRect(grid, 0));
    expect(lightRect(grid, -1)).toEqual(lightRect(grid, count - 1));
  });
});

describe("brokenLight", () => {
  const grid = paneGrid(BIG.w, BIG.h);

  it("leaves most windows whole", () => {
    const broken = Array.from({ length: 200 }, (_, i) =>
      brokenLight(i + 1, grid)
    );
    const gone = broken.filter((b) => b !== null).length;
    // a house where every window is broken reads as derelict rather
    // than lived in by something
    expect(gone).toBeGreaterThan(20);
    expect(gone / broken.length).toBeLessThan(0.6);
  });

  it("never breaks a light in the bottom row", () => {
    for (let seed = 1; seed < 300; seed++) {
      const b = brokenLight(seed, grid);
      if (b === null) continue;
      expect(b).toBeGreaterThanOrEqual(grid.cols);
      expect(b).toBeLessThan(grid.cols * grid.rows);
      expect(Number.isInteger(b)).toBe(true);
    }
  });

  it("is stable for a seed", () => {
    expect(brokenLight(5, grid)).toBe(brokenLight(5, grid));
  });
});

describe("candleFlicker", () => {
  it("stays in a range that reads as a flame, not a strobe", () => {
    for (let t = 0; t < 400; t += 0.01) {
      const f = candleFlicker(t, 3);
      expect(f).toBeGreaterThan(0.5);
      expect(f).toBeLessThan(1.15);
    }
  });

  it("guts now and then rather than pulsing evenly", () => {
    const xs: number[] = [];
    for (let t = 0; t < 600; t += 0.02) xs.push(candleFlicker(t, 1));
    const low = xs.filter((x) => x < 0.85).length / xs.length;
    expect(low).toBeGreaterThan(0.001);
    expect(low).toBeLessThan(0.1);
  });

  it("does not line up between windows", () => {
    expect(Math.abs(candleFlicker(12.3, 1) - candleFlicker(12.3, 2)))
      .toBeGreaterThan(0.001);
  });

  it("is smooth frame to frame", () => {
    for (let t = 0; t < 200; t += 1 / 60) {
      expect(
        Math.abs(candleFlicker(t + 1 / 60, 2) - candleFlicker(t, 2))
      ).toBeLessThan(0.1);
    }
  });
});
