/**
 * The trees of Stars Hollow, from a seed.
 *
 * Three kinds, because the square has three: big round maples turning
 * on the green, small lollipop trees planted along the pavement, and
 * the tall pale sycamores that are already nearly bare by October.
 *
 * A tree here is a trunk, some limbs off the top of it, and a crown of
 * foliage blobs hung over the limbs. All of it is decided here, so a
 * tree is identical on every render and two neighbours demonstrably
 * aren't. The mesh in `props/FallTree.tsx` just reads from this.
 */

export type Point3 = [number, number, number];

export type TreeSpecies = "maple" | "street" | "sycamore";

export interface Limb {
  /** Base to tip. The base sits on the trunk. */
  points: Point3[];
  /** Radius at the base, tapering to a third of it at the tip. */
  radius: number;
}

export interface Blob {
  at: Point3;
  /** Radius, metres. */
  r: number;
  /** 0..1 — picks a colour: 0 the greenest gold, 1 the deepest red. */
  tone: number;
}

export interface TreePlan {
  species: TreeSpecies;
  trunk: Point3[];
  trunkRadius: number;
  limbs: Limb[];
  blobs: Blob[];
  /** Height of the top of the crown. */
  height: number;
}

/** Local PRNG — keeps this file free of component imports. */
export function rng(seed: number): () => number {
  let a = (seed * 2654435761) >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface SpeciesSpec {
  /** Where the trunk forks into limbs. */
  fork: [number, number];
  trunkRadius: [number, number];
  /** Crown centre above the fork, and its radii. */
  crownLift: [number, number];
  crownRx: [number, number];
  crownRy: [number, number];
  limbs: [number, number];
  blobs: [number, number];
  blobR: [number, number];
  /** How upright the limbs are, 0 flat to 1 vertical. */
  reach: number;
  /** Shifts tone: a sycamore is gold-brown, a maple anything up to red. */
  toneBias: [number, number];
}

const SPECIES: Record<TreeSpecies, SpeciesSpec> = {
  maple: {
    fork: [1.9, 2.5],
    trunkRadius: [0.2, 0.27],
    crownLift: [1.5, 1.9],
    crownRx: [2.0, 2.6],
    crownRy: [1.6, 2.0],
    limbs: [4, 6],
    blobs: [40, 52],
    blobR: [0.5, 0.78],
    reach: 0.55,
    toneBias: [0.1, 0.9],
  },
  street: {
    fork: [1.5, 1.8],
    trunkRadius: [0.08, 0.1],
    crownLift: [0.75, 0.9],
    crownRx: [0.85, 1.05],
    crownRy: [0.9, 1.1],
    limbs: [3, 4],
    blobs: [16, 20],
    blobR: [0.3, 0.44],
    reach: 0.7,
    toneBias: [0.35, 0.85],
  },
  sycamore: {
    fork: [3.6, 4.4],
    trunkRadius: [0.28, 0.34],
    crownLift: [2.2, 2.8],
    crownRx: [2.6, 3.2],
    crownRy: [2.4, 2.9],
    limbs: [6, 8],
    blobs: [14, 18],
    blobR: [0.35, 0.6],
    reach: 0.72,
    toneBias: [0.1, 0.4],
  },
};

const lerp = (r: () => number, [a, b]: [number, number]) => a + r() * (b - a);

/** One tree's whole structure. Same species and seed, same tree. */
export function planTree(species: TreeSpecies, seed: number): TreePlan {
  const spec = SPECIES[species];
  const rand = rng(seed + (species === "maple" ? 0 : species === "street" ? 7919 : 15887));

  const fork = lerp(rand, spec.fork);
  const trunkRadius = lerp(rand, spec.trunkRadius);
  const leanDir = rand() * Math.PI * 2;
  const lean = (rand() - 0.5) * 0.18 * fork;
  const lx = Math.cos(leanDir) * lean;
  const lz = Math.sin(leanDir) * lean;

  // A trunk is never straight: a kink a third of the way up and a
  // correction above it.
  const trunk: Point3[] = [
    [0, 0, 0],
    [lx * 0.2 + (rand() - 0.5) * 0.08, fork * 0.35, lz * 0.2 + (rand() - 0.5) * 0.08],
    [lx * 0.6, fork * 0.7, lz * 0.6],
    [lx, fork, lz],
  ];
  const top = trunk[3];

  const crownY = fork + lerp(rand, spec.crownLift);
  const rx = lerp(rand, spec.crownRx);
  const ry = lerp(rand, spec.crownRy);
  const cx = lx * 1.3;
  const cz = lz * 1.3;

  const limbCount = Math.round(lerp(rand, spec.limbs));
  const limbs: Limb[] = [];
  const turn = rand() * Math.PI * 2;
  for (let i = 0; i < limbCount; i++) {
    const a = turn + (i / limbCount) * Math.PI * 2 + (rand() - 0.5) * 0.6;
    const out = rx * (0.55 + rand() * 0.3);
    const up = (crownY - fork) * (spec.reach + rand() * 0.35) + ry * 0.25;
    const tip: Point3 = [cx + Math.cos(a) * out, fork + up, cz + Math.sin(a) * out];
    const mid: Point3 = [
      top[0] + (tip[0] - top[0]) * 0.45,
      top[1] + (tip[1] - top[1]) * 0.62,
      top[2] + (tip[2] - top[2]) * 0.45,
    ];
    limbs.push({
      points: [[top[0], top[1] - 0.15, top[2]], mid, tip],
      radius: trunkRadius * (0.5 + rand() * 0.15),
    });
  }

  const warm = lerp(rand, spec.toneBias);
  const count = Math.round(lerp(rand, spec.blobs));
  const blobs: Blob[] = [];
  if (species === "sycamore") {
    // What's left of a sycamore's leaves hangs in thin clumps off the
    // limb tips, not in a crown.
    for (let i = 0; i < count; i++) {
      const limb = limbs[i % limbs.length];
      const tip = limb.points[2];
      blobs.push({
        at: [
          tip[0] + (rand() - 0.5) * 0.9,
          tip[1] + (rand() - 0.3) * 0.6,
          tip[2] + (rand() - 0.5) * 0.9,
        ],
        r: lerp(rand, spec.blobR),
        tone: clamp01(warm + (rand() - 0.5) * 0.3),
      });
    }
  } else {
    // A core mass fills the middle, so no sky shows through the heart
    // of the crown between the lumps.
    blobs.push({
      at: [cx, crownY - ry * 0.05, cz],
      r: Math.min(rx, ry) * 0.72,
      tone: clamp01(warm),
    });
    for (let i = 1; i < count; i++) {
      // Weighted to the shell, so the crown reads as a round mass
      // with lumps rather than a heap of balls.
      const u = rand() * 2 - 1;
      const phi = rand() * Math.PI * 2;
      const s = Math.sqrt(1 - u * u);
      const d = 0.55 + Math.pow(rand(), 0.5) * 0.4;
      const y = u * ry * d;
      blobs.push({
        at: [cx + s * Math.cos(phi) * rx * d, crownY + y, cz + s * Math.sin(phi) * rx * d],
        r: lerp(rand, spec.blobR) * (1 - Math.max(0, u) * 0.25),
        // Trees turn from the top and the outside first.
        tone: clamp01(warm + u * 0.18 + (rand() - 0.5) * 0.35),
      });
    }
  }

  const height = Math.max(
    ...blobs.map((b) => b.at[1] + b.r),
    ...limbs.map((l) => l.points[2][1])
  );
  return { species, trunk, trunkRadius, limbs, blobs, height };
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v));
}
