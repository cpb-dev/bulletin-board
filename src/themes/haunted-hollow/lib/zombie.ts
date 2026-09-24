/**
 * What comes out of the graves in Haunted Hollow.
 *
 * Four different ways an arm can break the soil, and the per-finger
 * curl that goes with each. Pure, so the timing can be checked without
 * a renderer — in particular that every rise starts and ends fully
 * buried, which is what stops an arm being left standing in the
 * graveyard.
 *
 * Moved out of `haunted.ts`: that file is reachable from `Board.tsx`
 * and so from every theme, and none of this belongs there.
 */

/** How deep the arm waits. Below this it is inside the mound. */
export const ARM_BURIED_Y = -0.45;

export const RISE_KINDS = ["burst", "claw", "grab", "tremble"] as const;
export type RiseKind = (typeof RISE_KINDS)[number];

/** How long each rise takes, in seconds. */
export const RISE_SECONDS: Record<RiseKind, number> = {
  burst: 2.6,
  claw: 3.4,
  grab: 2.0,
  tremble: 3.6,
};

/** The highest any of them reaches, for the callers that need a bound. */
export const ARM_MAX_Y = 0.55;

/** One of the four, at random. */
export function pickRise(rand: () => number = Math.random): RiseKind {
  const i = Math.floor(rand() * RISE_KINDS.length);
  return RISE_KINDS[Math.min(RISE_KINDS.length - 1, Math.max(0, i))];
}

export interface ArmPose {
  /** Metres above the soil. Negative is still buried. */
  y: number;
  /** Sway, in radians. */
  lean: number;
  /** Twist about the vertical, in radians. */
  twist: number;
  /** 0..1, how far the fingers are closed. */
  grasp: number;
  /** Sideways haul across the grave, in metres. */
  drag: number;
  /** High-frequency shudder, in radians. */
  shake: number;
}

const BURIED: ArmPose = {
  y: ARM_BURIED_Y,
  lean: 0,
  twist: 0,
  grasp: 0,
  drag: 0,
  shake: 0,
};

/** Smoothstep, used for every ease here so nothing starts with a jerk. */
function ease(t: number): number {
  const c = Math.min(1, Math.max(0, t));
  return c * c * (3 - 2 * c);
}

/**
 * How far through the sink we are, 0 at `from` and reaching a full 1
 * slightly before the end.
 *
 * The margin matters: a curve that only touches 1 exactly at p = 1
 * leaves the arm a few millimetres proud until the last frame, and
 * then pops. Getting it underground early and holding it there is what
 * a viewer reads as "it's gone".
 */
function sunk(p: number, from: number): number {
  return Math.min(1, (p - from) / ((1 - from) * 0.85));
}

/**
 * The arm's pose `p` of the way through a rise of the given kind.
 *
 * Fully buried at both ends, always: an arm that finishes anywhere but
 * underground is one left sticking out of the lawn forever.
 */
export function armPose(kind: RiseKind, p: number): ArmPose {
  if (p <= 0 || p >= 1) return { ...BURIED };

  switch (kind) {
    case "burst": {
      // Punches straight up, gropes about, then sinks reluctantly.
      const UP = 0.22;
      const SINK = 0.72;
      const TOP = 0.4;
      let y: number;
      if (p < UP) {
        y = ARM_BURIED_Y + ease(p / UP) * (TOP - ARM_BURIED_Y);
      } else if (p < SINK) {
        y = TOP + Math.sin((p - UP) * 9) * 0.04;
      } else {
        const e = sunk(p, SINK);
        y = TOP - e * e * (TOP - ARM_BURIED_Y);
      }
      // Faded in and out rather than switched: flipping these off the
      // moment the sink starts snaps the hand upright mid-animation.
      const life =
        ease((p - UP * 0.5) / (UP * 0.8)) * (1 - ease(sunk(p, SINK)));
      return {
        y,
        lean: Math.sin((p - UP) * 4) * 0.25 * life,
        twist: Math.sin((p - UP) * 4) * 0.15 * life,
        grasp: (Math.sin((p - UP) * 11) * 0.5 + 0.5) * 0.9 * life,
        drag: 0,
        shake: 0,
      };
    }

    case "claw": {
      // Doesn't get far up, but hauls itself sideways, raking as it
      // goes, and slides back rather than sinking.
      const UP = 0.3;
      const SINK = 0.76;
      const TOP = 0.26;
      let y: number;
      if (p < UP) {
        y = ARM_BURIED_Y + ease(p / UP) * (TOP - ARM_BURIED_Y);
      } else if (p < SINK) {
        y = TOP - Math.abs(Math.sin((p - UP) * 7)) * 0.05;
      } else {
        const e = ease(sunk(p, SINK));
        y = TOP - 0.05 - e * (TOP - 0.05 - ARM_BURIED_Y);
      }
      const haul = ease((p - UP * 0.5) / 0.6);
      const life = ease((p - UP * 0.4) / (UP * 0.6)) * (1 - ease(sunk(p, SINK)));
      return {
        y,
        lean: -0.4 * haul * life,
        twist: -0.3 * haul * life,
        // rakes: opens and shuts hard as it drags
        grasp: (Math.sin(p * 17) * 0.5 + 0.5) * 0.95 * life,
        drag: -0.22 * haul * life,
        shake: Math.sin(p * 41) * 0.012 * life,
      };
    }

    case "grab": {
      // Shoots up, snatches at nothing, and is yanked straight back
      // down — over before you are sure you saw it.
      const UP = 0.13;
      const SNAP_END = 0.26;
      const YANK = 0.6;
      const TOP = ARM_MAX_Y;
      let y: number;
      if (p < UP) {
        y = ARM_BURIED_Y + ease(p / UP) * (TOP - ARM_BURIED_Y);
      } else if (p < YANK) {
        y = TOP - (p - UP) * 0.06;
      } else {
        // Pulled down faster than it came up — this one is violent on
        // purpose, so its descent is the quickest motion here.
        y = TOP - 0.03 - ease(sunk(p, YANK)) * (TOP - 0.03 - ARM_BURIED_Y);
      }
      const snap = ease((p - UP) / (SNAP_END - UP));
      return {
        y,
        lean: Math.sin(p * 5) * 0.1 * (1 - ease(sunk(p, YANK))),
        twist: 0.5 * ease(p / UP) - 0.25 * snap,
        grasp: snap,
        drag: 0,
        shake: 0,
      };
    }

    case "tremble": {
      // Comes up slowly and badly, shaking, fingers twitching, and
      // gives out halfway.
      const UP = 0.46;
      const SINK = 0.66;
      const TOP = 0.3;
      let y: number;
      if (p < UP) {
        y = ARM_BURIED_Y + ease(p / UP) * (TOP - ARM_BURIED_Y);
      } else if (p < SINK) {
        y = TOP;
      } else {
        y = TOP - ease(sunk(p, SINK)) * (TOP - ARM_BURIED_Y);
      }
      // the shudder fades as it tires, and everything stops once it is
      // under rather than being switched off at the surface
      const life = ease(p / 0.12) * (1 - ease(sunk(p, SINK)));
      const tiring = Math.min(1, Math.max(0, (1 - p) * 1.4));
      return {
        y,
        lean: Math.sin(p * 3.1) * 0.18 * life,
        twist: Math.sin(p * 2.3 + 1) * 0.12 * life,
        grasp: (Math.sin(p * 9) * 0.5 + 0.5) * 0.45 * life,
        drag: Math.sin(p * 2.6) * 0.05 * life,
        shake: Math.sin(p * 63) * 0.055 * life * tiring,
      };
    }
  }
}

/**
 * How far one finger is curled, given the hand's overall `grasp`.
 *
 * Fingers do not move as a unit: the index leads, the little finger
 * lags and never quite closes, and the thumb works across the others.
 * `finger` is 0 (index) to 3 (little), or 4 for the thumb.
 */
export function fingerCurl(grasp: number, finger: number): number {
  const g = Math.min(1, Math.max(0, grasp));
  if (finger === 4) return g * 0.8; // thumb, shorter travel
  const lead = [0, 0.06, 0.12, 0.2][Math.min(3, Math.max(0, finger))];
  const reach = [1, 1.02, 0.96, 0.85][Math.min(3, Math.max(0, finger))];
  // a lagging finger has not started yet while the index is moving
  return Math.min(1, Math.max(0, (g - lead) / (1 - lead))) * reach;
}
