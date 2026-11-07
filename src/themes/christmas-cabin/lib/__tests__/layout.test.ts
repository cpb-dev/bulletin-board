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
  PRESENTS,
  ROOM,
  ROOM_CAMERA,
  SNOW_WINDOW,
  TREE,
  treeHidesWindow,
  treeRadiusAt,
  treeTiers,
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

  it("leaves the whole alphabet wall in view past the fireplace and tree", () => {
    const { tree, fireplace } = floorFootprints();
    for (const end of alphabetWallEnds()) {
      expect(blocksSight(end, fireplace), `fireplace hides the wall at z=${end.z}`).toBe(
        false
      );
      expect(blocksSight(end, tree), `tree hides the wall at z=${end.z}`).toBe(false);
    }
  });

  it("would catch something standing in the way", () => {
    const [back] = alphabetWallEnds();
    const mid = { x: (back.x + 0.4) / 2, z: (back.z + 4.4) / 2 };
    expect(blocksSight(back, { ...mid, halfX: 0.2, halfZ: 0.2 })).toBe(true);
  });

  it("keeps the back wall in order: tree, window, board, fireplace", () => {
    const boardEdge = BOARD.width / 2 + 0.1;
    expect(SNOW_WINDOW.x + SNOW_WINDOW.width / 2).toBeLessThan(-boardEdge);
    // Left of the window as seen from the room camera: the tree's trunk
    // bears further left than the window's left edge.
    const bearing = (x: number, z: number) => (x - ROOM_CAMERA.x) / (ROOM_CAMERA.z - z);
    expect(bearing(TREE.x, TREE.z)).toBeLessThan(
      bearing(SNOW_WINDOW.x - SNOW_WINDOW.width / 2, ROOM.backZ)
    );
    expect(FIREPLACE.x - FIREPLACE.width / 2).toBeGreaterThan(boardEdge);
    expect(SNOW_WINDOW.x - SNOW_WINDOW.width / 2).toBeGreaterThan(-ROOM.halfWidth);
    expect(FIREPLACE.x + FIREPLACE.width / 2).toBeLessThan(ROOM.halfWidth);
  });

  it("spells out the whole alphabet, once", () => {
    expect(ALPHABET_WALL.rows.join("")).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
  });

  it("keeps the window clear of the floor and inside the wall", () => {
    expect(SNOW_WINDOW.y + SNOW_WINDOW.height / 2).toBeLessThan(ROOM.height);
    // Room under the sill for the tinsel and the presents.
    expect(SNOW_WINDOW.y - SNOW_WINDOW.height / 2).toBeGreaterThan(1.2);
  });

  it("stands the tree beside the window without hiding any of it", () => {
    expect(treeHidesWindow()).toBe(false);
  });

  it("would notice a tree that hid the window", () => {
    // The same check, with the tree as wide at the sill as at its base.
    const sill = SNOW_WINDOW.y - SNOW_WINDOW.height / 2;
    expect(treeRadiusAt(sill)).toBeLessThan(TREE.radius / 2);
    expect(treeRadiusAt(0.6)).toBeGreaterThan(TREE.radius * 0.8);
  });

  it("stacks the tree's cones so there are no gaps up the trunk", () => {
    const tiers = treeTiers();
    for (let i = 1; i < tiers.length; i++) {
      const below = tiers[i - 1];
      expect(tiers[i].y).toBeLessThan(below.y + below.h);
      expect(tiers[i].r).toBeLessThan(below.r);
    }
    const top = tiers[tiers.length - 1];
    expect(top.y + top.h).toBeCloseTo(TREE.height, 1);
  });

  it("keeps presents from overlapping each other", () => {
    for (let i = 0; i < PRESENTS.length; i++) {
      for (let j = i + 1; j < PRESENTS.length; j++) {
        const a = PRESENTS[i];
        const b = PRESENTS[j];
        const gap = Math.hypot(a.x - b.x, a.z - b.z);
        // Conservative: half the diagonal of each, which is no overlap
        // however they're turned.
        const reach = (Math.hypot(a.w, a.d) + Math.hypot(b.w, b.d)) / 2;
        expect(gap, `presents ${i} and ${j} overlap`).toBeGreaterThan(reach * 0.85);
      }
    }
  });
});
