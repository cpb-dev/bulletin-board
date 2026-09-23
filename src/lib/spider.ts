/**
 * How the spiders on the board move.
 *
 * They used to pick a spot, smoothstep to it and freeze. That is a
 * cursor, not a spider. This is a continuous crawl with a real gait:
 * the legs are driven by how far the body has actually travelled, so a
 * spider ambling takes slow deliberate steps and one bolting from a
 * fingertip scrabbles — without either being animated separately.
 *
 * Pure, so the gait can be checked without a renderer. The component
 * integrates the position; everything that decides *how* it moves is
 * here.
 */

/** Legs, four a side. */
export const LEGS = 8;

/**
 * Which alternating group each leg belongs to.
 *
 * Spiders walk an alternating tetrapod: legs 1 and 3 on one side move
 * with 2 and 4 on the other, so four feet are always down. Indices run
 * front to back, left side 0-3 and right side 4-7.
 */
const GROUP = [0, 1, 0, 1, 1, 0, 1, 0];

/** Metres of travel for one full leg cycle. */
export const STRIDE = 0.075;

/** Fraction of the cycle a foot spends planted. */
const STANCE = 0.62;

/** A slow crawl, in metres per second. */
export const AMBLE = 0.055;
/** Flat out, the instant something touches it. */
export const BOLT = 0.95;
/** How long the panic lasts, in seconds. */
export const FLEE_SECONDS = 2.1;

/**
 * How fast it is going, `since` seconds after it was last touched.
 *
 * Negative or large `since` means it was never touched or has long
 * since calmed down. The bolt decays rather than stepping back to a
 * walk — a spider that stops dead reads as a bug in the code.
 */
export function crawlSpeed(since: number): number {
  if (!(since >= 0) || since >= FLEE_SECONDS) return AMBLE;
  const left = 1 - since / FLEE_SECONDS;
  // cubic: nearly all the speed is spent in the first half-second
  return AMBLE + (BOLT - AMBLE) * left * left * left;
}

/**
 * How sharply it is turning at time `t`, in radians per second.
 *
 * Three rates that never line up, so it wanders instead of circling.
 */
export function wanderTurn(t: number, seed: number): number {
  const s = seed * 1.37;
  return (
    Math.sin(t * 0.47 + s) * 0.9 +
    Math.sin(t * 1.13 + s * 2.1) * 0.5 +
    Math.sin(t * 2.71 + s * 3.3) * 0.25
  );
}

/** Where leg `leg` is in its cycle, given how far the body has gone. */
export function gaitPhase(leg: number, travelled: number): number {
  const p = travelled / STRIDE + GROUP[leg % LEGS] * 0.5;
  return p - Math.floor(p);
}

export interface LegPose {
  /** 0 planted, up to 1 at the top of the step. */
  lift: number;
  /** -1 fully back, +1 fully forward. */
  swing: number;
}

/**
 * One leg's pose at `phase` of its cycle.
 *
 * Planted for the first stretch — the foot stays put and the body
 * moves past it, so the leg sweeps backwards — then lifted and swung
 * forward in an arc to plant again.
 */
export function legPose(phase: number): LegPose {
  const p = ((phase % 1) + 1) % 1;
  if (p < STANCE) {
    // foot down, dragging backwards relative to the body
    return { lift: 0, swing: 1 - (p / STANCE) * 2 };
  }
  const s = (p - STANCE) / (1 - STANCE);
  return {
    lift: Math.sin(s * Math.PI),
    swing: -1 + s * 2,
  };
}

/** How many feet are on the ground at this point in the cycle. */
export function feetDown(travelled: number): number {
  let n = 0;
  for (let i = 0; i < LEGS; i++) {
    if (legPose(gaitPhase(i, travelled)).lift === 0) n++;
  }
  return n;
}

export interface Bounds {
  x: number;
  y: number;
}

/**
 * Keeps a spider on the board.
 *
 * Reflects the heading off whichever edge it has reached and pushes the
 * position back inside, so a spider bolting at nearly a metre a second
 * cannot escape between two frames.
 */
export function reflect(
  x: number,
  y: number,
  heading: number,
  bounds: Bounds
): { x: number; y: number; heading: number } {
  let h = heading;
  let nx = x;
  let ny = y;
  if (nx < -bounds.x || nx > bounds.x) {
    h = Math.PI - h;
    nx = Math.max(-bounds.x, Math.min(bounds.x, nx));
  }
  if (ny < -bounds.y || ny > bounds.y) {
    h = -h;
    ny = Math.max(-bounds.y, Math.min(bounds.y, ny));
  }
  // keep it in -PI..PI so the component's lerps never take the long way
  h = Math.atan2(Math.sin(h), Math.cos(h));
  return { x: nx, y: ny, heading: h };
}
