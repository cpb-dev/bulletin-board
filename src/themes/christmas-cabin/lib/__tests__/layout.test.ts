import { describe, expect, it } from "vitest";
import { BOARD } from "@/lib/board-geometry";
import {
  ALPHABET_WALL,
  blocksBoard,
  floorFootprints,
  insideRoom,
  ROOM,
  sightLineX,
  SNOW_WINDOW,
  SOFA,
  TREE,
} from "../layout";

describe("Christmas Cabin layout", () => {
  it("keeps every floor prop out of the view of the board", () => {
    for (const [name, f] of Object.entries(floorFootprints())) {
      expect(blocksBoard(f), `${name} blocks the board`).toBe(false);
    }
  });

  it("keeps every floor prop inside the walls", () => {
    for (const [name, f] of Object.entries(floorFootprints())) {
      expect(insideRoom(f), `${name} pokes through a wall`).toBe(true);
    }
  });

  it("would catch a prop standing in front of the board", () => {
    expect(blocksBoard({ x: 0, z: 1, halfX: 0.3, halfZ: 0.3 })).toBe(true);
    expect(blocksBoard({ x: 4, z: 1, halfX: 0.3, halfZ: 0.3 })).toBe(false);
    // Wide and shallow, reaching in from the side of the board.
    expect(blocksBoard({ x: -3, z: -1.9, halfX: 1, halfZ: 0.3 })).toBe(true);
  });

  it("hangs the alphabet wall clear of the board and inside the room", () => {
    const left = ALPHABET_WALL.x - ALPHABET_WALL.width / 2;
    const right = ALPHABET_WALL.x + ALPHABET_WALL.width / 2;
    expect(left).toBeGreaterThan(BOARD.width / 2);
    expect(right).toBeLessThan(ROOM.halfWidth);
    expect(ALPHABET_WALL.y + ALPHABET_WALL.height / 2).toBeLessThan(ROOM.height);
  });

  it("leaves the whole alphabet wall in view past the tree", () => {
    const right = ALPHABET_WALL.x + ALPHABET_WALL.width / 2;
    // The sight line to the wall's far edge passes left of the tree.
    expect(sightLineX(right, TREE.z)).toBeLessThan(TREE.x - TREE.radius);
  });

  it("spells out the whole alphabet, once", () => {
    expect(ALPHABET_WALL.rows.join("")).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  });

  it("puts the window over the sofa and inside the wall", () => {
    expect(Math.abs(SNOW_WINDOW.z - SOFA.z)).toBeLessThan(SOFA.length / 2);
    expect(SNOW_WINDOW.y + SNOW_WINDOW.height / 2).toBeLessThan(ROOM.height);
    expect(SNOW_WINDOW.y - SNOW_WINDOW.height / 2).toBeGreaterThan(0.9);
  });
});
