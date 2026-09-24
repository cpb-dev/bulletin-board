import { describe, expect, it } from "vitest";
import { cycleLength, FADE, leafPose, makeLeaves, REST_Y } from "../leaves";

const sources = [
  { x: 0, z: 0, y: 5, spread: 2 },
  { x: -8, z: -6, y: 4, spread: 1 },
];
const leaves = makeLeaves(sources, 24, 3);

describe("falling leaves", () => {
  it("are the same leaves every time", () => {
    expect(makeLeaves(sources, 24, 3)).toEqual(leaves);
    expect(leafPose(leaves[4], 12.3)).toEqual(leafPose(leaves[4], 12.3));
  });

  it("never go below the grass or above where they let go", () => {
    for (const leaf of leaves) {
      for (let t = 0; t < 120; t += 0.37) {
        const p = leafPose(leaf, t);
        expect(p.y).toBeGreaterThanOrEqual(REST_Y - 1e-9);
        expect(p.y).toBeLessThanOrEqual(leaf.source.y + 1e-9);
        expect(p.scale).toBeGreaterThanOrEqual(0);
        expect(p.scale).toBeLessThanOrEqual(1);
      }
    }
  });

  it("start from under their own tree", () => {
    for (const leaf of leaves) {
      for (let c = 0; c < 5; c++) {
        // the first instant of a cycle
        const t = c * cycleLength(leaf) - leaf.offset + 1e-6;
        const p = leafPose(leaf, t);
        const d = Math.hypot(p.x - leaf.source.x, p.z - leaf.source.z);
        expect(d).toBeLessThanOrEqual(leaf.source.spread + 1e-6);
      }
    }
  });

  it("never jump while they can be seen", () => {
    // Walk every leaf through several cycles at 60 fps: from one frame
    // to the next, a visible leaf moves a little and turns a little. It
    // only ever moves to a new tree while it has shrunk to nothing.
    // The worst step is kept and checked once at the end: an expect per
    // frame made this the slowest test in the suite, past the timeout on CI.
    const dt = 1 / 60;
    let moved = 0;
    let turned = 0;
    let grew = 0;
    for (const leaf of leaves) {
      let prev = leafPose(leaf, 0);
      for (let t = dt; t < 3 * cycleLength(leaf); t += dt) {
        const p = leafPose(leaf, t);
        if (prev.scale > 0.02 && p.scale > 0.02) {
          moved = Math.max(moved, Math.hypot(p.x - prev.x, p.y - prev.y, p.z - prev.z));
          turned = Math.max(
            turned,
            Math.abs(p.rx - prev.rx),
            Math.abs(p.ry - prev.ry),
            Math.abs(p.rz - prev.rz)
          );
          grew = Math.max(grew, Math.abs(p.scale - prev.scale));
        }
        prev = p;
      }
    }
    expect(moved).toBeLessThan(0.08);
    expect(turned).toBeLessThan(0.2);
    expect(grew).toBeLessThanOrEqual(dt / FADE + 1e-9);
  });

  it("lie flat and still once they have landed", () => {
    for (const leaf of leaves) {
      const fall = leaf.source.y / leaf.speed;
      const start = cycleLength(leaf) * 2 - leaf.offset;
      const a = leafPose(leaf, start + fall + 0.1);
      const b = leafPose(leaf, start + fall + leaf.rest - 0.1);
      expect(a.y).toBeCloseTo(REST_Y);
      expect(a.rx).toBeCloseTo(-Math.PI / 2);
      expect(b).toEqual(a);
    }
  });

  it("don't all fall at once", () => {
    const falling = leaves.filter((l) => {
      const p = leafPose(l, 10);
      return p.y > REST_Y + 0.01;
    });
    expect(falling.length).toBeGreaterThan(0);
    expect(falling.length).toBeLessThan(leaves.length);
  });
});
