import { describe, expect, it } from "vitest";
import { CANDLES, TREES } from "../layout";
import { bob, candles, flicker } from "../candles";

describe("floating candles", () => {
  const all = candles();

  it("fills the hall with them", () => {
    expect(all.length).toBe(CANDLES.count);
  });

  it("keeps them in the air above the tables, bob and all", () => {
    for (const c of all) {
      expect(c.y + bob(c, 0) - 0.1).toBeGreaterThan(CANDLES.minY - 0.1);
      expect(Math.abs(c.x)).toBeLessThanOrEqual(CANDLES.halfWidth);
      expect(c.z).toBeGreaterThanOrEqual(CANDLES.minZ);
      expect(c.z).toBeLessThanOrEqual(CANDLES.maxZ);
    }
  });

  it("never floats one inside a tree", () => {
    for (const c of all) {
      for (const t of TREES) {
        const near = Math.hypot(c.x - t.x, c.z - t.z) < t.radius + 0.4;
        if (near) expect(c.y).toBeGreaterThan(t.height + 0.5);
      }
    }
  });

  it("keeps them apart", () => {
    for (let i = 0; i < all.length; i++) {
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeGreaterThanOrEqual(0.55);
      }
    }
  });

  it("is the same hall every visit", () => {
    expect(candles()).toEqual(candles());
  });

  it("bobs gently and smoothly", () => {
    for (const c of all.slice(0, 10)) {
      for (let t = 0; t < 30; t += 1 / 60) {
        expect(Math.abs(bob(c, t))).toBeLessThanOrEqual(0.08);
        expect(Math.abs(bob(c, t + 1 / 60) - bob(c, t))).toBeLessThan(0.005);
      }
    }
  });

  it("flickers without ever going out", () => {
    for (const c of all.slice(0, 10)) {
      for (let t = 0; t < 30; t += 0.03) {
        const f = flicker(c, t);
        expect(f).toBeGreaterThan(0.65);
        expect(f).toBeLessThan(1.15);
      }
    }
  });
});
