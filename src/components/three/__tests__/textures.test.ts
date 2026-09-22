import { describe, expect, it } from "vitest";
import { makeToonGradient, makeToonRamp } from "../textures";

/**
 * The 3-step gradient is shared by every scene in the app. Detailing
 * work on one theme must never change how the other boards look, so
 * this pins its exact values — if a prop needs a richer ramp it gets
 * its own via makeToonRamp.
 */
describe("makeToonGradient (shared by every scene)", () => {
  it("is still the original 3-step ramp", () => {
    const t = makeToonGradient();
    expect(Array.from(t.image.data as Uint8Array)).toEqual([90, 160, 255, 255]);
    expect(t.image.width).toBe(4);
    expect(t.image.height).toBe(1);
  });
});

describe("makeToonRamp", () => {
  it("builds a ramp of whatever length it's given", () => {
    const t = makeToonRamp([10, 50, 90, 130, 200]);
    expect(Array.from(t.image.data as Uint8Array)).toEqual([
      10, 50, 90, 130, 200,
    ]);
    expect(t.image.width).toBe(5);
  });

  it("does not disturb the shared gradient", () => {
    makeToonRamp([1, 2, 3]);
    expect(Array.from(makeToonGradient().image.data as Uint8Array)).toEqual([
      90, 160, 255, 255,
    ]);
  });
});
