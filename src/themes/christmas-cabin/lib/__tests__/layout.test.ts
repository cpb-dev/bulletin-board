import { describe, expect, it } from "vitest";
import { BOARD } from "@/lib/board-geometry";
import {
  ALPHABET_WALL,
  alphabetWallEnds,
  blocksBoard,
  blocksSight,
  FIREPLACE,
  floorFootprints,
  insideRoom,
  ROOM,
  SNOW_WINDOW,
  SOFA,
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

  it("hangs the alphabet wall on the right wall, inside the room", () => {
    const [back, front] = alphabetWallEnds();
    expect(back.z).toBeGreaterThan(ROOM.backZ);
    expect(front.z).toBeLessThan(ROOM.frontZ);
    expect(ALPHABET_WALL.y + ALPHABET_WALL.height / 2).toBeLessThan(ROOM.height);
  });

  it("leaves the whole alphabet wall in view past the tree and fireplace", () => {
    const { tree, fireplace } = floorFootprints();
    for (const end of alphabetWallEnds()) {
      expect(blocksSight(end, tree), `tree hides the wall at z=${end.z}`).toBe(false);
      expect(blocksSight(end, fireplace), `fireplace hides the wall at z=${end.z}`).toBe(
        false
      );
    }
  });

  it("would catch something standing in the way", () => {
    const [back] = alphabetWallEnds();
    const mid = { x: (back.x + 0.4) / 2, z: (back.z + 4.4) / 2 };
    expect(blocksSight(back, { ...mid, halfX: 0.2, halfZ: 0.2 })).toBe(true);
  });

  it("keeps the back wall in order: window and sofa, board, fireplace", () => {
    const boardEdge = BOARD.width / 2 + 0.1;
    expect(SNOW_WINDOW.x + SNOW_WINDOW.width / 2).toBeLessThan(-boardEdge);
    expect(SOFA.x + SOFA.length / 2).toBeLessThan(-boardEdge);
    expect(FIREPLACE.x - FIREPLACE.width / 2).toBeGreaterThan(boardEdge);
    expect(SNOW_WINDOW.x - SNOW_WINDOW.width / 2).toBeGreaterThan(-ROOM.halfWidth);
    expect(FIREPLACE.x + FIREPLACE.width / 2).toBeLessThan(ROOM.halfWidth);
  });

  it("spells out the whole alphabet, once", () => {
    expect(ALPHABET_WALL.rows.join("")).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  });

  it("puts the window over the sofa, clear of its back, and inside the wall", () => {
    expect(SNOW_WINDOW.x).toBe(SOFA.x);
    expect(SNOW_WINDOW.width).toBeGreaterThan(SOFA.length);
    expect(SNOW_WINDOW.y + SNOW_WINDOW.height / 2).toBeLessThan(ROOM.height);
    // The sofa back is about 1.2 high; the sill sits above it.
    expect(SNOW_WINDOW.y - SNOW_WINDOW.height / 2).toBeGreaterThan(1.3);
  });
});
