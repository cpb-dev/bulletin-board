import { describe, expect, it } from "vitest";
import { LOOKS } from "../looks";

describe("Stars Hollow looks", () => {
  it("keeps the daytime square exactly as it shipped", () => {
    const d = LOOKS.day;
    expect(d.background).toBe("#a9c8e4");
    expect(d.fog).toEqual({ colour: "#d9e2e6", near: 24, far: 58 });
    expect(d.ambient).toEqual({ colour: "#fff3e0", intensity: 0.55 });
    expect(d.hemisphere).toEqual({ sky: "#bcd6ee", ground: "#6f6a45", intensity: 0.75 });
    expect(d.key).toEqual({ position: [-9, 12, 8], colour: "#ffe3b8", intensity: 1.55 });
    expect(d.windowGlow).toBe(1);
    expect(d.lampGlow).toBe(0.25);
    expect(d.lampColour).toBe("#fff4dc");
    expect(d.sky.drift).toBe(0.003);
    // no extra lights by day: they'd change the look and cost draws
    expect(d.lampLight).toBe(0);
    expect(d.boardLight).toBe(0);
    // the garland's bulbs are steady and throw no light by day
    expect(d.garland).toEqual({ glow: 0, light: 0, twinkle: 0 });
    expect(d.sky.stars).toBe(0);
    expect(d.sky.moon).toBe(false);
  });

  it("gets darker and more lamp-lit from day to evening to night", () => {
    const order = [LOOKS.day, LOOKS.evening, LOOKS.night];
    for (let i = 1; i < order.length; i++) {
      expect(order[i].key.intensity).toBeLessThan(order[i - 1].key.intensity);
      expect(order[i].ambient.intensity).toBeLessThan(order[i - 1].ambient.intensity);
      expect(order[i].lampGlow).toBeGreaterThan(order[i - 1].lampGlow);
      expect(order[i].windowGlow).toBeGreaterThan(order[i - 1].windowGlow);
      expect(order[i].garland.glow).toBeGreaterThan(order[i - 1].garland.glow);
      expect(order[i].garland.light).toBeGreaterThan(order[i - 1].garland.light);
    }
  });

  it("has every sky gradient run from the zenith to the horizon", () => {
    for (const look of Object.values(LOOKS)) {
      expect(look.sky.stops[0][0]).toBe(0);
      expect(look.sky.stops.at(-1)![0]).toBe(1);
      // the horizon matches the fog, or the dome shows a seam
      expect(look.sky.stops.at(-1)![1]).toBe(look.fog.colour);
    }
  });
});
