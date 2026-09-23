import { describe, expect, it } from "vitest";
import {
  DOOR_MAX_SWING,
  doorSwing,
  GHOST_GAP_MAX,
  GHOST_GAP_MIN,
  ghostPass,
  nextGhostTime,
  SPIDER_DART_DURATION,
  spiderPoint,
  spiderProgress,
  spiderWaypoint,
} from "../haunted";

describe("nextGhostTime", () => {
  it("always lands inside the gap window, ahead of now", () => {
    for (const r of [0, 0.25, 0.5, 0.99]) {
      const at = nextGhostTime(100, () => r);
      expect(at).toBeGreaterThanOrEqual(100 + GHOST_GAP_MIN);
      expect(at).toBeLessThanOrEqual(100 + GHOST_GAP_MAX);
    }
  });

  it("spreads sightings out rather than firing on a fixed beat", () => {
    expect(nextGhostTime(0, () => 0)).not.toBe(nextGhostTime(0, () => 1));
  });
});

describe("ghostPass", () => {
  it("renders nothing outside the pass", () => {
    expect(ghostPass(-0.01)).toBeNull();
    expect(ghostPass(1.01)).toBeNull();
  });

  it("drifts steadily across the window", () => {
    const a = ghostPass(0.1)!;
    const b = ghostPass(0.5)!;
    const c = ghostPass(0.9)!;
    expect(a.x).toBeLessThan(b.x);
    expect(b.x).toBeLessThan(c.x);
  });

  it("fades in and out so it never pops", () => {
    expect(ghostPass(0)!.opacity).toBeCloseTo(0, 5);
    expect(ghostPass(1)!.opacity).toBeCloseTo(0, 5);
    expect(ghostPass(0.5)!.opacity).toBeGreaterThan(0.9);
  });
});

describe("spiderWaypoint", () => {
  it("is deterministic", () => {
    expect(spiderWaypoint(3, 7)).toBe(spiderWaypoint(3, 7));
  });

  it("stays within the thread", () => {
    for (let seed = 1; seed <= 4; seed++) {
      for (let i = 0; i < 40; i++) {
        const w = spiderWaypoint(seed, i);
        expect(w).toBeGreaterThanOrEqual(0);
        expect(w).toBeLessThan(1);
      }
    }
  });

  it("gives different spiders different paths", () => {
    expect(spiderWaypoint(1, 0)).not.toBe(spiderWaypoint(2, 0));
  });
});

describe("spiderProgress", () => {
  const cycle = 1.2;

  it("holds still between darts", () => {
    // once the dart is done, the spider should not move until the cycle ends
    const settled = spiderProgress(SPIDER_DART_DURATION + 0.1, 5, cycle);
    const later = spiderProgress(cycle - 0.01, 5, cycle);
    expect(later).toBeCloseTo(settled, 6);
  });

  it("darts fast — it covers most of the gap in the first half", () => {
    const from = spiderWaypoint(5, 0);
    const to = spiderWaypoint(5, 1);
    const half = spiderProgress(SPIDER_DART_DURATION / 2, 5, cycle);
    expect(Math.abs(half - from)).toBeCloseTo(Math.abs(to - from) / 2, 5);
  });

  it("starts each cycle where the last one finished", () => {
    const endOfFirst = spiderProgress(cycle - 0.001, 5, cycle);
    const startOfSecond = spiderProgress(cycle, 5, cycle);
    expect(startOfSecond).toBeCloseTo(endOfFirst, 3);
  });

  it("stays on the thread", () => {
    for (let t = 0; t < 30; t += 0.07) {
      const p = spiderProgress(t, 9, cycle);
      expect(p).toBeGreaterThanOrEqual(0);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it("survives a zero cycle instead of dividing by it", () => {
    expect(Number.isFinite(spiderProgress(3, 1, 0))).toBe(true);
  });
});

describe("spiderPoint", () => {
  const cycle = 2.3;

  it("roams both axes rather than tracking one", () => {
    // If x and y shared a waypoint sequence the spider would only ever
    // crawl the board's diagonal.
    let differed = false;
    for (let t = 0; t < 40; t += cycle) {
      const p = spiderPoint(t + cycle - 0.01, 3, cycle);
      if (Math.abs(p.x - p.y) > 0.05) differed = true;
    }
    expect(differed).toBe(true);
  });

  it("stays on the board on both axes", () => {
    for (let t = 0; t < 60; t += 0.13) {
      const p = spiderPoint(t, 2, cycle);
      expect(p.x).toBeGreaterThanOrEqual(0);
      expect(p.x).toBeLessThanOrEqual(1);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(1);
    }
  });

  it("moves both axes together, so a dart is one diagonal scuttle", () => {
    const a = spiderPoint(0.05, 4, cycle);
    const b = spiderPoint(0.2, 4, cycle);
    expect(a.x).not.toBe(b.x);
    expect(a.y).not.toBe(b.y);
  });

  it("freezes between darts on both axes", () => {
    const settled = spiderPoint(SPIDER_DART_DURATION + 0.2, 6, cycle);
    const later = spiderPoint(cycle - 0.01, 6, cycle);
    expect(later.x).toBeCloseTo(settled.x, 6);
    expect(later.y).toBeCloseTo(settled.y, 6);
  });

  it("gives each spider its own path", () => {
    const a = spiderPoint(1.4, 1, cycle);
    const b = spiderPoint(1.4, 2, cycle);
    expect(a.x === b.x && a.y === b.y).toBe(false);
  });
});

describe("doorSwing", () => {
  it("never swings through the wall or past its stop", () => {
    for (let t = 0; t < 400; t += 0.05) {
      const a = doorSwing(t, 3);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(DOOR_MAX_SWING);
    }
  });

  it("is deterministic, so the door doesn't jump on a re-render", () => {
    expect(doorSwing(12.5, 2)).toBe(doorSwing(12.5, 2));
  });

  it("gives each door its own weather", () => {
    expect(doorSwing(9, 1)).not.toBe(doorSwing(9, 2));
  });

  it("is never quite shut — the frame is past square", () => {
    for (let t = 0; t < 400; t += 0.05) {
      expect(doorSwing(t, 1)).toBeGreaterThan(0.01);
    }
  });

  it("keeps the wide swings occasional rather than flapping", () => {
    let wide = 0;
    let samples = 0;
    for (let t = 0; t < 400; t += 0.05) {
      samples++;
      if (doorSwing(t, 1) > DOOR_MAX_SWING * 0.5) wide++;
    }
    expect(wide / samples).toBeLessThan(0.2);
  });

  it("never goes long without moving at all", () => {
    // A door that sits dead still for fifteen seconds stops reading as
    // a door in the wind and starts reading as a bug.
    for (let t = 0; t < 300; t += 5) {
      let lo = Infinity;
      let hi = -Infinity;
      for (let u = t; u < t + 5; u += 0.05) {
        const a = doorSwing(u, 1);
        lo = Math.min(lo, a);
        hi = Math.max(hi, a);
      }
      expect(hi - lo).toBeGreaterThan(0.04);
    }
  });

  it("still opens wide every so often", () => {
    let widest = 0;
    for (let t = 0; t < 400; t += 0.05) {
      widest = Math.max(widest, doorSwing(t, 1));
    }
    expect(widest).toBeGreaterThan(DOOR_MAX_SWING * 0.7);
  });

  it("moves smoothly — no frame-to-frame snaps", () => {
    for (let t = 0; t < 200; t += 1 / 60) {
      const step = Math.abs(doorSwing(t + 1 / 60, 4) - doorSwing(t, 4));
      expect(step).toBeLessThan(0.05);
    }
  });
});
