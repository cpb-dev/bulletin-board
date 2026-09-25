import { describe, expect, it } from "vitest";
import {
  NOTE_SHAPES,
  isOutlinedShape,
  legacyShape,
  noteLayout,
  noteOutline,
  pinAnchor,
  pointInOutline,
  resolveNoteShape,
  shapeAfterPaperChange,
  shapeIconPath,
  shapeSeed,
  shapeToStore,
  type NoteShape,
} from "../note-shape";

describe("resolveNoteShape — existing notes render as they always have", () => {
  it("keeps old heart notes (paper 'heart', no shape) as hearts", () => {
    expect(resolveNoteShape({ paper: "heart" })).toBe("heart");
    expect(resolveNoteShape({ paper: "heart", shape: null })).toBe("heart");
  });

  it("keeps every other old note square", () => {
    for (const paper of ["butter", "petal", "pitch", "photo", ""]) {
      expect(resolveNoteShape({ paper })).toBe("square");
      expect(resolveNoteShape({ paper, shape: null })).toBe("square");
    }
  });

  it("uses a stored shape when there is one", () => {
    expect(resolveNoteShape({ paper: "butter", shape: "star" })).toBe("star");
    expect(resolveNoteShape({ paper: "heart", shape: "square" })).toBe("square");
    expect(resolveNoteShape({ paper: "petal", shape: "heart" })).toBe("heart");
  });

  it("falls back to the legacy shape for a shape it doesn't know", () => {
    expect(resolveNoteShape({ paper: "butter", shape: "hexagon" })).toBe("square");
    expect(resolveNoteShape({ paper: "heart", shape: "hexagon" })).toBe("heart");
  });
});

describe("shapeToStore", () => {
  it("writes nothing when the paper already implies the shape", () => {
    expect(shapeToStore("square", "butter")).toBeNull();
    expect(shapeToStore("heart", "heart")).toBeNull();
  });

  it("writes the shape when it differs from the paper's", () => {
    expect(shapeToStore("circle", "butter")).toBe("circle");
    expect(shapeToStore("heart", "petal")).toBe("heart");
    expect(shapeToStore("square", "heart")).toBe("square");
  });

  it("round-trips through resolveNoteShape for every shape and paper", () => {
    for (const { id } of NOTE_SHAPES) {
      for (const paper of ["heart", "butter"]) {
        expect(resolveNoteShape({ paper, shape: shapeToStore(id, paper) })).toBe(id);
      }
    }
  });
});

describe("legacyShape", () => {
  it("is only a heart for the heart paper", () => {
    expect(legacyShape("heart")).toBe("heart");
    expect(legacyShape("Heart")).toBe("square");
  });
});

describe("outlines", () => {
  const outlined = NOTE_SHAPES.map((s) => s.id).filter(isOutlinedShape);

  it("leaves square and heart to their original drawing", () => {
    expect(noteOutline("square")).toBeNull();
    expect(noteOutline("heart")).toBeNull();
    expect(noteLayout("square")).toBeNull();
    expect(noteLayout("heart")).toBeNull();
  });

  it.each(outlined)("%s stays inside the canvas", (shape) => {
    const pts = noteOutline(shape, 42)!;
    expect(pts.length).toBeGreaterThan(8);
    for (const [x, y] of pts) {
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThanOrEqual(1);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(y).toBeLessThanOrEqual(1);
    }
  });

  it.each(outlined)("%s keeps its writing and stamp inside the paper", (shape) => {
    const pts = noteOutline(shape, 7)!;
    const l = noteLayout(shape)!;
    const corners: [number, number][] = [
      [l.left, l.top],
      [l.right, l.top],
      [l.left, l.bottom],
      [l.right, l.bottom],
      [0.5 - l.footerWidth / 2, l.footerY],
      [0.5 + l.footerWidth / 2, l.footerY],
    ];
    for (const [x, y] of corners) expect(pointInOutline(pts, x, y)).toBe(true);
  });

  it.each(outlined)("%s is grabbable in the middle, not in the corners", (shape) => {
    const pts = noteOutline(shape, 3)!;
    expect(pointInOutline(pts, 0.5, 0.55)).toBe(true);
    if (shape !== "torn") {
      expect(pointInOutline(pts, 0.03, 0.03)).toBe(false);
      expect(pointInOutline(pts, 0.97, 0.97)).toBe(false);
    }
  });

  it("tears the same way every time for the same note", () => {
    const seed = shapeSeed("5b8c2e1a-note");
    expect(noteOutline("torn", seed)).toEqual(noteOutline("torn", seed));
    expect(noteOutline("torn", seed)).not.toEqual(noteOutline("torn", seed + 1));
  });

  it("has a pin inside the paper for every pinned shape", () => {
    for (const { id } of NOTE_SHAPES) {
      const a = pinAnchor(id as NoteShape);
      if (a === null) continue;
      const pts = noteOutline(id, 1);
      // anchor is in half-size units, y up; convert to unit-square y-down
      if (pts) expect(pointInOutline(pts, 0.5, 0.5 - a / 2)).toBe(true);
      else expect(Math.abs(a)).toBeLessThan(1);
    }
  });

  it("keeps hearts pinless, as they always were", () => {
    expect(pinAnchor("heart")).toBeNull();
  });
});

describe("shapeIconPath", () => {
  it.each(NOTE_SHAPES.map((s) => s.id))("draws a closed path for %s", (shape) => {
    const d = shapeIconPath(shape);
    expect(d.startsWith("M")).toBe(true);
    expect(d.endsWith("Z")).toBe(true);
    expect(d).not.toContain("NaN");
  });
});

describe("shapeAfterPaperChange", () => {
  it("follows the paper until a shape is picked, as before BB-24", () => {
    expect(shapeAfterPaperChange("square", false, "heart")).toBe("heart");
    expect(shapeAfterPaperChange("heart", false, "petal")).toBe("square");
  });

  it("keeps a picked shape when the colour changes", () => {
    expect(shapeAfterPaperChange("star", true, "heart")).toBe("star");
    expect(shapeAfterPaperChange("heart", true, "petal")).toBe("heart");
  });
});
