import { describe, expect, it } from "vitest";
import { TWINKLE, bulbTwinkle } from "../garland";

describe("board garland twinkle", () => {
  it("stays between dim and full, never out", () => {
    for (let i = 0; i < 40; i++) {
      for (let t = 0; t < 60; t += 0.13) {
        const v = bulbTwinkle(i, t);
        expect(v).toBeGreaterThanOrEqual(TWINKLE.min);
        expect(v).toBeLessThanOrEqual(TWINKLE.max);
      }
    }
  });

  it("changes gently from frame to frame", () => {
    let worst = 0;
    for (let i = 0; i < 40; i++) {
      for (let t = 0; t < 60; t += 1 / 60) {
        worst = Math.max(worst, Math.abs(bulbTwinkle(i, t + 1 / 60) - bulbTwinkle(i, t)));
      }
    }
    expect(worst).toBeLessThan(0.05);
  });

  it("doesn't twinkle in step: neighbours differ", () => {
    let apart = 0;
    for (let t = 0; t < 20; t += 0.5) if (Math.abs(bulbTwinkle(3, t) - bulbTwinkle(4, t)) > 0.1) apart++;
    expect(apart).toBeGreaterThan(10);
  });

  it("gives every bulb a sparkle now and then", () => {
    for (let i = 0; i < 12; i++) {
      let peak = 0;
      for (let t = 0; t < 20; t += 0.05) peak = Math.max(peak, bulbTwinkle(i, t));
      expect(peak).toBeGreaterThan(0.95);
    }
  });
});
