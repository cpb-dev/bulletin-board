import { describe, expect, it } from "vitest";
import { PAPER_PATTERNS, isPaperPattern, swatchBackground } from "../paper-pattern";
import { THEMES } from "@/themes";

describe("paper patterns (BB-46)", () => {
  it("leaves a plain paper's swatch as its colour", () => {
    expect(swatchBackground("#fbf8f1")).toBe("#fbf8f1");
  });

  it("gives every pattern a swatch built on the paper's colour", () => {
    for (const p of PAPER_PATTERNS) {
      const css = swatchBackground("#123456", p);
      expect(css).toContain("#123456");
      expect(css).toContain("gradient");
    }
  });

  it("only uses patterns that exist, and only on Christmas Cabin so far", () => {
    for (const theme of THEMES) {
      for (const paper of theme.papers) {
        if (paper.pattern === undefined) continue;
        expect(isPaperPattern(paper.pattern)).toBe(true);
        expect(theme.id).toBe("christmas-cabin");
      }
    }
  });

  it("keeps the Cabin's original papers (saved notes refer to them by id)", () => {
    const cabin = THEMES.find((t) => t.id === "christmas-cabin")!;
    const ids = cabin.papers.map((p) => p.id);
    expect(ids.slice(0, 4)).toEqual(["snow", "holly", "berry", "gold"]);
    expect(ids).toEqual(expect.arrayContaining(["candy-cane", "tartan", "kraft", "snowflake"]));
  });
});
