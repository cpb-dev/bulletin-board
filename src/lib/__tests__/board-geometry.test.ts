import { describe, expect, it } from "vitest";
import {
  BOARD,
  clamp,
  clampScale,
  EXTENDED_MAX_NX,
  MAX_ITEM_SCALE,
  MIN_ITEM_SCALE,
  normToWorld,
  placementBox,
  photoPlaneSize,
  randomTilt,
  round3,
  scaleFromHandleDrag,
  suggestPlacement,
  usableHalfExtents,
  visibleHalfExtents,
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

  it("lands near where the camera is looking, not the far end", () => {
    const view = { focus: { x: -0.7, y: 0.5 }, zoom: 1.5, aspect: 1.6 };
    const box = placementBox(view);
    // Guard against the assertion below passing only because the box
    // collapsed to a point.
    expect(box.maxX - box.minX).toBeGreaterThan(0.1);
    expect(box.maxY - box.minY).toBeGreaterThan(0.1);

    // One item right under the camera: without a view the best clearance
    // would be the opposite corner, off screen.
    for (let seed = 0; seed < 20; seed++) {
      const spot = suggestPlacement([{ x: -0.7, y: 0.5 }], Math.random, view);
      expect(Math.abs(spot.x - view.focus.x)).toBeLessThanOrEqual(0.25);
      expect(Math.abs(spot.y - view.focus.y)).toBeLessThanOrEqual(0.25);
    }
  });

  it("centres the item when zoomed in too close to fit a spread", () => {
    // Phone-shaped viewport, nose to the cork: a note is wider than the
    // screen, so the only sensible spot is dead centre of view.
    const view = { focus: { x: 0.3, y: -0.2 }, zoom: 4, aspect: 0.5 };
    const spot = suggestPlacement([{ x: 0.3, y: -0.2 }], Math.random, view);
    expect(spot.x).toBeCloseTo(0.3);
    expect(spot.y).toBeCloseTo(-0.2);
  });

  it("still spreads across the whole board with no view", () => {
    const spread = new Set<string>();
    for (let seed = 0; seed < 40; seed++) {
      const spot = suggestPlacement([{ x: 0, y: 0 }]);
      spread.add(spot.x > 0 ? "right" : "left");
    }
    expect(spread.size).toBe(2);
  });
});

describe("placementBox", () => {
  it("covers the whole main board when standing back in the room", () => {
    const box = placementBox();
    expect(box.minX).toBeCloseTo(-0.85);
    expect(box.maxX).toBeCloseTo(0.85);
    expect(box.minY).toBeCloseTo(-0.75);
    expect(box.maxY).toBeCloseTo(0.75);
  });

  it("never spills off the main board when looking at its edge", () => {
    const box = placementBox({ focus: { x: 0.85, y: 0.75 }, zoom: 1 });
    expect(box.maxX).toBeLessThanOrEqual(0.85 + 1e-9);
    expect(box.maxY).toBeLessThanOrEqual(0.75 + 1e-9);
  });

  it("tightens as you zoom in", () => {
    const wide = placementBox({ focus: { x: 0, y: 0 }, zoom: 1 });
    const close = placementBox({ focus: { x: 0, y: 0 }, zoom: 4 });
    expect(close.maxX - close.minX).toBeLessThan(wide.maxX - wide.minX);
    expect(close.maxY - close.minY).toBeLessThan(wide.maxY - wide.minY);
  });

  it("places onto the mini board when panned over to it", () => {
    const box = placementBox({
      focus: { x: 2.3, y: 0 },
      zoom: 1,
      maxNx: EXTENDED_MAX_NX,
    });
    expect(box.minX).toBeGreaterThan(1);
    expect(box.maxX).toBeLessThanOrEqual(EXTENDED_MAX_NX);
  });

  it("ignores the mini board on themes without one", () => {
    const box = placementBox({ focus: { x: 1, y: 0 }, zoom: 1, maxNx: 1 });
    expect(box.maxX).toBeLessThanOrEqual(0.85 + 1e-9);
  });
});

describe("visibleHalfExtents", () => {
  it("sees less of the board the closer you get", () => {
    const far = visibleHalfExtents(0.5);
    const near = visibleHalfExtents(4);
    expect(near.nx).toBeLessThan(far.nx);
    expect(near.ny).toBeLessThan(far.ny);
  });

  it("widens with a wider viewport", () => {
    expect(visibleHalfExtents(1, 2).nx).toBeCloseTo(
      visibleHalfExtents(1, 1).nx * 2
    );
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

describe("clampScale", () => {
  it("keeps scale within the allowed range", () => {
    expect(clampScale(0.1)).toBe(MIN_ITEM_SCALE);
    expect(clampScale(99)).toBe(MAX_ITEM_SCALE);
    expect(clampScale(1.5)).toBe(1.5);
  });

  it("falls back to 1 for non-finite input", () => {
    expect(clampScale(NaN)).toBe(1);
    expect(clampScale(Infinity)).toBe(1);
  });
});

describe("scaleFromHandleDrag", () => {
  it("grows as the pointer moves away from the centre", () => {
    // grabbed at dist 1 with scale 1, now at dist 1.5 -> 1.5x
    expect(scaleFromHandleDrag(1, 1.5, 1)).toBe(1.5);
  });

  it("shrinks as the pointer moves toward the centre", () => {
    expect(scaleFromHandleDrag(2, 1, 1)).toBe(0.6); // clamped at min
  });

  it("respects the scale it was grabbed at", () => {
    // grabbed at 2x, pointer distance unchanged -> stays 2x
    expect(scaleFromHandleDrag(1, 1, 2)).toBe(2);
  });

  it("never exceeds the clamp range", () => {
    expect(scaleFromHandleDrag(1, 100, 1)).toBe(MAX_ITEM_SCALE);
    expect(scaleFromHandleDrag(1, 0.001, 1)).toBe(MIN_ITEM_SCALE);
  });

  it("handles a degenerate grab distance without dividing by zero", () => {
    expect(scaleFromHandleDrag(0, 5, 1.3)).toBe(clampScale(1.3));
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
