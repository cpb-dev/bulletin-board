/**
 * Where the cobwebs sit on the board, and what each one looks like.
 *
 * The board used to get four identical webs, one per corner, each a
 * quarter-disc 0.8 units across sprawling well past the frame onto the
 * cork. Four of anything in four corners reads as wallpaper. Real webs
 * gather wherever nothing disturbs them — the corners first, but also
 * anywhere along a top rail or a side stile — and no two are the same
 * size, density or state of repair.
 *
 * So this file decides two things, both pure and both testable without
 * a renderer:
 *
 *  - `webLayout` — where the webs go and how big each is, stratified
 *    along the edges so they spread instead of clumping.
 *  - `webPattern` — the threads of one web: spoke angles, ring radii
 *    and which arcs have torn away.
 *
 * The prop turns a pattern into a canvas texture and a layout into
 * planes. Nothing here knows about three.js.
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

/**
 * A web anchored into a corner spans a quarter turn; one slung along a
 * straight edge spans a half turn and hangs off the rail.
 */
export type WebKind = "corner" | "edge";

/** How many textures of each kind the prop draws and shares out. */
export const WEB_VARIANTS = 3;

/** Plane size for a corner web, in board units. */
const CORNER_MIN = 0.4;
const CORNER_MAX = 0.58;
/** How far an edge web hangs off its rail. It spans three times that along it. */
const EDGE_MIN = 0.13;
const EDGE_MAX = 0.34;

/**
 * The fan an edge web opens through, in radians.
 *
 * Narrower than the half turn you would expect, because its hub sits
 * back behind the rail rather than on it: the threads enter across the
 * rail at several points and spread, the way a web slung under a
 * window ledge does. A half turn from a single point on the rail is a
 * scallop shell, which is exactly what the first attempt looked like.
 */
export const EDGE_SWEEP = 2.05;

/** How many webs hang along each straight edge. */
const EDGE_WEBS = { top: 3, left: 2, right: 2 } as const;

export interface WebPlacement {
  kind: WebKind;
  /** Centre of the plane, relative to the board centre. */
  x: number;
  y: number;
  /** Rotation about Z, radians. */
  rot: number;
  /** Edge length of the square plane. */
  size: number;
  /** Which shared texture of that kind to use. */
  variant: number;
  /** Mirrored across its own axis, doubling the variety for free. */
  flip: boolean;
  /** Dusty old webs are not all equally bright. */
  opacity: number;
}

export interface Frame {
  /**
   * Half-extents of the line the webs anchor to.
   *
   * The caller passes the middle of the frame band rather than its
   * outer edge: a web anchored right on the outer edge and tilted a
   * couple of degrees hangs a thread out over the wall behind, which
   * is very obvious and impossible to unsee.
   */
  halfW: number;
  halfH: number;
}

/**
 * Every web on the board.
 *
 * Corners first — a web anchored at each outer corner of the frame,
 * fanning inward — then webs strung along the top rail and the two
 * stiles. The edge webs are stratified: each gets its own slice of the
 * rail and jitters within it, so they scatter without ever bunching up
 * or leaving half the rail bare, which is what a plain random position
 * does about a third of the time.
 *
 * The bottom rail is deliberately left clear. It is the edge a person
 * leans on, and it is the one a web never survives.
 */
export function webLayout(seed: number, frame: Frame): WebPlacement[] {
  const rand = mulberry(seed * 2654435761 + 101);
  const out: WebPlacement[] = [];

  const corner = () => CORNER_MIN + rand() * (CORNER_MAX - CORNER_MIN);
  const cornerSizes = [corner(), corner(), corner(), corner()];

  /*
   * The texture's anchor is the plane's top-left corner, so a plane
   * placed half its size in from the top-left of the frame lands the
   * anchor exactly on that corner. Rotating swings the anchor round to
   * the other three:
   *   0 → top-left     -PI/2 → top-right
   *   PI → bottom-right  PI/2 → bottom-left
   */
  const corners: { sx: number; sy: number; rot: number }[] = [
    { sx: -1, sy: 1, rot: 0 },
    { sx: 1, sy: 1, rot: -Math.PI / 2 },
    { sx: 1, sy: -1, rot: Math.PI },
    { sx: -1, sy: -1, rot: Math.PI / 2 },
  ];

  corners.forEach((c, i) => {
    const size = cornerSizes[i];
    const inset = size * 0.5;
    out.push({
      kind: "corner",
      x: c.sx * (frame.halfW - inset),
      y: c.sy * (frame.halfH - inset),
      rot: c.rot + (rand() - 0.5) * 0.14,
      size,
      variant: Math.floor(rand() * WEB_VARIANTS),
      flip: rand() < 0.5,
      opacity: 0.5 + rand() * 0.28,
    });
  });

  /*
   * An edge web's texture is anchored along the top of its canvas and
   * fans downward, so the plane sits half its size in from the rail
   * and the rotation aims the fan at the board.
   */
  const rails = [
    {
      count: EDGE_WEBS.top,
      rot: 0,
      span: frame.halfW,
      clear: Math.max(cornerSizes[0], cornerSizes[1]),
      at: (t: number, inset: number): [number, number] => [
        t,
        frame.halfH - inset,
      ],
    },
    {
      count: EDGE_WEBS.left,
      rot: Math.PI / 2,
      span: frame.halfH,
      clear: Math.max(cornerSizes[0], cornerSizes[3]),
      at: (t: number, inset: number): [number, number] => [
        -frame.halfW + inset,
        t,
      ],
    },
    {
      count: EDGE_WEBS.right,
      rot: -Math.PI / 2,
      span: frame.halfH,
      clear: Math.max(cornerSizes[1], cornerSizes[2]),
      at: (t: number, inset: number): [number, number] => [
        frame.halfW - inset,
        t,
      ],
    },
  ];

  for (const rail of rails) {
    // stay clear of whichever corner web is the larger of the two
    const usable = rail.span - rail.clear;
    for (let i = 0; i < rail.count; i++) {
      // biased small, so a rail gets a few wisps and the occasional
      // proper one rather than a row of matching webs
      const size =
        EDGE_MIN + Math.pow(rand(), 1.7) * (EDGE_MAX - EDGE_MIN);
      const inset = size * 0.5;
      // own slot, jittered across most of it
      const slot = (i + 0.08 + rand() * 0.84) / rail.count;
      const along = -usable + slot * usable * 2;
      const [x, y] = rail.at(along, inset);
      out.push({
        kind: "edge",
        x,
        y,
        rot: rail.rot + (rand() - 0.5) * 0.18,
        size,
        variant: Math.floor(rand() * WEB_VARIANTS),
        flip: rand() < 0.5,
        opacity: 0.42 + rand() * 0.26,
      });
    }
  }

  return out;
}

export interface WebPattern {
  /** Spoke angles in radians, ascending, across the web's sweep. */
  spokes: number[];
  /** Ring radii as a fraction of the web's reach, ascending. */
  rings: number[];
  /** How far each ring's threads sag back towards the hub. */
  sag: number[];
  /**
   * Per-ring, per-spoke radius multipliers around 1.
   *
   * Without these every ring is a true arc and the whole thing reads
   * as a scallop shell — the single change that did most to make these
   * look spun rather than drawn.
   */
  wobble: number[][];
  /**
   * Torn arcs, as `[ring, gap]` pairs: ring `r` has no thread between
   * spokes `gap` and `gap + 1`. An old web is always part ruined, and
   * that is most of what stops it reading as a doily.
   */
  tears: [number, number][];
  /** A loose thread trailing off the web, at this angle and length. */
  trail: { angle: number; length: number } | null;
}

/**
 * The threads of one web.
 *
 * Spokes are placed by walking the sweep in uneven steps rather than
 * dividing it evenly — a web spun by an animal that keeps losing its
 * place, not by a compass.
 */
export function webPattern(seed: number, kind: WebKind): WebPattern {
  const rand = mulberry(seed * 374761393 + 2);
  const sweep = kind === "corner" ? Math.PI / 2 : EDGE_SWEEP;
  const count =
    kind === "corner" ? 7 + Math.floor(rand() * 3) : 9 + Math.floor(rand() * 4);

  // uneven steps, then normalised back onto the sweep so the first and
  // last spokes still land exactly on the anchor's two edges
  const steps: number[] = [];
  for (let i = 0; i < count - 1; i++) steps.push(0.6 + rand() * 0.8);
  const total = steps.reduce((a, b) => a + b, 0);
  const spokes = [0];
  let acc = 0;
  for (const s of steps) {
    acc += s;
    spokes.push((acc / total) * sweep);
  }

  const ringCount = 5 + Math.floor(rand() * 4);
  const rings: number[] = [];
  for (let i = 0; i < ringCount; i++) {
    // rings crowd towards the hub, as they do on a real web
    const t = (i + 1) / ringCount;
    rings.push(Math.min(1, t * t * 0.55 + t * 0.45 + (rand() - 0.5) * 0.04));
  }
  rings.sort((a, b) => a - b);

  const sag: number[] = [];
  const wobble: number[][] = [];
  for (const r of rings) {
    sag.push(0.1 + rand() * 0.12);
    // the outer rings wander most — they are the loosest and the oldest
    const spread = 0.05 + r * 0.14;
    wobble.push(spokes.map(() => 1 + (rand() - 0.5) * 2 * spread));
  }

  const tears: [number, number][] = [];
  const tearCount = 1 + Math.floor(rand() * 3);
  for (let i = 0; i < tearCount; i++) {
    // never tear the innermost ring — that is what holds it to the frame
    const ring = 1 + Math.floor(rand() * (ringCount - 1));
    const gap = Math.floor(rand() * (spokes.length - 1));
    if (!tears.some((t) => t[0] === ring && t[1] === gap)) tears.push([ring, gap]);
  }

  const trail =
    rand() < 0.6
      ? { angle: rand() * sweep, length: 1.05 + rand() * 0.35 }
      : null;

  return { spokes, rings, sag, wobble, tears, trail };
}
