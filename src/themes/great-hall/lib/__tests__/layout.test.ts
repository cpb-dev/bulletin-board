import { describe, expect, it } from "vitest";
import { BOARD } from "@/lib/board-geometry";
import {
  BACK_WINDOW,
  BANNERS,
  CANDLES,
  DAIS,
  HALL,
  PILLARS,
  ROOM_CAMERA,
  SIDE_WINDOWS,
  TREES,
  blocksBoard,
  boardSightTop,
  floorFootprints,
  insideHall,
} from "../layout";

describe("Great Hall layout", () => {
  const props = floorFootprints();

  it("keeps the whole board in view: nothing stands in the way", () => {
    for (const [name, f] of Object.entries(props)) expect(blocksBoard(f), name).toBe(false);
  });

  it("would catch something standing in the aisle", () => {
    expect(blocksBoard({ x: 0, z: 1, halfX: 0.3, halfZ: 0.3 })).toBe(true);
    expect(blocksBoard({ x: 2.2, z: -1.5, halfX: 0.3, halfZ: 0.3 })).toBe(true);
  });

  it("keeps everything inside the hall", () => {
    for (const [name, f] of Object.entries(props)) expect(insideHall(f), name).toBe(true);
  });

  it("stands the camera in the aisle, clear of the tables and benches", () => {
    for (const [name, f] of Object.entries(props)) {
      const inX = Math.abs(ROOM_CAMERA.x - f.x) < f.halfX + 0.3;
      const inZ = Math.abs(ROOM_CAMERA.z - f.z) < f.halfZ + 0.3;
      expect(inX && inZ, name).toBe(false);
    }
  });

  it("floats every candle above the line of sight to the board", () => {
    expect(CANDLES.minY).toBeGreaterThan(boardSightTop() + 0.5);
    expect(CANDLES.maxY).toBeLessThan(HALL.height - 1);
  });

  it("puts the window above the board and below the ceiling", () => {
    expect(BACK_WINDOW.sill).toBeGreaterThan(BOARD.centerY + BOARD.height / 2 + 0.3);
    expect(BACK_WINDOW.top).toBeLessThan(HALL.height);
    expect(BACK_WINDOW.width / 2).toBeLessThan(Math.min(...BANNERS.xs.map(Math.abs)) - BANNERS.width / 2);
  });

  it("keeps windows and pillars apart down the side walls", () => {
    for (const w of SIDE_WINDOWS.zs) {
      for (const p of PILLARS.zs) {
        expect(Math.abs(w - p), `window ${w} / pillar ${p}`).toBeGreaterThan(
          SIDE_WINDOWS.width / 2 + PILLARS.width / 2
        );
      }
    }
  });

  it("stands the board on the dais, clear of its step", () => {
    expect(BOARD.centerY - BOARD.height / 2).toBeGreaterThan(DAIS.height);
  });

  it("keeps the trees below the ceiling", () => {
    for (const t of TREES) expect(t.height).toBeLessThan(HALL.height - 1.5);
  });
});
