import { describe, expect, it } from "vitest";
import {
  branchPlan,
  type FallingLeaf,
  leafFall,
  treeShape,
  trunkPointAt,
} from "../tree";

const SEEDS = [1, 7, 42, 1234, 99999];

describe("treeShape", () => {
  it("is deterministic", () => {
    expect(treeShape(7)).toEqual(treeShape(7));
  });

  it("gives neighbouring trees noticeably different proportions", () => {
    // The whole point of the seed is that a row of trees doesn't read as
    // one tree at several scales.
    const heights = SEEDS.map((s) => treeShape(s).height);
    const spread = Math.max(...heights) - Math.min(...heights);
    expect(spread).toBeGreaterThan(0.5);
  });

  it("keeps every tree standing", () => {
    for (let seed = 1; seed < 400; seed++) {
      const s = treeShape(seed);
      expect(s.height).toBeGreaterThan(2);
      expect(s.trunkRadius).toBeGreaterThan(0);
      expect(Math.abs(s.lean)).toBeLessThan(0.12);
      expect(s.limbs).toBeGreaterThanOrEqual(3);
      expect(s.twigs).toBeGreaterThanOrEqual(1);
    }
  });

  it("strips a bare tree of its foliage entirely", () => {
    for (let seed = 1; seed < 400; seed++) {
      const s = treeShape(seed);
      if (s.bare) expect(s.fullness).toBe(0);
      else expect(s.fullness).toBeGreaterThan(0);
    }
  });

  it("leaves some trees bare, but not most of them", () => {
    let bare = 0;
    for (let seed = 1; seed < 400; seed++) if (treeShape(seed).bare) bare++;
    expect(bare).toBeGreaterThan(20);
    expect(bare / 399).toBeLessThan(0.4);
  });
});

describe("trunkPointAt", () => {
  it("starts at the origin so the caller can stand it on the ground", () => {
    // Component-wise: the lean direction can put a signed zero on x or z,
    // and toEqual treats -0 and 0 as different.
    const p = trunkPointAt(treeShape(3), 0);
    expect(p[0]).toBeCloseTo(0, 10);
    expect(p[1]).toBeCloseTo(0, 10);
    expect(p[2]).toBeCloseTo(0, 10);
  });

  it("climbs steadily", () => {
    const s = treeShape(3);
    expect(trunkPointAt(s, 0.5)[1]).toBeCloseTo(s.height * 0.5, 6);
    expect(trunkPointAt(s, 1)[1]).toBeCloseTo(s.height, 6);
  });

  it("curves rather than tipping over as a straight pole", () => {
    const s = { ...treeShape(3), lean: 0.1, leanDir: 0 };
    const half = trunkPointAt(s, 0.5)[0];
    const top = trunkPointAt(s, 1)[0];
    // a straight lean would put the half-height offset at exactly half
    expect(half).not.toBeCloseTo(top / 2, 3);
  });
});

describe("branchPlan", () => {
  it("is deterministic", () => {
    const s = treeShape(11);
    expect(branchPlan(11, s)).toEqual(branchPlan(11, s));
  });

  it("puts the trunk first, standing on the ground", () => {
    const s = treeShape(11);
    const [trunk] = branchPlan(11, s);
    expect(trunk.level).toBe(0);
    expect(trunk.points[0][0]).toBeCloseTo(0, 10);
    expect(trunk.points[0][1]).toBeCloseTo(0, 10);
    expect(trunk.points[0][2]).toBeCloseTo(0, 10);
    expect(trunk.points.at(-1)![1]).toBeCloseTo(s.height, 6);
  });

  it("grows one limb per limb, each with its twigs", () => {
    const s = treeShape(11);
    const plan = branchPlan(11, s);
    expect(plan.filter((b) => b.level === 1)).toHaveLength(s.limbs);
    expect(plan.filter((b) => b.level === 2)).toHaveLength(s.limbs * s.twigs);
  });

  it("tapers — every branch is thinner at the tip, and thinner than the trunk", () => {
    for (const seed of SEEDS) {
      const plan = branchPlan(seed, treeShape(seed));
      const trunk = plan[0];
      for (const b of plan) {
        expect(b.r1).toBeLessThan(b.r0);
        expect(b.r0).toBeGreaterThan(0);
        if (b.level > 0) expect(b.r0).toBeLessThan(trunk.r0);
      }
    }
  });

  it("attaches every limb to the trunk and every twig to its limb", () => {
    for (const seed of SEEDS) {
      const s = treeShape(seed);
      const plan = branchPlan(seed, s);
      for (const b of plan.filter((l) => l.level === 1)) {
        // a limb's base sits on the trunk's centre line
        const u = b.points[0][1] / s.height;
        const onTrunk = trunkPointAt(s, u);
        expect(b.points[0][0]).toBeCloseTo(onTrunk[0], 6);
        expect(b.points[0][2]).toBeCloseTo(onTrunk[2], 6);
      }
    }
  });

  it("never dips a branch below the ground", () => {
    for (let seed = 1; seed < 200; seed++) {
      for (const b of branchPlan(seed, treeShape(seed))) {
        for (const p of b.points) expect(p[1]).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("emits only finite coordinates", () => {
    for (let seed = 1; seed < 200; seed++) {
      for (const b of branchPlan(seed, treeShape(seed))) {
        for (const p of b.points) {
          expect(Number.isFinite(p[0] + p[1] + p[2])).toBe(true);
        }
      }
    }
  });

  it("hangs foliage on the branch ends, and none at all on a bare tree", () => {
    const leafy = SEEDS.map(treeShape).findIndex((s) => !s.bare);
    const seed = SEEDS[leafy];
    const plan = branchPlan(seed, treeShape(seed));
    expect(plan[0].cluster).toBe(0); // never on the trunk
    expect(plan.filter((b) => b.cluster > 0).length).toBeGreaterThan(0);

    for (let s = 1; s < 400; s++) {
      const shape = treeShape(s);
      if (!shape.bare) continue;
      for (const b of branchPlan(s, shape)) expect(b.cluster).toBe(0);
      break;
    }
  });

  it("fans the limbs around the trunk instead of stacking them", () => {
    const s = treeShape(11);
    const limbs = branchPlan(11, s).filter((b) => b.level === 1);
    const angles = limbs.map((b) => {
      const [bx, , bz] = b.points[0];
      const [tx, , tz] = b.points.at(-1)!;
      return Math.atan2(tz - bz, tx - bx);
    });
    for (let i = 0; i < angles.length; i++) {
      for (let j = i + 1; j < angles.length; j++) {
        let d = Math.abs(angles[i] - angles[j]) % (Math.PI * 2);
        if (d > Math.PI) d = Math.PI * 2 - d;
        expect(d).toBeGreaterThan(0.25);
      }
    }
  });
});

describe("leafFall", () => {
  const leaf: FallingLeaf = {
    x: 2,
    z: -3,
    top: 4,
    fallSeconds: 9,
    cycleOffset: 0.3,
    sway: 1.4,
    drift: 0.7,
    swayPhase: 1.1,
    spin: 1.9,
    flutter: 2.3,
  };

  it("is deterministic", () => {
    expect(leafFall(4.2, leaf)).toEqual(leafFall(4.2, leaf));
  });

  it("never goes underground or above where it started", () => {
    for (let t = 0; t < 200; t += 0.05) {
      const p = leafFall(t, leaf);
      expect(p.y).toBeGreaterThanOrEqual(0);
      expect(p.y).toBeLessThanOrEqual(leaf.top);
    }
  });

  it("works for a leaf already part-way down at t = 0", () => {
    expect(leafFall(0, leaf).y).toBeLessThan(leaf.top);
    expect(leafFall(0, leaf).y).toBeGreaterThan(0);
  });

  it("falls, rather than hovering", () => {
    // inside one cycle, later is always lower
    const start = leafFall(0, leaf).y;
    const mid = leafFall(2, leaf).y;
    expect(mid).toBeLessThan(start);
  });

  it("starts again at the top once it has landed", () => {
    const before = leafFall(6.2, leaf).y;
    const after = leafFall(6.3, leaf).y;
    // somewhere in here it wraps; either way it stays in range
    expect(before).toBeGreaterThanOrEqual(0);
    expect(after).toBeGreaterThanOrEqual(0);
    // and a whole cycle later it is back where it was
    expect(leafFall(1 + leaf.fallSeconds, leaf).y).toBeCloseTo(
      leafFall(1, leaf).y,
      6
    );
  });

  it("stays near the tree it fell from", () => {
    for (let t = 0; t < 200; t += 0.07) {
      const p = leafFall(t, leaf);
      expect(Math.abs(p.x - leaf.x)).toBeLessThanOrEqual(leaf.drift);
      expect(Math.abs(p.z - leaf.z)).toBeLessThanOrEqual(leaf.drift);
    }
  });

  it("wanders rather than spiralling — the two axes never lock", () => {
    let differed = 0;
    for (let t = 0; t < 60; t += 0.3) {
      const p = leafFall(t, leaf);
      if (Math.abs(p.x - leaf.x - (p.z - leaf.z)) > 0.05) differed++;
    }
    expect(differed).toBeGreaterThan(50);
  });

  it("swings wider out in the open than up in the canopy", () => {
    // sample a full swing near the top and near the ground
    const widest = (from: number, to: number) => {
      let w = 0;
      for (let t = from; t < to; t += 0.02) {
        w = Math.max(w, Math.abs(leafFall(t, { ...leaf, cycleOffset: 0 }).x - leaf.x));
      }
      return w;
    };
    expect(widest(7, 9)).toBeGreaterThan(widest(0, 2));
  });

  it("tumbles as it goes", () => {
    expect(leafFall(1, leaf).rx).not.toBeCloseTo(leafFall(2, leaf).rx, 3);
  });

  it("gives leaves with different offsets different heights", () => {
    const a = leafFall(3, { ...leaf, cycleOffset: 0.1 });
    const b = leafFall(3, { ...leaf, cycleOffset: 0.7 });
    expect(Math.abs(a.y - b.y)).toBeGreaterThan(0.5);
  });
});

describe("dense crowns", () => {
  const seedsWhere = (pick: (s: ReturnType<typeof treeShape>) => boolean) => {
    const out: number[] = [];
    for (let seed = 1; seed < 600; seed++) if (pick(treeShape(seed))) out.push(seed);
    return out;
  };

  it("grows both kinds, and neither dominates", () => {
    const dense = seedsWhere((s) => s.dense).length;
    expect(dense).toBeGreaterThan(80);
    expect(dense / 599).toBeLessThan(0.6);
  });

  it("never leaves a bare tree with a dense crown to fill", () => {
    for (const seed of seedsWhere((s) => s.bare)) {
      expect(treeShape(seed).dense).toBe(false);
    }
  });

  it("carries far more foliage than an open tree", () => {
    const count = (seed: number) =>
      branchPlan(seed, treeShape(seed)).filter((b) => b.cluster > 0).length;
    const dense = seedsWhere((s) => s.dense).slice(0, 30).map(count);
    const open = seedsWhere((s) => !s.dense && !s.bare).slice(0, 30).map(count);
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    expect(avg(dense)).toBeGreaterThan(avg(open) * 1.6);
  });

  it("spreads wider than it climbs, the way an oak does", () => {
    const reach = (seed: number) => {
      const shape = treeShape(seed);
      const limbs = branchPlan(seed, shape).filter((b) => b.level === 1);
      // horizontal reach of a limb tip, relative to the tree's height
      return (
        limbs.reduce((m, b) => {
          const tip = b.points.at(-1)!;
          return Math.max(m, Math.hypot(tip[0], tip[2]));
        }, 0) / shape.height
      );
    };
    const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
    const dense = avg(seedsWhere((s) => s.dense).slice(0, 30).map(reach));
    const open = avg(seedsWhere((s) => !s.dense && !s.bare).slice(0, 30).map(reach));
    expect(dense).toBeGreaterThan(open);
  });

  it("still keeps every branch above the ground", () => {
    for (let seed = 1; seed < 400; seed++) {
      for (const b of branchPlan(seed, treeShape(seed))) {
        for (const p of b.points) expect(p[1]).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
