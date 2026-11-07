import { describe, expect, it } from "vitest";
import { fairyLightBulbs, SWAG } from "../fairylights";
import { ROOM } from "../layout";

describe("fairy lights", () => {
  const bulbs = fairyLightBulbs();

  it("hang below the ceiling and no lower than one drop", () => {
    for (const b of bulbs) {
      expect(b.y).toBeLessThan(ROOM.height);
      expect(b.y).toBeGreaterThanOrEqual(ROOM.height - SWAG.below - SWAG.drop - 1e-9);
    }
  });

  it("stay inside the room, just off the walls", () => {
    for (const b of bulbs) {
      expect(Math.abs(b.x)).toBeLessThan(ROOM.halfWidth);
      expect(b.z).toBeGreaterThan(ROOM.backZ);
      expect(b.z).toBeLessThan(ROOM.frontZ);
    }
  });

  it("are spaced evenly, with no gaps in the string", () => {
    for (let i = 1; i < bulbs.length; i++) {
      const d = Math.hypot(
        bulbs[i].x - bulbs[i - 1].x,
        bulbs[i].y - bulbs[i - 1].y,
        bulbs[i].z - bulbs[i - 1].z
      );
      expect(d).toBeLessThan(SWAG.bulbEvery * 1.6);
    }
  });

  it("swag: some bulbs sit at the hooks, some at the bottom of a loop", () => {
    const ys = bulbs.map((b) => b.y);
    expect(Math.max(...ys) - Math.min(...ys)).toBeGreaterThan(SWAG.drop * 0.8);
  });
});
