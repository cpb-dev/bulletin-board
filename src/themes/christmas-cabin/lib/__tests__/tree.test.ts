import { describe, expect, it } from "vitest";
import { TREE, TREE_SKIRT_Y, treeRadiusAt } from "../layout";
import { baubles, branches, branchTip, lightString, LIGHTS, twinkle } from "../tree";

describe("the tree's outline", () => {
  it("is widest at the bottom whorl and narrows to the tip", () => {
    expect(treeRadiusAt(TREE_SKIRT_Y)).toBeCloseTo(TREE.radius, 6);
    expect(treeRadiusAt(TREE.height)).toBe(0);
    let last = Infinity;
    for (let y = TREE_SKIRT_Y; y <= TREE.height; y += 0.05) {
      expect(treeRadiusAt(y)).toBeLessThanOrEqual(last);
      last = treeRadiusAt(y);
    }
  });

  it("has bare trunk under the branches, for the presents", () => {
    expect(treeRadiusAt(TREE_SKIRT_Y - 0.01)).toBe(0);
  });
});

describe("branches", () => {
  const all = branches();

  it("fill the tree from the bottom whorl to near the tip", () => {
    const ys = all.map((b) => b.y);
    expect(Math.min(...ys)).toBeLessThan(TREE_SKIRT_Y + 0.1);
    expect(Math.max(...ys)).toBeGreaterThan(TREE.height - 0.3);
    expect(all.length).toBeGreaterThan(150);
  });

  it("reach the outline at their tips, and no further", () => {
    for (const b of all) {
      const tip = branchTip(b);
      const reach = Math.hypot(tip.x, tip.z);
      expect(reach).toBeLessThanOrEqual(TREE.radius * 1.05);
      expect(reach).toBeGreaterThan(treeRadiusAt(b.y) * 0.85);
    }
  });

  it("droop more lower down, like a real fir", () => {
    const low = all.filter((b) => b.y < 1).map((b) => b.droop);
    const high = all.filter((b) => b.y > 2.4).map((b) => b.droop);
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(low)).toBeGreaterThan(mean(high) + 0.1);
  });

  it("are more numerous in the wide lower rings", () => {
    const at = (y: number) => all.filter((b) => Math.abs(b.y - y) < 0.07).length;
    expect(at(all[0].y)).toBeGreaterThan(at(all[all.length - 1].y));
  });
});

describe("the lights", () => {
  const lights = lightString();

  it("are all there, sitting just inside the outline", () => {
    expect(lights).toHaveLength(LIGHTS.count);
    for (const l of lights) {
      const rad = Math.hypot(l.x, l.z);
      expect(rad).toBeLessThanOrEqual(treeRadiusAt(l.y) + 1e-9);
      expect(rad).toBeGreaterThan(treeRadiusAt(l.y) * 0.8);
    }
  });

  it("wind from the bottom to near the top", () => {
    expect(lights[0].y).toBeLessThan(0.6);
    expect(lights[lights.length - 1].y).toBeGreaterThan(TREE.height - 0.4);
  });

  it("are spaced evenly along the wire", () => {
    const gaps = lights.slice(1).map((l, i) => Math.hypot(l.x - lights[i].x, l.y - lights[i].y, l.z - lights[i].z));
    const mean = gaps.reduce((a, b) => a + b, 0) / gaps.length;
    // Chord vs. arc makes them a touch uneven where the spiral is tight.
    for (const g of gaps) expect(Math.abs(g - mean)).toBeLessThan(mean * 0.35);
  });
});

describe("twinkle", () => {
  it("stays between dim and full brightness", () => {
    for (let i = 0; i < 40; i++)
      for (let t = 0; t < 30; t += 0.37) {
        const v = twinkle(i, t);
        expect(v).toBeGreaterThanOrEqual(0.14);
        expect(v).toBeLessThanOrEqual(1);
      }
  });

  it("is slow: no light changes much in a frame", () => {
    for (let i = 0; i < 40; i++)
      for (let t = 0; t < 20; t += 1 / 60) {
        expect(Math.abs(twinkle(i, t + 1 / 60) - twinkle(i, t))).toBeLessThan(0.02);
      }
  });

  it("doesn't pulse in sync: at any moment the lights differ", () => {
    for (const t of [0, 2.5, 11]) {
      const vs = Array.from({ length: 40 }, (_, i) => twinkle(i, t));
      expect(Math.max(...vs) - Math.min(...vs)).toBeGreaterThan(0.4);
    }
  });
});

describe("baubles", () => {
  const all = baubles();

  it("hang among the needles, inside the outline", () => {
    for (const b of all) {
      expect(Math.hypot(b.x, b.z)).toBeLessThanOrEqual(treeRadiusAt(b.y));
      expect(b.y).toBeGreaterThan(TREE_SKIRT_Y);
      expect(b.y).toBeLessThan(TREE.height);
    }
  });

  it("are spread all over: none on top of another", () => {
    for (let i = 0; i < all.length; i++)
      for (let j = i + 1; j < all.length; j++) {
        const a = all[i];
        const b = all[j];
        expect(Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)).toBeGreaterThan(a.size + b.size);
      }
  });

  it("get smaller towards the top", () => {
    const low = all.filter((b) => b.y < 1.2).map((b) => b.size);
    const high = all.filter((b) => b.y > 2.2).map((b) => b.size);
    expect(Math.min(...low)).toBeGreaterThan(Math.max(...high) * 0.95);
  });
});
