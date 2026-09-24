import { describe, expect, it } from "vitest";
import { planTree, type TreeSpecies } from "../tree";

const SPECIES: TreeSpecies[] = ["maple", "street", "sycamore"];

describe("planTree", () => {
  it("grows the same tree from the same seed", () => {
    for (const s of SPECIES) expect(planTree(s, 7)).toEqual(planTree(s, 7));
  });

  it("grows a different tree from a different seed", () => {
    for (const s of SPECIES) {
      expect(planTree(s, 1).blobs).not.toEqual(planTree(s, 2).blobs);
    }
  });

  it("stands the trunk on the ground and hangs the limbs off its top", () => {
    for (const s of SPECIES) {
      for (let seed = 1; seed < 20; seed++) {
        const t = planTree(s, seed);
        expect(t.trunk[0]).toEqual([0, 0, 0]);
        const top = t.trunk[t.trunk.length - 1];
        for (const limb of t.limbs) {
          const base = limb.points[0];
          expect(Math.hypot(base[0] - top[0], base[2] - top[2])).toBeLessThan(1e-9);
          expect(Math.abs(base[1] - top[1])).toBeLessThan(0.2);
          // limbs reach up and out, never down
          expect(limb.points[2][1]).toBeGreaterThan(base[1]);
        }
      }
    }
  });

  it("keeps the foliage above the trunk's fork, where a crown is", () => {
    for (const s of SPECIES) {
      for (let seed = 1; seed < 20; seed++) {
        const t = planTree(s, seed);
        const fork = t.trunk[t.trunk.length - 1][1];
        for (const b of t.blobs) {
          expect(b.at[1] - b.r).toBeGreaterThan(fork * 0.55);
          expect(b.tone).toBeGreaterThanOrEqual(0);
          expect(b.tone).toBeLessThanOrEqual(1);
        }
      }
    }
  });

  it("sizes the kinds as they are on the square", () => {
    const tallest = (s: TreeSpecies) =>
      Math.max(...Array.from({ length: 12 }, (_, i) => planTree(s, i + 1).height));
    const shortest = (s: TreeSpecies) =>
      Math.min(...Array.from({ length: 12 }, (_, i) => planTree(s, i + 1).height));
    // the little street trees are always smaller than any maple, and the
    // old sycamores are the tallest things growing
    expect(tallest("street")).toBeLessThan(shortest("maple"));
    expect(shortest("sycamore")).toBeGreaterThan(shortest("maple"));
  });

  it("gives a maple a full crown and a sycamore only a few leaves", () => {
    for (let seed = 1; seed < 10; seed++) {
      const maple = planTree("maple", seed);
      const syc = planTree("sycamore", seed);
      const volume = (t: typeof maple) => t.blobs.reduce((v, b) => v + b.r ** 3, 0);
      expect(volume(maple)).toBeGreaterThan(volume(syc) * 3);
    }
  });
});
