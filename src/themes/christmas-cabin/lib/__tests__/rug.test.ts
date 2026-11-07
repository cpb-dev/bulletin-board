import { describe, expect, it } from "vitest";
import { RUG } from "../rug";
import { ROOM } from "../layout";
import { BOARD } from "@/lib/board-geometry";

describe("the rug's place", () => {
  it("lies in front of the board, clear of the back wall and inside the room", () => {
    const back = RUG.z - RUG.depth / 2;
    expect(back).toBeGreaterThan(BOARD.wallZ + 0.8);
    expect(RUG.x + RUG.width / 2 + 0.15).toBeLessThan(ROOM.halfWidth);
    expect(RUG.z + RUG.depth / 2 + 0.15).toBeLessThan(ROOM.frontZ);
  });
});
