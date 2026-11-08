import { describe, expect, it } from "vitest";
import { CHART, fairIsleChart } from "../fairisle";

describe("the Fair Isle rug chart", () => {
  const chart = fairIsleChart();

  it("is exactly the rug's stitches, every row the same width", () => {
    expect(chart).toHaveLength(CHART.rows);
    for (const row of chart) expect(row).toHaveLength(CHART.cols);
  });

  it("uses only cranberry, cream and pine", () => {
    for (const row of chart) for (const s of row) expect(["r", "c", "g"]).toContain(s);
  });

  it("mirrors top to bottom, like a knitted blanket", () => {
    for (let i = 0; i < chart.length; i++) {
      expect(chart[i].join("")).toBe(chart[chart.length - 1 - i].join(""));
    }
  });

  it("mirrors left to right", () => {
    for (const row of chart) expect(row.join("")).toBe([...row].reverse().join(""));
  });

  it("is mostly cranberry, with cream motifs and a little green", () => {
    const all = chart.flat();
    const share = (s: string) => all.filter((x) => x === s).length / all.length;
    expect(share("r")).toBeGreaterThan(0.6);
    expect(share("c")).toBeGreaterThan(0.08);
    expect(share("g")).toBeGreaterThan(0.01);
    expect(share("g")).toBeLessThan(share("c"));
  });

  it("frames the rug with a cream edge", () => {
    expect(chart[0].every((s) => s === "c")).toBe(true);
  });

  it("has a band of big snowflakes through the middle", () => {
    const mid = chart[Math.floor(CHART.rows / 2)];
    const cream = mid.filter((s) => s === "c").length;
    // The snowflakes' arms cross the middle row in several places.
    expect(cream).toBeGreaterThan(20);
  });
});
