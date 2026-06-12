import { describe, expect, it } from "vitest";
import { MAX_PHOTO_EDGE, targetDimensions } from "../image";

describe("targetDimensions", () => {
  it("leaves small images untouched", () => {
    expect(targetDimensions(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("never upscales", () => {
    expect(targetDimensions(10, 10)).toEqual({ width: 10, height: 10 });
  });

  it("scales landscape photos down to the max edge", () => {
    const { width, height } = targetDimensions(3200, 2400);
    expect(width).toBe(MAX_PHOTO_EDGE);
    expect(height).toBe(1200);
  });

  it("scales portrait photos down to the max edge", () => {
    const { width, height } = targetDimensions(2400, 3200);
    expect(height).toBe(MAX_PHOTO_EDGE);
    expect(width).toBe(1200);
  });

  it("preserves aspect ratio", () => {
    const { width, height } = targetDimensions(4000, 3000);
    expect(width / height).toBeCloseTo(4 / 3, 2);
  });

  it("handles degenerate sizes without dividing by zero", () => {
    expect(targetDimensions(0, 0)).toEqual({ width: 1, height: 1 });
    const tiny = targetDimensions(1, 100000);
    expect(tiny.width).toBeGreaterThanOrEqual(1);
  });
});
