/**
 * Shape and motion for the Haunted Hollow's autumn trees.
 *
 * A tree here is a skeleton — a trunk and a set of tapering limbs with
 * leaf clusters hung on their tips — plus the drift of the leaves
 * coming off it. All of that is decided here, from a seed, so two
 * trees standing next to each other are demonstrably different and a
 * given tree is identical on every render.
 *
 * Pure so the structure and the falling can be tested without a
 * renderer; the meshes in `props/AutumnTree.tsx` just read from this.
 * Same split as `crab.ts` and `haunted.ts`.
 */

/** Local PRNG — keeps this file free of component imports. */
function mulberry(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type Point3 = [number, number, number];

export interface TreeShape {
  /** Trunk height in metres, before the caller's scale. */
  height: number;
  /** Radius at the foot of the trunk. */
  trunkRadius: number;
  /** How far off vertical the trunk leans, as a fraction of its height. */
  lean: number;
  /** Which way it leans, in radians. */
  leanDir: number;
  /** Main limbs off the trunk. */
  limbs: number;
  /** Twigs off each limb. */
  twigs: number;
  /**
   * A broad, dense crown — an oak — rather than an open, airy one.
   * More limbs, many more twigs, and they reach out rather than up.
   */
  dense: boolean;
  /** 0..1 — how much foliage the clusters carry. */
  fullness: number;
  /** A tree that has already dropped its leaves. Bare branches, no clusters. */
  bare: boolean;
  /** 0..1 — biases the palette from gold towards deep red. */
  warmth: number;
}

/**
 * One tree's proportions, from a seed.
 *
 * The ranges are wide on purpose. Seven trees built from one narrow
 * range read as seven copies at different scales; the point of this is
 * that they don't.
 */
export function treeShape(seed: number): TreeShape {
  const rand = mulberry(seed * 2654435761);
  const bare = rand() < 0.18;
  const dense = !bare && rand() < 0.45;
  return {
    // A dense crown sits on a stouter, shorter trunk — an oak is wide
    // before it is tall.
    height: dense ? 2.6 + rand() * 1.2 : 2.9 + rand() * 1.8,
    trunkRadius: (dense ? 0.25 : 0.19) + rand() * 0.13,
    lean: (rand() - 0.5) * 0.17,
    leanDir: rand() * Math.PI * 2,
    limbs: dense ? 5 + Math.floor(rand() * 3) : 3 + Math.floor(rand() * 3),
    twigs: dense ? 5 + Math.floor(rand() * 3) : 3 + Math.floor(rand() * 2),
    dense,
    fullness: bare ? 0 : 0.55 + rand() * 0.45,
    bare,
    warmth: rand(),
  };
}

/** A point on the trunk's centre line, `u` of the way up (0..1). */
export function trunkPointAt(shape: TreeShape, u: number): Point3 {
  // The lean builds with height and carries a slight S, so the trunk
  // curves rather than tipping over as a straight pole.
  const bend = shape.lean * (u * u * 0.85 + Math.sin(u * Math.PI) * 0.22);
  const off = bend * shape.height;
  return [
    Math.cos(shape.leanDir) * off,
    shape.height * u,
    Math.sin(shape.leanDir) * off,
  ];
}

export interface Limb {
  /** Centre line, base first. At least two points. */
  points: Point3[];
  /** Radius at the base and at the tip. */
  r0: number;
  r1: number;
  /** 0 trunk, 1 limb, 2 twig. */
  level: number;
  /** Radius of the leaf cluster on the tip. 0 for none. */
  cluster: number;
  /** 0..1 into the autumn palette, for that cluster. */
  hue: number;
}

/**
 * The whole skeleton, trunk first.
 *
 * Limbs leave the trunk between 42% and 92% of its height, fanned
 * around it by an irrational fraction of a turn so they never line up
 * into a whorl, and each droops as it reaches out. Twigs come off the
 * outer half of each limb and carry most of the foliage, which is what
 * puts the canopy at the ends of the branches instead of in a ball
 * around the top of the trunk.
 */
export function branchPlan(seed: number, shape: TreeShape): Limb[] {
  const rand = mulberry(seed * 40503 + 17);
  const out: Limb[] = [];

  const trunk: Point3[] = [0, 0.3, 0.6, 0.85, 1].map((u) =>
    trunkPointAt(shape, u)
  );
  out.push({
    points: trunk,
    r0: shape.trunkRadius,
    r1: shape.trunkRadius * 0.34,
    level: 0,
    cluster: 0,
    hue: 0,
  });

  // 0.618 of a turn between limbs: never repeats, never stacks.
  const GOLDEN = Math.PI * 2 * 0.61803;

  for (let i = 0; i < shape.limbs; i++) {
    const u = 0.42 + (i / Math.max(1, shape.limbs - 1)) * 0.48 + (rand() - 0.5) * 0.06;
    const base = trunkPointAt(shape, Math.min(0.95, u));
    const az = i * GOLDEN + rand() * 0.5;
    const len =
      shape.height *
      ((shape.dense ? 0.58 : 0.46) - u * 0.17) *
      (0.8 + rand() * 0.5);
    // Higher limbs climb more steeply; lower ones reach out and sag. A
    // dense crown climbs less and spreads more, which is what makes it
    // read as a broad dome rather than a fan.
    const rise = (shape.dense ? 0.2 : 0.3) + u * (shape.dense ? 0.52 : 0.75);
    const dx = Math.cos(az);
    const dz = Math.sin(az);

    const mid: Point3 = [
      base[0] + dx * len * 0.55,
      base[1] + rise * len * 0.62,
      base[2] + dz * len * 0.55,
    ];
    const tip: Point3 = [
      base[0] + dx * len,
      // the droop: the outer half gives back some of the climb
      base[1] + rise * len * 0.92 - len * 0.16,
      base[2] + dz * len,
    ];

    const r0 = shape.trunkRadius * (0.62 - u * 0.3);
    const limb: Limb = {
      points: [base, mid, tip],
      r0,
      r1: r0 * 0.38,
      level: 1,
      // Sized off the tree, not off the branch: a cluster scaled to a
      // limb's length grows with the limb and swallows the whole tree.
      cluster: shape.bare
        ? 0
        : shape.height * (0.048 + shape.fullness * 0.024),
      hue: rand(),
    };
    out.push(limb);

    for (let j = 0; j < shape.twigs; j++) {
      // Spread along the outer two-thirds of the limb rather than
      // bunched at the end — twigs all leaving from one point put the
      // foliage in tight bouquets with bare gaps between them.
      const s = 0.32 + (j / shape.twigs) * 0.62 + rand() * 0.07;
      const from =
        s < 0.5
          ? lerp3(base, mid, s * 2)
          : lerp3(mid, tip, Math.min(1, (s - 0.5) * 2));
      const taz = az + (rand() - 0.5) * 2.4;
      const tlen = len * (0.3 + rand() * 0.42);
      const twigTip: Point3 = [
        from[0] + Math.cos(taz) * tlen,
        from[1] + tlen * (0.42 + rand() * 0.5) - tlen * 0.1,
        from[2] + Math.sin(taz) * tlen,
      ];
      out.push({
        points: [from, midPoint(from, twigTip, rand), twigTip],
        r0: r0 * 0.42,
        r1: r0 * 0.16,
        level: 2,
        cluster: shape.bare
          ? 0
          : shape.height *
            (shape.dense ? 0.07 : 0.058) *
            (1 + shape.fullness * 0.5),
        hue: rand(),
      });
    }
  }

  return out;
}

function lerp3(a: Point3, b: Point3, t: number): Point3 {
  return [
    a[0] + (b[0] - a[0]) * t,
    a[1] + (b[1] - a[1]) * t,
    a[2] + (b[2] - a[2]) * t,
  ];
}

/** Halfway along, nudged off the straight line so twigs aren't sticks. */
function midPoint(a: Point3, b: Point3, rand: () => number): Point3 {
  const m = lerp3(a, b, 0.5);
  const d = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  return [
    m[0] + (rand() - 0.5) * d * 0.22,
    m[1] + (rand() - 0.5) * d * 0.16,
    m[2] + (rand() - 0.5) * d * 0.22,
  ];
}

/* ------------------------------------------------------------------ */
/*  Falling leaves                                                     */
/* ------------------------------------------------------------------ */

export interface FallingLeaf {
  /** Where it comes off the canopy. */
  x: number;
  z: number;
  /** Height it starts from. */
  top: number;
  /** Seconds for one fall, top to ground. */
  fallSeconds: number;
  /** 0..1 — where in its fall it starts, so they don't drop in step. */
  cycleOffset: number;
  /** Speed and width of the swing. */
  sway: number;
  drift: number;
  swayPhase: number;
  /** Tumble about its own axes. */
  spin: number;
  flutter: number;
}

export interface LeafPose {
  x: number;
  y: number;
  z: number;
  rx: number;
  ry: number;
  rz: number;
}

/**
 * Where a leaf is at time `t`.
 *
 * A leaf doesn't drop, it swings: the horizontal motion is a pendulum
 * on two axes at unrelated rates, so the path is a wander rather than a
 * spiral. Height falls linearly and wraps, which keeps it on the tree's
 * side of the scene forever without ever going underground.
 */
export function leafFall(t: number, leaf: FallingLeaf): LeafPose {
  const cycles = t / leaf.fallSeconds + leaf.cycleOffset;
  const p = cycles - Math.floor(cycles); // 0 at the branch, 1 at the ground
  const age = t + leaf.swayPhase;

  // The swing widens as it falls — a leaf still in the canopy has less
  // room to move than one out in the open.
  const width = leaf.drift * (0.35 + p * 0.65);
  const swing = Math.sin(age * leaf.sway) * width;
  const cross = Math.cos(age * leaf.sway * 0.62) * width * 0.55;

  return {
    x: leaf.x + swing,
    y: leaf.top * (1 - p),
    z: leaf.z + cross,
    rx: age * leaf.spin,
    ry: Math.sin(age * leaf.flutter) * 1.3,
    rz: Math.sin(age * leaf.sway) * 0.7,
  };
}
