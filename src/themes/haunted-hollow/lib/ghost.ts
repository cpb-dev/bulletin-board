/**
 * What the ghosts behind the windows are, and what they do.
 *
 * The first pass at this made one kind of ghost — a pale shrouded
 * figure — and had it cross the pane. Pale reads as a bedsheet at a
 * school disco. What is actually frightening at a window is a shape
 * you can only half resolve, and the moment it touches the glass: a
 * gaunt face half behind a curtain, a silhouette with both palms flat
 * against the pane, a handprint dragged down through the condensation
 * and still there after whatever made it has gone.
 *
 * So a sighting is two choices — a *form* (what it looks like) and a
 * *pass* (what it does) — and each window draws from its own small
 * cast, so the five of them never feel like one ghost on a loop.
 *
 * Pure, so the pacing and the poses can be checked without a renderer.
 * The glass they press against is `window-pane.ts`.
 */

import { GHOST_Z } from "./window-pane";

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
 * What is at the window.
 *
 * Three of them stand near the glass, where you can see what they
 * are, and two stand back in the room, where you cannot:
 *
 *  - `shade`    a tall dark silhouette with no face at all. The only
 *               thing you can tell about it is its shape.
 *  - `gaunt`    a drawn, hollow-eyed face over a body lost in the dark.
 *  - `small`    the same, child-sized and low in the pane, which is
 *               worse for reasons nobody can ever quite name.
 *  - `looming`  set well back and far too tall for the room it is in.
 *  - `staring`  back there too, big, with a face you can only half
 *               make out through the grime.
 */
export const FORMS = ["shade", "gaunt", "small", "looming", "staring"] as const;
export type GhostForm = (typeof FORMS)[number];

/** The widest the shroud gets, as a fraction of its height. */
export const SHROUD_HALF = 0.3;

/**
 * How much the figure is flattened front to back.
 *
 * A reveal is only as deep as the wall. A solid of revolution as wide
 * as this one is deep enough to push its chest through the glazing
 * bars and stand in front of them, and the bigger the forms got the
 * worse that became — so it is squashed on the axis it is never seen
 * along. Turning it still narrows the silhouette, which was the whole
 * reason for modelling one rather than drawing it.
 */
export const GHOST_SQUASH = 0.28;

/** How far towards the glass a ghost may come, in world units. */
export const GHOST_APPROACH = 0.025;

/** The largest a pose ever scales a figure. */
export const MAX_POSE_SCALE = 1.1;

/**
 * How far into the reveal a form's widest part ever comes, measured
 * from the back of it, at the most forward pose that form can strike.
 *
 * Pinned by a test against the sash, because every time these figures
 * have grown, the clearance between them and the glazing bars is the
 * thing that has quietly broken — and a ghost in front of the bars
 * reads as a ghost standing in the street. No still frame shows it
 * unless the pose you happened to render was the forward one.
 */
export function figureFront(form: GhostForm, height: number): number {
  const b = FORM_BUILD[form];
  // only the ones that can reach the glass ever approach it or swell
  const near = canTouchGlass(form);
  const origin = GHOST_Z - b.depth * height * 0.1;
  const scale = near ? MAX_POSE_SCALE : 1;
  return (
    origin +
    (near ? GHOST_APPROACH : 0) +
    SHROUD_HALF * height * b.size * scale * GHOST_SQUASH
  );
}

export interface FormBuild {
  /** Height, as a multiple of the window's natural figure height. */
  size: number;
  /** How far down the pane it stands, in pane heights. Negative lifts. */
  drop: number;
  /** Whether it has a face at all. */
  face: boolean;
  /**
   * How far back in the room it is, 0 at the glass and 1 deep in it.
   *
   * This is the whole trick behind the big ones. A figure genuinely
   * further away would be *smaller*, so the only way something reads
   * as both large and set back is to make it large and then hand the
   * eye every other depth cue there is: hazed towards the colour of
   * the room rather than silhouetted black, higher up the pane, barely
   * moving across it, and blocking much less of the lamp. Which, once
   * you have it, says the thing at the back of that room is not the
   * size of a person.
   */
  depth: number;
}

/*
 * The ones near the glass are big enough that the pane crops them.
 *
 * That is the point of them. Somebody standing right at a window
 * fills it — you get head and shoulders and the rest runs off below
 * the sill. Sized to fit inside the opening instead, with daylight
 * all round, they read as dolls on a shelf rather than as a person
 * who has come to look at you.
 *
 * They are free to be this big because the wall's own reveal clips
 * them: the glass sits 0.17 behind the facade, so a figure that
 * wanders past the edge of the opening goes behind the wall rather
 * than out over the clapboard.
 */
export const FORM_BUILD: Record<GhostForm, FormBuild> = {
  // a tall dark shape and nothing else you can tell about it
  shade: { size: 1.8, drop: 0, face: false, depth: 0 },
  // the same body, with a face the lamp just reaches
  gaunt: { size: 1.72, drop: 0, face: true, depth: 0 },
  // child-sized, so its head barely clears the middle of the pane
  small: { size: 1.15, drop: 0.16, face: true, depth: 0 },
  // head near the top of the pane, from the back of the room
  looming: { size: 2.15, drop: 0.06, face: false, depth: 0.85 },
  staring: { size: 1.95, drop: 0.02, face: true, depth: 0.68 },
};

/** Anything past this is too far back to reach the glass. */
const REACHES_GLASS = 0.35;

/** Whether this form is close enough to touch the window. */
export function canTouchGlass(form: GhostForm): boolean {
  return FORM_BUILD[form].depth <= REACHES_GLASS;
}

/**
 * What it does.
 *
 *  - `drift`   across the pane and gone. The common one.
 *  - `linger`  half way, stops, turns to look out, moves on.
 *  - `fade`    sets off and dissolves, so a pass need not resolve.
 *  - `press`   comes up to the glass, faces you, holds, and is gone.
 *  - `hands`   both palms flat on the glass, and they stay printed on
 *              it after it goes.
 *  - `drag`    one hand on the glass, pulled slowly down.
 */
export const PASS_KINDS = [
  "drift",
  "linger",
  "fade",
  "press",
  "hands",
  "drag",
] as const;
export type PassKind = (typeof PASS_KINDS)[number];

/** How long each kind takes, in seconds. */
export const PASS_SECONDS: Record<PassKind, number> = {
  drift: 2.8,
  linger: 5.4,
  fade: 2.2,
  press: 4.6,
  hands: 5.2,
  drag: 6,
};

/**
 * Odds of each kind.
 *
 * The three that touch the glass are worth waiting for, and a thing
 * that is frightening every seven seconds is not frightening — but
 * they also only ever come from the forms near enough to reach the
 * pane, which is a little over half of them. So these are weighted
 * high enough that once the set-back forms have taken their share,
 * about a quarter of all sightings still end up leaving a print.
 */
const WEIGHTS: Record<PassKind, number> = {
  drift: 0.38,
  linger: 0.18,
  fade: 0.14,
  press: 0.14,
  hands: 0.18,
  drag: 0.1,
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

/**
 * The two or three forms this window ever shows.
 *
 * A cast rather than a free pick each time: a window that shows
 * anything at all is a lucky dip, where one that shows the same two
 * or three starts to feel like a particular room with a particular
 * thing in it.
 */
export function castFor(seed: number): GhostForm[] {
  const rand = mulberry(seed * 2246822519 + 13);
  const pool = [...FORMS];
  // Fisher-Yates, then take the first two or three
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, rand() < 0.45 ? 3 : 2);
}

/** What a pass leaves on the glass, if anything. */
export type MarkKind = "none" | "palms" | "drag" | "face";

export const PASS_MARK: Record<PassKind, MarkKind> = {
  drift: "none",
  linger: "none",
  fade: "none",
  press: "face",
  hands: "palms",
  drag: "drag",
};

export interface Sighting {
  form: GhostForm;
  kind: PassKind;
}

/**
 * The next thing this window does, drawn from its own cast.
 *
 * A form that stands at the back of the room is never given a pass
 * that touches the glass — it cannot reach it, and a handprint
 * appearing while the thing that left it is six feet behind the pane
 * unpicks the one effect the whole file exists for.
 */
export function pickSighting(
  cast: GhostForm[],
  rand: () => number = Math.random
): Sighting {
  const form = cast.length
    ? cast[Math.min(cast.length - 1, Math.floor(rand() * cast.length))]
    : "shade";
  const allowed: readonly PassKind[] = canTouchGlass(form)
    ? PASS_KINDS
    : PASS_KINDS.filter((k) => PASS_MARK[k] === "none");
  const total = allowed.reduce((a, k) => a + WEIGHTS[k], 0);
  let r = rand() * total;
  for (const kind of allowed) {
    r -= WEIGHTS[kind];
    if (r <= 0) return { form, kind };
  }
  return { form, kind: "drift" };
}

/** How long a mark takes to fade off the glass once nothing is holding it. */
export const MARK_FADE_SECONDS = 7;

/**
 * A mark left on the glass, one frame on.
 *
 * It outlives the thing that made it — that is the entire point of a
 * handprint — so the window keeps its own value and lets it decay,
 * taking whatever the ghost is pressing right now as a floor.
 */
export function decayMark(current: number, pressing: number, delta: number) {
  const faded = current - delta / MARK_FADE_SECONDS;
  return Math.max(0, Math.min(1, Math.max(faded, pressing)));
}

export interface GhostPose {
  /**
   * Across the pane: -1 at one edge of the opening, +1 at the other.
   *
   * A figure is free to be part way out at either end. The glass sits
   * 0.17 behind the face of the wall, so the reveal clips anything
   * that goes past the jamb — which is what lets a big one walk in
   * from behind the wall instead of fading up in mid-pane.
   *
   * Expressed as a fraction rather than in world units because how
   * far that is depends on the pane, which this file has no business
   * knowing.
   */
  x: number;
  /** Up and down, in pane heights. */
  y: number;
  /** Towards the glass, 0 at its resting depth and 1 against it. */
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
  /** Arms: 0 hanging at its sides, 1 palms flat on the glass. */
  reach: number;
  /** How hard it is pressing on the glass right now, 0 to 1. */
  press: number;
  /** How far down the glass a dragged hand has got, 0 to 1. */
  drag: number;
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

const REST = {
  y: 0,
  z: 0,
  turn: 0,
  scale: 1,
  reach: 0,
  press: 0,
  drag: 0,
};

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
      ...REST,
      x: -1 + p * 2,
      y: Math.sin(p * Math.PI * 3) * 0.05,
      // turned slightly the way it is walking, as anything crossing is
      turn: 0.32,
      opacity: bell(p),
      shadow: bell(p, 1) * 0.55,
    };
  }

  if (kind === "fade") {
    const fade = smooth(p * 4) * (1 - smooth((p - 0.35) / 0.65));
    return {
      ...REST,
      x: -1 + p * 1.25,
      y: Math.sin(p * Math.PI * 2) * 0.04,
      turn: 0.32,
      // up quickly, then away to nothing rather than back out the side
      opacity: fade,
      shadow: fade * 0.5,
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
      ...REST,
      x,
      y: Math.sin(p * Math.PI * 2) * 0.03,
      turn,
      opacity: bell(p, 1.1),
      shadow: bell(p, 0.8) * 0.6,
    };
  }

  if (kind === "press") {
    // up to the glass, facing out, held, then gone between frames
    const UP = 0.3;
    const GONE = 0.86;
    if (p < UP) {
      const t = smooth(p / UP);
      return {
        ...REST,
        x: -0.55 + t * 0.55,
        // meets the held phase exactly, or it snaps back off the
        // glass by six per cent the moment it arrives
        z: t * 0.94,
        turn: 0.38 * (1 - t),
        opacity: t * 0.9,
        scale: 1 + t * 0.1,
        shadow: t * 0.75,
        press: t * 0.45,
      };
    }
    if (p < GONE) {
      const h = (p - UP) / (GONE - UP);
      return {
        ...REST,
        x: 0,
        /*
         * Held against the glass. It does not drift, it does not bob
         * — it leans in and eases off, and never past 1, because the
         * clearance to the glazing bars is measured off exactly that.
         */
        z: 0.94 + Math.sin(h * Math.PI) * 0.06,
        opacity: 0.94,
        scale: MAX_POSE_SCALE,
        shadow: 0.82,
        press: 0.55,
      };
    }
    // Gone. Not faded — a blink of nothing, which is worse.
    return null;
  }

  if (kind === "hands") {
    /*
     * Comes to the glass, puts both palms flat on it, holds, and goes.
     * The prints stay: the window keeps its own mark and lets it fade
     * long after this returns null.
     */
    const UP = 0.26;
    const SET = 0.4;
    const HOLD = 0.78;
    if (p < UP) {
      const t = smooth(p / UP);
      return {
        ...REST,
        x: (-0.45 + t * 0.45) * 0.6,
        z: t,
        turn: 0.3 * (1 - t),
        opacity: t * 0.88,
        shadow: t * 0.7,
      };
    }
    if (p < SET) {
      // the hands come up and go flat
      const t = smooth((p - UP) / (SET - UP));
      return {
        ...REST,
        x: 0,
        z: 1,
        opacity: 0.9,
        shadow: 0.72 + t * 0.1,
        reach: t,
        press: t,
      };
    }
    if (p < HOLD) {
      return {
        ...REST,
        x: 0,
        z: 1,
        opacity: 0.92,
        shadow: 0.84,
        reach: 1,
        press: 1,
      };
    }
    // lets go and backs away into the dark
    const t = smooth((p - HOLD) / (1 - HOLD));
    return {
      ...REST,
      x: 0,
      z: 1 - t,
      opacity: 0.92 * (1 - t),
      shadow: 0.84 * (1 - t),
      reach: 1 - t,
      press: Math.max(0, 1 - t * 3),
    };
  }

  /*
   * drag: one hand on the glass, pulled slowly down.
   *
   * The slowest pass, because the whole thing is the waiting. The
   * streak it leaves is what is still there afterwards.
   */
  const UP = 0.2;
  const PULL = 0.72;
  if (p < UP) {
    const t = smooth(p / UP);
    return {
      ...REST,
      x: -0.3 * (1 - t),
      z: t,
      turn: 0.25 * (1 - t),
      opacity: t * 0.85,
      shadow: t * 0.6,
      reach: t * 0.85,
    };
  }
  if (p < PULL) {
    const t = (p - UP) / (PULL - UP);
    return {
      ...REST,
      x: 0,
      // it sinks as the hand comes down
      y: -t * 0.1,
      z: 1,
      opacity: 0.88,
      shadow: 0.7,
      reach: 0.85 - t * 0.72,
      press: 1,
      drag: t,
    };
  }
  const t = smooth((p - PULL) / (1 - PULL));
  return {
    ...REST,
    x: 0,
    y: -0.1,
    z: 1 - t,
    opacity: 0.88 * (1 - t),
    shadow: 0.7 * (1 - t),
    reach: 0.13 * (1 - t),
    press: Math.max(0, 1 - t * 3),
    drag: 1,
  };
}
