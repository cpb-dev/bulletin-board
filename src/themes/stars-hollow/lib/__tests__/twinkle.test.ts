import { describe, expect, it } from "vitest";
import { twinkle } from "../twinkle";

const BULBS = 18;

describe("fairy bulb twinkle", () => {
  it("stays between the deepest dip and full brightness", () => {
    for (let i = 0; i < BULBS; i++) {
      for (let t = 0; t < 60; t += 0.05) {
        const b = twinkle(t, i, 0.6);
        expect(b).toBeGreaterThanOrEqual(0.4 - 1e-9);
        expect(b).toBeLessThanOrEqual(1);
      }
    }
  });

  it("is steady when there's no twinkle (by day)", () => {
    for (let t = 0; t < 10; t += 0.37) expect(twinkle(t, 3, 0)).toBe(1);
  });

  it("actually twinkles: each bulb dips and recovers", () => {
    for (let i = 0; i < BULBS; i++) {
      let lo = 1;
      let hi = 0;
      for (let t = 0; t < 30; t += 1 / 30) {
        const b = twinkle(t, i, 0.6);
        lo = Math.min(lo, b);
        hi = Math.max(hi, b);
      }
      expect(hi - lo).toBeGreaterThan(0.3);
    }
  });

  it("is mostly bright — a little twinkle, not a flicker", () => {
    let bright = 0;
    let n = 0;
    for (let i = 0; i < BULBS; i++) {
      for (let t = 0; t < 30; t += 0.1, n++) if (twinkle(t, i, 0.6) > 0.8) bright++;
    }
    expect(bright / n).toBeGreaterThan(0.6);
  });

  it("changes smoothly from frame to frame", () => {
    const dt = 1 / 60;
    let worst = 0;
    for (let i = 0; i < BULBS; i++) {
      for (let t = 0; t < 20; t += dt) {
        worst = Math.max(worst, Math.abs(twinkle(t + dt, i, 0.6) - twinkle(t, i, 0.6)));
      }
    }
    expect(worst).toBeLessThan(0.05);
  });

  it("doesn't pulse the bulbs in step", () => {
    // at any moment the string shows a spread of brightnesses
    for (const t of [0, 3.3, 7.1, 12.8]) {
      const all = Array.from({ length: BULBS }, (_, i) => twinkle(t, i, 0.6));
      expect(Math.max(...all) - Math.min(...all)).toBeGreaterThan(0.15);
    }
  });
});
