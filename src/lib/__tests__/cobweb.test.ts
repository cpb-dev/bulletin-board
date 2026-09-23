import { describe, expect, it } from "vitest";
import {
  EDGE_SWEEP,
  WEB_VARIANTS,
  webLayout,
  webPattern,
  type WebPlacement,
} from "@/lib/cobweb";

const FRAME = { halfW: 2.36, halfH: 1.41 };
const layout = webLayout(7, FRAME);

/** How far a placement's plane reaches from the board centre. */
function reach(w: WebPlacement): { x: number; y: number } {
  const halfW = (w.kind === "corner" ? w.size : w.size * 3) / 2;
  const halfH = w.size / 2;
  // a rotated rectangle's axis-aligned half-extents
  const c = Math.abs(Math.cos(w.rot));
  const s = Math.abs(Math.sin(w.rot));
  return {
    x: Math.abs(w.x) + halfW * c + halfH * s,
    y: Math.abs(w.y) + halfW * s + halfH * c,
  };
}

describe("webLayout", () => {
  it("puts a web in each of the four corners", () => {
    const corners = layout.filter((w) => w.kind === "corner");
    expect(corners).toHaveLength(4);
    // one per quadrant
    const quadrants = new Set(
      corners.map((w) => `${Math.sign(w.x)},${Math.sign(w.y)}`)
    );
    expect(quadrants.size).toBe(4);
  });

  it("hangs webs along the top rail and both stiles, but never the bottom", () => {
    const edges = layout.filter((w) => w.kind === "edge");
    expect(edges.length).toBeGreaterThanOrEqual(5);
    const top = edges.filter((w) => w.y > FRAME.halfH - 0.4);
    const left = edges.filter((w) => w.x < -FRAME.halfW + 0.4);
    const right = edges.filter((w) => w.x > FRAME.halfW - 0.4);
    expect(top.length).toBeGreaterThan(0);
    expect(left.length).toBeGreaterThan(0);
    expect(right.length).toBeGreaterThan(0);
    expect(top.length + left.length + right.length).toBe(edges.length);
    // nothing along the bottom rail, which is the edge a web never survives
    expect(edges.some((w) => w.y < -FRAME.halfH + 0.4)).toBe(false);
  });

  it("keeps every web inside the frame", () => {
    // the whole point of anchoring to the middle of the frame band: a
    // thread hanging out over the wall behind is impossible to unsee
    for (const w of layout) {
      const r = reach(w);
      expect(r.x).toBeLessThanOrEqual(FRAME.halfW + 0.06);
      expect(r.y).toBeLessThanOrEqual(FRAME.halfH + 0.06);
    }
  });

  it("hugs the frame rather than sprawling over the cork", () => {
    // the old webs were 0.8 square anchored at the corners, which put
    // two thirds of each one out on the cork
    for (const w of layout) {
      expect(w.size).toBeLessThanOrEqual(0.6);
    }
  });

  it("spreads the webs along each rail instead of clumping them", () => {
    const top = layout
      .filter((w) => w.kind === "edge" && w.y > FRAME.halfH - 0.4)
      .map((w) => w.x)
      .sort((a, b) => a - b);
    expect(top.length).toBeGreaterThan(1);
    for (let i = 1; i < top.length; i++) {
      expect(top[i] - top[i - 1]).toBeGreaterThan(0.4);
    }
  });

  it("never asks for a texture the prop does not draw", () => {
    for (const w of layout) {
      expect(w.variant).toBeGreaterThanOrEqual(0);
      expect(w.variant).toBeLessThan(WEB_VARIANTS);
      expect(Number.isInteger(w.variant)).toBe(true);
    }
  });

  it("varies size, tilt and opacity so no two read as the same web", () => {
    const sizes = new Set(layout.map((w) => w.size.toFixed(3)));
    expect(sizes.size).toBe(layout.length);
    expect(new Set(layout.map((w) => w.flip)).size).toBe(2);
    for (const w of layout) {
      expect(w.opacity).toBeGreaterThan(0.3);
      expect(w.opacity).toBeLessThan(0.8);
    }
  });

  it("is stable for a seed and different between seeds", () => {
    expect(webLayout(7, FRAME)).toEqual(layout);
    expect(webLayout(8, FRAME)).not.toEqual(layout);
  });
});

describe("webPattern", () => {
  it("fans a corner web through a quarter turn, anchor edge to anchor edge", () => {
    const p = webPattern(1, "corner");
    expect(p.spokes[0]).toBe(0);
    expect(p.spokes[p.spokes.length - 1]).toBeCloseTo(Math.PI / 2, 6);
  });

  it("opens an edge web less than half a turn", () => {
    const p = webPattern(91, "edge");
    expect(p.spokes[p.spokes.length - 1]).toBeCloseTo(EDGE_SWEEP, 6);
    // a half turn from one point on the rail is a scallop shell
    expect(EDGE_SWEEP).toBeLessThan(Math.PI);
  });

  it("spaces the spokes unevenly", () => {
    const p = webPattern(3, "corner");
    const gaps: number[] = [];
    for (let i = 1; i < p.spokes.length; i++) {
      expect(p.spokes[i]).toBeGreaterThan(p.spokes[i - 1]);
      gaps.push(p.spokes[i] - p.spokes[i - 1]);
    }
    expect(Math.max(...gaps) - Math.min(...gaps)).toBeGreaterThan(0.02);
  });

  it("runs its rings outward and keeps them inside the web", () => {
    for (const kind of ["corner", "edge"] as const) {
      const p = webPattern(5, kind);
      for (let i = 1; i < p.rings.length; i++) {
        expect(p.rings[i]).toBeGreaterThanOrEqual(p.rings[i - 1]);
      }
      expect(p.rings[0]).toBeGreaterThan(0);
      expect(p.rings[p.rings.length - 1]).toBeLessThanOrEqual(1);
    }
  });

  it("gives every crossing its own radius, so no ring is a true arc", () => {
    const p = webPattern(2, "corner");
    expect(p.wobble).toHaveLength(p.rings.length);
    for (const row of p.wobble) {
      expect(row).toHaveLength(p.spokes.length);
      expect(new Set(row).size).toBe(row.length);
      for (const m of row) expect(Math.abs(m - 1)).toBeLessThan(0.25);
    }
  });

  it("tears some arcs but never the ring holding it to the frame", () => {
    for (let seed = 1; seed < 40; seed++) {
      const p = webPattern(seed, seed % 2 ? "corner" : "edge");
      expect(p.tears.length).toBeGreaterThan(0);
      for (const [ring, gap] of p.tears) {
        expect(ring).toBeGreaterThan(0);
        expect(ring).toBeLessThan(p.rings.length);
        expect(gap).toBeGreaterThanOrEqual(0);
        expect(gap).toBeLessThan(p.spokes.length - 1);
      }
    }
  });

  it("trails a loose thread beyond the outer ring when it has one", () => {
    const trails = Array.from({ length: 30 }, (_, i) =>
      webPattern(i + 1, "corner").trail
    );
    expect(trails.some((t) => t !== null)).toBe(true);
    expect(trails.some((t) => t === null)).toBe(true);
    for (const t of trails) {
      if (!t) continue;
      expect(t.length).toBeGreaterThan(1);
      expect(t.angle).toBeGreaterThanOrEqual(0);
      expect(t.angle).toBeLessThanOrEqual(Math.PI / 2);
    }
  });

  it("is stable for a seed", () => {
    expect(webPattern(4, "edge")).toEqual(webPattern(4, "edge"));
    expect(webPattern(4, "edge")).not.toEqual(webPattern(5, "edge"));
  });
});
