import { describe, expect, it } from "vitest";
import {
  DOOR_MAX_SWING,
  doorSwing,
  GHOST_GAP_MAX,
  GHOST_GAP_MIN,
  ghostPass,
  nextGhostTime,
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
