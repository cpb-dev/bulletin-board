import { describe, expect, it } from "vitest";
import { CANDLES, HALL } from "../layout";
import { SNOW, snowFlake } from "../snow";

describe("snow from the enchanted ceiling", () => {
  const seeds = Array.from({ length: 50 }, (_, i) => ({ x: (i * 0.37) % 1, z: (i * 0.61) % 1, phase: (i * 0.13) % 1 }));

  it("falls between the ceiling and well above the candles, and never lands", () => {
    expect(SNOW.top).toBeLessThan(HALL.height);
    expect(SNOW.bottom).toBeGreaterThan(CANDLES.minY);
    for (const s of seeds) {
      for (let t = 0; t < 60; t += 0.25) {
        const f = snowFlake(s, t);
        expect(f.y).toBeLessThanOrEqual(SNOW.top + 1e-9);
        expect(f.y).toBeGreaterThanOrEqual(SNOW.bottom - 1e-9);
        expect(Math.abs(f.x)).toBeLessThan(HALL.halfWidth);
      }
    }
  });

  it("melts away before it's gone, so nothing pops out of sight", () => {
    for (const s of seeds) {
      for (let t = 0; t < 60; t += 0.05) {
        const f = snowFlake(s, t);
        if (f.y < SNOW.bottom + 0.05) expect(f.alpha).toBeLessThan(0.05);
        if (f.y > SNOW.top - 0.02) expect(f.alpha).toBeLessThan(0.1);
      }
    }
  });

  it("falls downwards", () => {
    const s = { x: 0.5, z: 0.5, phase: 0.2 };
    expect(snowFlake(s, 1).y).toBeLessThan(snowFlake(s, 0).y);
  });
});
