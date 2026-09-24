import { describe, expect, it } from "vitest";
import {
  ARM_BURIED_Y,
  ARM_MAX_Y,
  armPose,
  fingerCurl,
  pickRise,
  RISE_KINDS,
  RISE_SECONDS,
  type RiseKind,
} from "../zombie";

const KINDS: RiseKind[] = [...RISE_KINDS];

describe("armPose", () => {
  it.each(KINDS)("%s starts and ends fully buried", (kind) => {
    // The one that matters: an arm left above ground is an arm sticking
    // out of the graveyard until the page reloads.
    expect(armPose(kind, 0).y).toBe(ARM_BURIED_Y);
    expect(armPose(kind, 1).y).toBe(ARM_BURIED_Y);
    expect(armPose(kind, -0.5).y).toBe(ARM_BURIED_Y);
    expect(armPose(kind, 1.5).y).toBe(ARM_BURIED_Y);
  });

  it.each(KINDS)("%s returns to the ground by the time it is done", (kind) => {
    // approaching the end, not just exactly at it
    // Buried well before the last frame, not arriving there exactly on
    // it: a curve that only lands at p = 1 leaves the arm proud until
    // the final frame and then pops.
    expect(armPose(kind, 0.97).y).toBeCloseTo(ARM_BURIED_Y, 3);
  });

  it.each(KINDS)("%s actually breaks the surface", (kind) => {
    let top = -Infinity;
    for (let p = 0; p <= 1; p += 0.002) top = Math.max(top, armPose(kind, p).y);
    expect(top).toBeGreaterThan(0.15);
  });

  it.each(KINDS)("%s never rises past the bound callers rely on", (kind) => {
    for (let p = 0; p <= 1; p += 0.002) {
      // epsilon: the eases land on the bounds, so rounding can put a
      // sample a few 1e-17 outside them
      expect(armPose(kind, p).y).toBeLessThanOrEqual(ARM_MAX_Y + 1e-9);
      expect(armPose(kind, p).y).toBeGreaterThanOrEqual(ARM_BURIED_Y - 1e-9);
    }
  });

  it.each(KINDS)("%s keeps the grasp a real fraction", (kind) => {
    for (let p = 0; p <= 1; p += 0.002) {
      const g = armPose(kind, p).grasp;
      expect(g).toBeGreaterThanOrEqual(0);
      expect(g).toBeLessThanOrEqual(1);
    }
  });

  it.each(KINDS)("%s moves smoothly — no frame-to-frame snaps", (kind) => {
    const step = 1 / (RISE_SECONDS[kind] * 60);
    for (let p = step; p < 1; p += step) {
      const a = armPose(kind, p - step);
      const b = armPose(kind, p);
      // Loose enough for grab, whose launch clears a metre in a quarter
      // of a second and is meant to. A discontinuity would be the best
      // part of that metre in one frame, so this still catches one.
      expect(Math.abs(b.y - a.y)).toBeLessThan(0.12);
      expect(Math.abs(b.drag - a.drag)).toBeLessThan(0.04);
      expect(Math.abs(b.lean - a.lean)).toBeLessThan(0.08);
    }
  });

  it.each(KINDS)("%s is deterministic", (kind) => {
    expect(armPose(kind, 0.37)).toEqual(armPose(kind, 0.37));
  });

  it("gives the four kinds genuinely different rises", () => {
    // Compared on where they get to and how far they wander, so two
    // kinds that merely differ in phase would still fail this.
    const shape = (kind: RiseKind) => {
      let top = -Infinity;
      let drag = 0;
      let shake = 0;
      for (let p = 0; p <= 1; p += 0.002) {
        const a = armPose(kind, p);
        top = Math.max(top, a.y);
        drag = Math.max(drag, Math.abs(a.drag));
        shake = Math.max(shake, Math.abs(a.shake));
      }
      return { top, drag, shake };
    };
    const all = KINDS.map(shape);
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const d =
          Math.abs(all[i].top - all[j].top) +
          Math.abs(all[i].drag - all[j].drag) * 2 +
          Math.abs(all[i].shake - all[j].shake) * 4;
        expect(d).toBeGreaterThan(0.05);
      }
    }
  });

  it("claw hauls itself sideways, and the others do not", () => {
    const maxDrag = (kind: RiseKind) => {
      let d = 0;
      for (let p = 0; p <= 1; p += 0.002)
        d = Math.max(d, Math.abs(armPose(kind, p).drag));
      return d;
    };
    expect(maxDrag("claw")).toBeGreaterThan(0.15);
    expect(maxDrag("burst")).toBe(0);
    expect(maxDrag("grab")).toBe(0);
  });

  it("grab is the quickest and reaches the highest", () => {
    expect(RISE_SECONDS.grab).toBeLessThan(RISE_SECONDS.burst);
    const top = (kind: RiseKind) => {
      let t = -Infinity;
      for (let p = 0; p <= 1; p += 0.002) t = Math.max(t, armPose(kind, p).y);
      return t;
    };
    for (const k of KINDS) if (k !== "grab") {
      expect(top("grab")).toBeGreaterThan(top(k));
    }
  });

  it("grab snatches shut and stays shut", () => {
    expect(armPose("grab", 0.05).grasp).toBeLessThan(0.1);
    expect(armPose("grab", 0.35).grasp).toBeCloseTo(1, 2);
    expect(armPose("grab", 0.8).grasp).toBeCloseTo(1, 2);
  });

  it("tremble shudders, and stops shuddering as it gives out", () => {
    const shakeNear = (p: number) => {
      let s = 0;
      for (let q = p; q < p + 0.1; q += 0.002)
        s = Math.max(s, Math.abs(armPose("tremble", q).shake));
      return s;
    };
    expect(shakeNear(0.1)).toBeGreaterThan(0.03);
    expect(shakeNear(0.88)).toBeLessThan(shakeNear(0.1));
  });
});

describe("pickRise", () => {
  it("only ever returns a real kind", () => {
    for (let i = 0; i < 500; i++) {
      expect(RISE_KINDS).toContain(pickRise(() => i / 500));
    }
  });

  it("reaches every kind", () => {
    const seen = new Set<RiseKind>();
    for (let i = 0; i < 400; i++) seen.add(pickRise(() => i / 400));
    expect(seen.size).toBe(RISE_KINDS.length);
  });

  it("survives a generator that returns exactly 1", () => {
    expect(RISE_KINDS).toContain(pickRise(() => 1));
    expect(RISE_KINDS).toContain(pickRise(() => 0));
  });
});

describe("fingerCurl", () => {
  it("stays a real fraction whatever it is given", () => {
    for (const g of [-1, 0, 0.3, 0.7, 1, 2]) {
      for (let f = 0; f <= 4; f++) {
        const c = fingerCurl(g, f);
        expect(c).toBeGreaterThanOrEqual(0);
        expect(c).toBeLessThanOrEqual(1.05);
      }
    }
  });

  it("closes further as the hand closes", () => {
    for (let f = 0; f <= 4; f++) {
      expect(fingerCurl(0.8, f)).toBeGreaterThanOrEqual(fingerCurl(0.3, f));
    }
  });

  it("is open when the hand is open", () => {
    for (let f = 0; f <= 4; f++) expect(fingerCurl(0, f)).toBe(0);
  });

  it("does not move the fingers as one block", () => {
    const mid = [0, 1, 2, 3].map((f) => fingerCurl(0.5, f));
    expect(new Set(mid.map((c) => c.toFixed(4))).size).toBe(4);
  });

  it("leads with the index and lags with the little finger", () => {
    expect(fingerCurl(0.5, 0)).toBeGreaterThan(fingerCurl(0.5, 3));
  });

  it("never quite closes the little finger", () => {
    expect(fingerCurl(1, 3)).toBeLessThan(fingerCurl(1, 0));
  });
});
