import { describe, expect, it } from "vitest";
import { flecks, fringe, latticeLines, RUG } from "../rug";
import { ROOM } from "../layout";
import { BOARD } from "@/lib/board-geometry";

describe("the rug's pattern", () => {
  const lines = latticeLines();

  it("keeps the whole lattice inside the plain border", () => {
    for (const line of lines)
      for (const p of line) {
        expect(p.u).toBeGreaterThanOrEqual(RUG.border);
        expect(p.u).toBeLessThanOrEqual(1 - RUG.border);
        expect(p.v).toBeGreaterThanOrEqual(RUG.border);
        expect(p.v).toBeLessThanOrEqual(1 - RUG.border);
      }
  });

  it("runs every line the full length of the field", () => {
    for (const line of lines) {
      expect(line[0].v).toBeCloseTo(RUG.border, 6);
      expect(line[line.length - 1].v).toBeCloseTo(1 - RUG.border, 6);
    }
  });

  it("pairs mirrored zig-zags that meet in the middle: diamonds", () => {
    // Lines come in pairs per column; at every odd step both reach the
    // column's centre.
    const [a, b] = [lines[0], lines[1]];
    for (let j = 1; j < a.length; j += 2) {
      expect(Math.abs(a[j].u - b[j].u)).toBeLessThan(0.02);
    }
    for (let j = 0; j < a.length; j += 2) {
      expect(Math.abs(a[j].u - b[j].u)).toBeGreaterThan(0.05);
    }
  });

  it("zig-zags, which is what makes diamonds", () => {
    const line = lines[2];
    const steps = line.slice(1).map((p, i) => Math.sign(p.u - line[i].u));
    const turns = steps.slice(1).filter((s, i) => s !== steps[i]).length;
    expect(turns).toBeGreaterThan(line.length / 2);
  });

  it("is hand-drawn, not ruled: points wobble a little but not a lot", () => {
    const cell = (1 - RUG.border * 2) / RUG.diamonds;
    const again = latticeLines(4);
    let moved = 0;
    lines.forEach((line, i) =>
      line.forEach((p, j) => {
        const d = Math.abs(p.u - again[i][j].u);
        expect(d).toBeLessThan(cell * 0.2);
        if (d > 1e-6) moved++;
      })
    );
    expect(moved).toBeGreaterThan(10);
  });

  it("dots flecks inside the field", () => {
    for (const f of flecks()) {
      expect(f.u).toBeGreaterThan(RUG.border);
      expect(f.u).toBeLessThan(1 - RUG.border);
    }
  });
});

describe("the rug's fringe", () => {
  it("spreads tassels evenly along the end, in order", () => {
    const tassels = fringe(1);
    expect(tassels).toHaveLength(RUG.fringe);
    for (let i = 1; i < tassels.length; i++) {
      expect(tassels[i].along).toBeGreaterThan(tassels[i - 1].along);
    }
    expect(tassels[0].along).toBeGreaterThan(-0.5);
    expect(tassels[tassels.length - 1].along).toBeLessThan(0.5);
  });
});

describe("the rug's place", () => {
  it("lies in front of the board, clear of the back wall and inside the room", () => {
    const back = RUG.z - RUG.depth / 2;
    expect(back).toBeGreaterThan(BOARD.wallZ + 0.8);
    expect(RUG.x + RUG.width / 2 + 0.15).toBeLessThan(ROOM.halfWidth);
    expect(RUG.z + RUG.depth / 2 + 0.15).toBeLessThan(ROOM.frontZ);
  });
});
