/**
 * What the ghosts behind the windows do.
 *
 * Every ghost used to do exactly one thing: cross its pane left to
 * right at a constant speed, fading in and out. Five windows doing the
 * same trick on a timer stops being a "did you just see that?" and
 * becomes wallpaper, which is the failure this file exists to avoid.
 *
 * The glass they drift behind is `window-pane.ts`.
 *
 * Pure, so the pacing and the poses can be checked without a renderer.
 * The mesh reads a pose and does what it is told.
 */

/**
 * The four things a ghost does.
 *
 *  - `drift`   crosses the pane and is gone. The common one.
 *  - `linger`  crosses half way, stops, turns to look out, moves on.
 *  - `press`   comes to the glass, faces you, holds, and is gone. The
 *              rare one, and the only one that looks back.
 *  - `fade`    starts across and dissolves part way, so a pass does not
 *              always resolve.
 */
export const PASS_KINDS = ["drift", "linger", "press", "fade"] as const;
export type PassKind = (typeof PASS_KINDS)[number];

/** How long each kind takes, in seconds. */
export const PASS_SECONDS: Record<PassKind, number> = {
  drift: 2.8,
  linger: 5.4,
  press: 4.6,
  fade: 2.2,
};

/**
 * Odds of each kind. `press` is deliberately rare: a face at the
 * window is frightening roughly once, and then only if you had given
 * up expecting it.
 */
const WEIGHTS: Record<PassKind, number> = {
  drift: 0.5,
  linger: 0.24,
  press: 0.08,
  fade: 0.18,
};

/** Gap between a window's ghost sightings, in seconds. */
export const GHOST_GAP_MIN = 7;
export const GHOST_GAP_MAX = 17;

/**
 * When this window should next be haunted. Deliberately a wide random
 * gap, for the same reason the passes vary.
 */
export function nextGhostTime(now: number, rand: () => number = Math.random) {
  return now + GHOST_GAP_MIN + rand() * (GHOST_GAP_MAX - GHOST_GAP_MIN);
}

/** Which pass happens next. */
export function pickPass(rand: () => number = Math.random): PassKind {
  let r = rand() * Object.values(WEIGHTS).reduce((a, b) => a + b, 0);
  for (const kind of PASS_KINDS) {
    r -= WEIGHTS[kind];
    if (r <= 0) return kind;
  }
  return "drift";
}

export interface GhostPose {
  /**
   * Across the pane, as a fraction of the room the figure actually
   * has: -1 is hard against one edge of the glass, +1 the other.
   *
   * Expressed this way because how far a ghost may travel depends on
   * how wide the ghost is, which this file has no business knowing —
   * and getting it wrong sends a figure out over the clapboard, which
   * there is no cheap way to clip.
   */
  x: number;
  /** Up and down, in pane heights. */
  y: number;
  /** Towards the glass, in pane widths. 0 is its resting depth. */
  z: number;
  /** Which way it is facing: 0 square to the glass, +/- turned away. */
  turn: number;
  /** How solid it is, 0 to 1. */
  opacity: number;
  /** Size, as a multiple of its natural height. */
  scale: number;
  /**
   * How much of the lamplight it is standing in front of, 0 to 1. The
   * window dims by this, so a ghost passing is something you catch in
   * the light changing as much as in the figure itself.
   */
  shadow: number;
}

/** Smooth 0..1 ramp — no easing library for one curve. */
function smooth(t: number): number {
  const c = Math.max(0, Math.min(1, t));
  return c * c * (3 - 2 * c);
}

/** Fades up and back down, so a ghost never pops in or out. */
function bell(p: number, power = 1.5): number {
  return Math.sin(Math.max(0, Math.min(1, p)) * Math.PI) ** power;
}

/**
 * A ghost's pose `p` of the way through its pass.
 *
 * Returns null outside the pass so the caller can skip the mesh
 * entirely — with five windows running their own schedules, most of
 * them are doing nothing most of the time.
 */
export function ghostPose(kind: PassKind, p: number): GhostPose | null {
  if (!(p >= 0) || p > 1) return null;

  if (kind === "drift") {
    return {
      x: -1 + p * 2,
      y: Math.sin(p * Math.PI * 3) * 0.05,
      z: 0,
      // turned slightly the way it is walking, as anything crossing is
      turn: 0.32,
      opacity: bell(p),
      scale: 1,
      shadow: bell(p, 1) * 0.55,
    };
  }

  if (kind === "fade") {
    // sets off across the pane and simply dissolves
    return {
      x: -1 + p * 1.25,
      y: Math.sin(p * Math.PI * 2) * 0.04,
      z: 0,
      turn: 0.32,
      // up quickly, then away to nothing rather than back out the side
      opacity: smooth(p * 4) * (1 - smooth((p - 0.35) / 0.65)),
      scale: 1,
      shadow: smooth(p * 4) * (1 - smooth((p - 0.35) / 0.65)) * 0.5,
    };
  }

  if (kind === "linger") {
    // in for a third, held still for a third, out for a third
    const IN = 0.34;
    const OUT = 0.66;
    let x: number;
    let turn: number;
    if (p < IN) {
      x = -1 + smooth(p / IN);
      turn = 0.32;
    } else if (p < OUT) {
      const h = (p - IN) / (OUT - IN);
      x = 0;
      // stops, and slowly comes round to look out through the glass
      turn = 0.32 * (1 - bell(h, 1));
    } else {
      x = smooth((p - OUT) / (1 - OUT));
      turn = 0.32;
    }
    return {
      x,
      y: Math.sin(p * Math.PI * 2) * 0.03,
      z: 0,
      turn,
      opacity: bell(p, 1.1),
      scale: 1,
      shadow: bell(p, 0.8) * 0.6,
    };
  }

  // press: up to the glass, facing out, held, then gone between frames
  const UP = 0.3;
  const GONE = 0.86;
  if (p < UP) {
    const t = smooth(p / UP);
    return {
      x: -0.55 + t * 0.55,
      y: 0,
      z: t * 0.42,
      turn: 0.38 * (1 - t),
      opacity: t * 0.9,
      scale: 1 + t * 0.22,
      shadow: t * 0.75,
    };
  }
  if (p < GONE) {
    // held against the glass. It does not drift, it does not bob.
    const h = (p - UP) / (GONE - UP);
    return {
      x: 0,
      y: 0,
      z: 0.42 + Math.sin(h * Math.PI) * 0.03,
      turn: 0,
      opacity: 0.94,
      scale: 1.22,
      shadow: 0.82,
    };
  }
  // Gone. Not faded — a blink of nothing, which is worse.
  return null;
}
