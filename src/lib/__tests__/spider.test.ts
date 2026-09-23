import { describe, expect, it } from "vitest";
import {
  AMBLE,
  BOLT,
  crawlSpeed,
  feetDown,
  FLEE_SECONDS,
  gaitPhase,
  LEGS,
  legPose,
  reflect,
  scatterStarts,
  STRIDE,
  wanderTurn,
} from "../spider";

describe("crawlSpeed", () => {
  it("ambles when it has not been touched", () => {
    expect(crawlSpeed(-1)).toBe(AMBLE);
    expect(crawlSpeed(NaN)).toBe(AMBLE);
    expect(crawlSpeed(FLEE_SECONDS)).toBe(AMBLE);
    expect(crawlSpeed(99)).toBe(AMBLE);
  });

  it("bolts the instant it is touched", () => {
    expect(crawlSpeed(0)).toBeCloseTo(BOLT, 6);
  });

  it("is a genuine bolt, not a brisk walk", () => {
    expect(BOLT).toBeGreaterThan(AMBLE * 10);
  });

  it("spends most of the panic in the first half second", () => {
    const half = crawlSpeed(0.5);
    const mid = crawlSpeed(FLEE_SECONDS / 2);
    expect(half).toBeLessThan(BOLT * 0.6);
    expect(mid).toBeLessThan(BOLT * 0.2);
  });

  it("slows back down smoothly rather than stopping dead", () => {
    let prev = crawlSpeed(0);
    for (let s = 0; s < FLEE_SECONDS + 0.5; s += 1 / 60) {
      const v = crawlSpeed(s);
      expect(v).toBeLessThanOrEqual(prev + 1e-9);
      expect(Math.abs(v - prev)).toBeLessThan(0.05);
      prev = v;
    }
  });

  it("never goes slower than an amble or faster than a bolt", () => {
    for (let s = -1; s < 5; s += 0.01) {
      expect(crawlSpeed(s)).toBeGreaterThanOrEqual(AMBLE);
      expect(crawlSpeed(s)).toBeLessThanOrEqual(BOLT);
    }
  });
});

describe("wanderTurn", () => {
  it("is deterministic", () => {
    expect(wanderTurn(3.5, 2)).toBe(wanderTurn(3.5, 2));
  });

  it("gives each spider its own path", () => {
    expect(wanderTurn(3.5, 1)).not.toBe(wanderTurn(3.5, 2));
  });

  it("turns both ways, so it wanders rather than circling", () => {
    let left = 0;
    let right = 0;
    for (let t = 0; t < 120; t += 0.1) {
      if (wanderTurn(t, 1) > 0) left++;
      else right++;
    }
    expect(Math.min(left, right) / Math.max(left, right)).toBeGreaterThan(0.6);
  });

  it("stays a gentle turn — it is a spider, not a housefly", () => {
    for (let t = 0; t < 200; t += 0.05) {
      expect(Math.abs(wanderTurn(t, 3))).toBeLessThan(2);
    }
  });
});

describe("legPose", () => {
  it("keeps the foot down for the whole stance", () => {
    expect(legPose(0).lift).toBe(0);
    expect(legPose(0.3).lift).toBe(0);
    expect(legPose(0.61).lift).toBe(0);
  });

  it("lifts the foot to swing it forward", () => {
    expect(legPose(0.8).lift).toBeGreaterThan(0.5);
  });

  it("puts the foot back down by the end of the cycle", () => {
    // the arc lands exactly at 1; a frame short of that it is within a
    // percent of the ground, which is the claim that matters
    expect(legPose(0.999).lift).toBeLessThan(0.02);
    expect(legPose(1).lift).toBe(0);
  });

  it("drags the leg backwards while it is planted", () => {
    expect(legPose(0.1).swing).toBeGreaterThan(legPose(0.5).swing);
  });

  it("is continuous across the wrap", () => {
    const before = legPose(0.999);
    const after = legPose(0.001);
    expect(Math.abs(after.swing - before.swing)).toBeLessThan(0.05);
    expect(Math.abs(after.lift - before.lift)).toBeLessThan(0.05);
  });

  it("never swings past its reach", () => {
    for (let p = 0; p < 1; p += 0.001) {
      const pose = legPose(p);
      expect(pose.swing).toBeGreaterThanOrEqual(-1.001);
      expect(pose.swing).toBeLessThanOrEqual(1.001);
      expect(pose.lift).toBeGreaterThanOrEqual(0);
      expect(pose.lift).toBeLessThanOrEqual(1.001);
    }
  });

  it("handles a phase outside 0..1 rather than flying apart", () => {
    expect(legPose(-0.25)).toEqual(legPose(0.75));
    expect(legPose(2.25)).toEqual(legPose(0.25));
  });
});

describe("gaitPhase", () => {
  it("is driven by distance, so slow legs mean a slow spider", () => {
    // half a stride of travel is half a cycle, whatever the clock says
    expect(gaitPhase(0, STRIDE / 2)).toBeCloseTo(0.5, 6);
    expect(gaitPhase(0, STRIDE)).toBeCloseTo(0, 6);
  });

  it("splits the legs into two alternating groups", () => {
    const phases = Array.from({ length: LEGS }, (_, i) => gaitPhase(i, 0));
    expect(new Set(phases.map((p) => p.toFixed(3))).size).toBe(2);
  });

  it("moves diagonal legs together, not the legs on one side", () => {
    // front-left with second-right, which is what an alternating
    // tetrapod does; a spider that lifts one whole side falls over
    expect(gaitPhase(0, 0)).toBe(gaitPhase(5, 0));
    expect(gaitPhase(0, 0)).not.toBe(gaitPhase(1, 0));
  });
});

describe("feetDown", () => {
  it("always keeps at least half the legs planted", () => {
    // the property that makes a gait read as walking rather than as
    // eight legs waving independently
    for (let d = 0; d < STRIDE * 8; d += STRIDE / 400) {
      expect(feetDown(d)).toBeGreaterThanOrEqual(LEGS / 2);
    }
  });

  it("does lift feet — it is not just standing there", () => {
    let lifted = false;
    for (let d = 0; d < STRIDE * 4; d += STRIDE / 200) {
      if (feetDown(d) < LEGS) lifted = true;
    }
    expect(lifted).toBe(true);
  });
});

describe("reflect", () => {
  const bounds = { x: 1, y: 0.6 };

  it("leaves a spider in the middle alone", () => {
    const r = reflect(0.2, -0.1, 1.2, bounds);
    expect(r.x).toBe(0.2);
    expect(r.y).toBe(-0.1);
    expect(r.heading).toBeCloseTo(1.2, 6);
  });

  it("puts it back inside whichever edge it crossed", () => {
    expect(reflect(1.4, 0, 0, bounds).x).toBe(1);
    expect(reflect(-1.4, 0, 0, bounds).x).toBe(-1);
    expect(reflect(0, 0.9, 0, bounds).y).toBe(0.6);
    expect(reflect(0, -0.9, 0, bounds).y).toBe(-0.6);
  });

  it("turns it back towards the board", () => {
    // heading straight at the right edge comes back pointing left
    const r = reflect(1.2, 0, 0, bounds);
    expect(Math.cos(r.heading)).toBeLessThan(0);
  });

  it("handles a corner without getting stuck", () => {
    const r = reflect(1.3, 0.8, 0.6, bounds);
    expect(r.x).toBe(1);
    expect(r.y).toBe(0.6);
    expect(Math.cos(r.heading)).toBeLessThan(0);
    expect(Math.sin(r.heading)).toBeLessThan(0);
  });

  it("keeps the heading in -PI..PI", () => {
    for (let h = -10; h < 10; h += 0.1) {
      const r = reflect(1.2, 0.7, h, bounds);
      expect(r.heading).toBeGreaterThanOrEqual(-Math.PI);
      expect(r.heading).toBeLessThanOrEqual(Math.PI);
    }
  });

  it("cannot be escaped, even at a full bolt between frames", () => {
    // walk one for a minute at the fastest speed and largest step
    let x = 0;
    let y = 0;
    let h = 0.7;
    for (let i = 0; i < 4000; i++) {
      const step = BOLT / 30; // a bad frame, twice the usual
      x += Math.cos(h) * step;
      y += Math.sin(h) * step;
      h += wanderTurn(i / 30, 1) * (1 / 30);
      const r = reflect(x, y, h, bounds);
      x = r.x;
      y = r.y;
      h = r.heading;
      expect(Math.abs(x)).toBeLessThanOrEqual(bounds.x + 1e-9);
      expect(Math.abs(y)).toBeLessThanOrEqual(bounds.y + 1e-9);
    }
  });
});

describe("scatterStarts", () => {
  const bounds = { x: 2.05, y: 1.1 };

  it("gives one start per spider", () => {
    expect(scatterStarts(6, bounds)).toHaveLength(6);
    expect(scatterStarts(1, bounds)).toHaveLength(1);
    expect(scatterStarts(0, bounds)).toEqual([]);
    expect(scatterStarts(-3, bounds)).toEqual([]);
  });

  it("starts every spider on the board", () => {
    for (const start of scatterStarts(6, bounds)) {
      expect(Math.abs(start.x)).toBeLessThanOrEqual(bounds.x);
      expect(Math.abs(start.y)).toBeLessThanOrEqual(bounds.y);
    }
  });

  it("spreads them across the board rather than round the middle", () => {
    // the bug this replaced: a hash scaled to half a unit put all six
    // within 40cm of the centre of a board 4.6 wide
    const starts = scatterStarts(6, bounds);
    const left = starts.filter((s) => s.x < -bounds.x / 3);
    const right = starts.filter((s) => s.x > bounds.x / 3);
    expect(left.length).toBeGreaterThan(0);
    expect(right.length).toBeGreaterThan(0);
    const spread = Math.max(...starts.map((s) => s.x)) -
      Math.min(...starts.map((s) => s.x));
    expect(spread).toBeGreaterThan(bounds.x);
  });

  it("never lets two start on top of each other, on any seed", () => {
    for (let seed = 1; seed < 60; seed++) {
      const starts = scatterStarts(6, bounds, seed);
      for (let i = 0; i < starts.length; i++) {
        for (let j = i + 1; j < starts.length; j++) {
          const d = Math.hypot(
            starts[i].x - starts[j].x,
            starts[i].y - starts[j].y
          );
          // a body is 0.055 across; anything closer reads as a huddle
          expect(d).toBeGreaterThan(0.3);
        }
      }
    }
  });

  it("points them in different directions", () => {
    const headings = scatterStarts(6, bounds).map((s) => s.heading);
    for (const h of headings) {
      expect(h).toBeGreaterThanOrEqual(-Math.PI);
      expect(h).toBeLessThanOrEqual(Math.PI);
    }
    expect(new Set(headings.map((h) => h.toFixed(3))).size).toBe(6);
  });

  it("covers the board whatever the count", () => {
    for (const count of [2, 3, 4, 6, 9, 12]) {
      const starts = scatterStarts(count, bounds, 5);
      expect(starts).toHaveLength(count);
      for (const s of starts) {
        expect(Math.abs(s.x)).toBeLessThanOrEqual(bounds.x);
        expect(Math.abs(s.y)).toBeLessThanOrEqual(bounds.y);
      }
    }
  });

  it("is stable for a seed and different between seeds", () => {
    expect(scatterStarts(6, bounds, 3)).toEqual(scatterStarts(6, bounds, 3));
    expect(scatterStarts(6, bounds, 3)).not.toEqual(
      scatterStarts(6, bounds, 4)
    );
  });

  it("starts a spider somewhere reflect will keep it", () => {
    for (let seed = 1; seed < 30; seed++) {
      for (const s of scatterStarts(6, bounds, seed)) {
        const r = reflect(s.x, s.y, s.heading, bounds);
        expect(r.x).toBeCloseTo(s.x, 10);
        expect(r.y).toBeCloseTo(s.y, 10);
        expect(r.heading).toBeCloseTo(s.heading, 10);
      }
    }
  });
});
