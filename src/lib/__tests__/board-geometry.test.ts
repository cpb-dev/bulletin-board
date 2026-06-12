import { describe, expect, it } from "vitest";
import {
  BOARD,
  clamp,
  normToWorld,
  photoPlaneSize,
  randomTilt,
  round3,
  suggestPlacement,
  usableHalfExtents,
  worldToNorm,
  wrapLines,
} from "../board-geometry";

describe("normToWorld / worldToNorm", () => {
  it("maps the centre of the board to the centre of the world space", () => {
    const { x, y } = normToWorld(0, 0);
    expect(x).toBe(0);
    expect(y).toBe(BOARD.centerY);
  });

  it("round-trips positions", () => {
    for (const [nx, ny] of [
      [0.5, -0.25],
      [-1, 1],
      [0.123, 0.987],
    ]) {
      const w = normToWorld(nx, ny);
      const n = worldToNorm(w.x, w.y);
      expect(n.nx).toBeCloseTo(nx, 6);
      expect(n.ny).toBeCloseTo(ny, 6);
    }
  });

  it("keeps items inside the frame margin", () => {
    const { x } = normToWorld(1, 0);
    expect(x).toBeLessThan(BOARD.width / 2 - BOARD.margin + 1e-9);
  });

  it("clamps out-of-bounds world positions to the board edge", () => {
    const n = worldToNorm(100, -100);
    expect(n.nx).toBe(1);
    expect(n.ny).toBe(-1);
  });
});

describe("usableHalfExtents", () => {
  it("shrinks the usable area for larger items", () => {
    const small = usableHalfExtents(0, 0);
    const big = usableHalfExtents(0.3, 0.3);
    expect(big.hx).toBeLessThan(small.hx);
    expect(big.hy).toBeLessThan(small.hy);
  });

  it("never returns negative extents", () => {
    const { hx, hy } = usableHalfExtents(100, 100);
    expect(hx).toBe(0);
    expect(hy).toBe(0);
  });
});

describe("clamp / round3", () => {
  it("clamps", () => {
    expect(clamp(5, 0, 1)).toBe(1);
    expect(clamp(-5, 0, 1)).toBe(0);
    expect(clamp(0.5, 0, 1)).toBe(0.5);
  });

  it("rounds to three decimal places", () => {
    expect(round3(0.123456)).toBe(0.123);
    expect(round3(-0.9999)).toBe(-1);
  });
});

describe("randomTilt", () => {
  it("stays within about five degrees either way", () => {
    for (const r of [0, 0.25, 0.5, 0.75, 0.999]) {
      const tilt = randomTilt(() => r);
      expect(Math.abs(tilt)).toBeLessThanOrEqual(0.09);
    }
  });
});

describe("suggestPlacement", () => {
  // deterministic fake RNG
  const seq = (...values: number[]) => {
    let i = 0;
    return () => values[i++ % values.length];
  };

  it("places the first item near the middle", () => {
    const spot = suggestPlacement([], seq(0.5, 0.5, 0.1, 0.9, 0.9, 0.1));
    expect(Math.abs(spot.x)).toBeLessThanOrEqual(0.85);
    expect(Math.abs(spot.y)).toBeLessThanOrEqual(0.75);
  });

  it("avoids existing items", () => {
    const crowd = [{ x: 0, y: 0 }];
    // candidates: dead centre (collides) and a far corner
    const spot = suggestPlacement(crowd, seq(0.5, 0.5, 0.95, 0.95));
    expect(Math.hypot(spot.x, spot.y)).toBeGreaterThan(0.5);
  });

  it("always returns positions inside the board", () => {
    for (let seed = 0; seed < 20; seed++) {
      const spot = suggestPlacement([{ x: 0.2, y: 0.1 }]);
      expect(Math.abs(spot.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(spot.y)).toBeLessThanOrEqual(1);
    }
  });
});

describe("wrapLines", () => {
  const measure = (s: string) => s.length * 10;

  it("wraps long text at the width limit", () => {
    const lines = wrapLines("hello my lovely darling", 100, measure);
    expect(lines.length).toBeGreaterThan(1);
    for (const line of lines) expect(measure(line)).toBeLessThanOrEqual(100);
  });

  it("preserves explicit line breaks", () => {
    expect(wrapLines("a\nb", 1000, measure)).toEqual(["a", "b"]);
  });

  it("keeps blank lines", () => {
    expect(wrapLines("a\n\nb", 1000, measure)).toEqual(["a", "", "b"]);
  });

  it("never drops words, even ones wider than the limit", () => {
    const lines = wrapLines("supercalifragilistic", 50, measure);
    expect(lines.join(" ")).toContain("supercalifragilistic");
  });
});

describe("photoPlaneSize", () => {
  it("uses a fixed width", () => {
    expect(photoPlaneSize(400, 300).width).toBe(0.62);
  });

  it("clamps very tall photos", () => {
    expect(photoPlaneSize(100, 1000).height).toBeLessThanOrEqual(0.85);
  });

  it("clamps very wide photos", () => {
    expect(photoPlaneSize(1000, 100).height).toBeGreaterThanOrEqual(0.4);
  });

  it("handles missing dimensions gracefully", () => {
    const { width, height } = photoPlaneSize(0, 0);
    expect(width).toBeGreaterThan(0);
    expect(height).toBeGreaterThan(0);
  });
});
