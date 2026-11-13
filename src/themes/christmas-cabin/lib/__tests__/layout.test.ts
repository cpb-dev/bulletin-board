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
  presentPlace,
  ROOM,
  ROOM_CAMERA,
  SNOW_WINDOW,
  TREE,
  TREE_SKIRT_Y,
  treeHidesWindow,
  treeRadiusAt,
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

  it("is a big tree: taller than the window's top, near the ceiling", () => {
    expect(TREE.height).toBeGreaterThan(SNOW_WINDOW.y + SNOW_WINDOW.height / 2);
    expect(TREE.height + 0.3).toBeLessThan(ROOM.height - 0.3);
  });

  it("stands by the left wall, forward of the window", () => {
    expect(TREE.x - TREE.radius).toBeGreaterThan(-ROOM.halfWidth);
    expect(TREE.x - TREE.radius).toBeLessThan(-ROOM.halfWidth + 0.2);
    expect(TREE.z - TREE.radius).toBeGreaterThan(ROOM.backZ + 0.8);
  });

  it("would notice a tree that hid the window", () => {
    // The check is about the tree's width where the sight line passes:
    // at the sill it's a little over half its base width.
    const sill = SNOW_WINDOW.y - SNOW_WINDOW.height / 2;
    expect(treeRadiusAt(sill)).toBeLessThan(TREE.radius * 0.7);
    expect(treeRadiusAt(TREE_SKIRT_Y + 0.05)).toBeGreaterThan(TREE.radius * 0.95);
  });

  it("keeps presents on the floor from overlapping each other", () => {
    const floor = PRESENTS.map((p, i) => ({ p, at: presentPlace(i) })).filter(({ p }) => p.on === undefined);
    for (let i = 0; i < floor.length; i++) {
      for (let j = i + 1; j < floor.length; j++) {
        const a = floor[i];
        const b = floor[j];
        const gap = Math.hypot(a.at.x - b.at.x, a.at.z - b.at.z);
        // Conservative: half the diagonal of each, which is no overlap
        // however they're turned.
        const reach = (Math.hypot(a.p.w, a.p.d) + Math.hypot(b.p.w, b.p.d)) / 2;
        expect(gap, `presents ${i} and ${j} overlap`).toBeGreaterThan(reach * 0.85);
      }
    }
  });

  it("rests stacked presents on top of the one below, smaller and inside it", () => {
    PRESENTS.forEach((p, i) => {
      if (p.on === undefined) return;
      const below = PRESENTS[p.on];
      expect(below.on, "only one level of stacking").toBeUndefined();
      expect(presentPlace(i).base).toBeCloseTo(below.h, 9);
      expect(p.w).toBeLessThan(below.w);
      expect(p.d).toBeLessThan(below.d);
      // Its centre, however it's turned, stays on the box below.
      expect(Math.hypot(p.x, p.z) + Math.hypot(p.w, p.d) / 2).toBeLessThan(
        Math.hypot(below.w, below.d) / 2 + 0.02
      );
    });
  });

  it("keeps presents clear of the trunk", () => {
    PRESENTS.forEach((_, i) => {
      const at = presentPlace(i);
      expect(Math.hypot(at.x - TREE.x, at.z - TREE.z)).toBeGreaterThan(0.3);
    });
  });

  it("has presents of really different sizes and papers", () => {
    const vols = PRESENTS.map((p) => p.w * p.h * p.d);
    expect(Math.max(...vols) / Math.min(...vols)).toBeGreaterThan(8);
    expect(new Set(PRESENTS.map((p) => p.wrap)).size).toBeGreaterThan(6);
  });
});
