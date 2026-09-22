import { describe, expect, it } from "vitest";
import {
  GHOST_GAP_MAX,
  GHOST_GAP_MIN,
  ghostPass,
  nextGhostTime,
  SPIDER_DART_DURATION,
  spiderProgress,
  spiderWaypoint,
  zombieHandPose,
  ZOMBIE_HAND_DURATION,
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

describe("zombieHandPose", () => {
  it("stays buried before and after the animation", () => {
    expect(zombieHandPose(0).y).toBeLessThan(0);
    expect(zombieHandPose(1).y).toBeLessThan(0);
    expect(zombieHandPose(0).grasp).toBe(0);
    expect(zombieHandPose(1).grasp).toBe(0);
  });

  it("bursts up, hovers, then sinks back", () => {
    const burst = zombieHandPose(0.1).y;
    const up = zombieHandPose(0.5).y;
    const sinking = zombieHandPose(0.9).y;
    expect(burst).toBeGreaterThan(zombieHandPose(0).y);
    expect(up).toBeGreaterThan(0);
    expect(sinking).toBeLessThan(up);
  });

  it("ends where it started, so repeat clicks look identical", () => {
    expect(zombieHandPose(1).y).toBeCloseTo(zombieHandPose(0).y, 5);
  });

  it("only gropes while it's above ground", () => {
    expect(zombieHandPose(0.5).grasp).toBeGreaterThan(0);
    expect(zombieHandPose(0.05).grasp).toBe(0);
  });

  it("has a duration long enough to read as an animation", () => {
    expect(ZOMBIE_HAND_DURATION).toBeGreaterThan(1);
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
