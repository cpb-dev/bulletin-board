/**
 * The alphabet light wall (BB-35): where each painted letter and its bulb
 * sit, and what the bulbs are doing at any moment.
 *
 * Most of the time the string just twinkles. Every so often it dims, and
 * the bulbs spell out a message one letter at a time ("MERRY CHRISTMAS",
 * "I LOVE YOU", ...), then the whole string chases back on. Pure and
 * seeded, so the timing is tested without a renderer and the same seed
 * always tells the same story.
 */

import { mulberry32 } from "@/components/three/textures";
import { ALPHABET_WALL } from "./layout";

// ---- where everything goes ------------------------------------------------

/** How the string hangs: hooks per row, how far it sags, bulb drop below it. */
export const STRING = { hooks: 4, sag: 0.09, bulbDrop: 0.07, bulbLength: 0.11 } as const;

export interface LetterSpot {
  letter: string;
  /** Index into the alphabet, 0 = A. */
  index: number;
  /** Letter centre, in the wall's local units (centred; +y up). */
  x: number;
  y: number;
  /** Where its bulb's socket meets the wire. */
  bulbX: number;
  bulbY: number;
}

/** The height of row `r`'s wire at local `x`: hung from hooks, sagging between them. */
export function wireY(r: number, x: number): number {
  const { width, height, rows } = ALPHABET_WALL;
  const rowTop = height / 2 - (height / rows.length) * r;
  const top = rowTop - 0.08;
  const t = (x + width / 2) / width;
  const spans = STRING.hooks - 1;
  const local = (Math.min(Math.max(t, 0), 1) * spans) % 1;
  // A little extra sag in the middle span of the bottom rows, so the
  // three strings don't look ruled.
  const sag = STRING.sag * (1 + 0.25 * ((r * 7) % 3) / 2);
  return top - 4 * sag * local * (1 - local);
}

/** Every letter, A to Z, with its bulb. */
export function letterSpots(): LetterSpot[] {
  const { width, height, rows } = ALPHABET_WALL;
  const rowH = height / rows.length;
  let index = 0;
  return rows.flatMap((row, r) => {
    const inset = 0.12;
    return [...row].map((letter, i) => {
      const x = -width / 2 + inset + (width - 2 * inset) * ((i + 0.5) / row.length);
      const bulbY = wireY(r, x);
      const rowTop = height / 2 - rowH * r;
      return {
        letter,
        index: index++,
        x,
        // Letters sit in the lower part of the row, under the bulbs.
        y: rowTop - rowH * 0.72,
        bulbX: x,
        bulbY,
      };
    });
  });
}

// ---- what the bulbs are doing ---------------------------------------------

/** The messages the wall spells. Letters and spaces only. */
export const MESSAGES = [
  "MERRY CHRISTMAS",
  "I LOVE YOU",
  "LET IT SNOW",
  "HO HO HO",
  "XOXO",
  "JOY",
  "BE MINE",
] as const;

/** Seconds. */
export const SPELL = {
  /** Twinkling before the first message, so it's seen soon after arriving. */
  first: 5,
  /** Twinkling between messages. */
  restMin: 14,
  restMax: 26,
  /** The string flickers and dims before a message. */
  flicker: 1.4,
  /** Each letter lit, then a beat dark before the next. */
  letterOn: 0.85,
  letterGap: 0.25,
  /** A space in the message. */
  space: 0.7,
  /** A breath after the last letter, then the chase back on. */
  hold: 0.6,
  chase: 2.2,
} as const;

/** One message, from the flicker to the end of the chase. */
export interface Spelling {
  start: number;
  message: string;
  /** When each letter lights, relative to `start`, with its alphabet index. */
  letters: { at: number; index: number }[];
  /** Total length, relative to `start`. */
  duration: number;
}

/** The letter timings for a message, after the flicker. */
export function spellOut(message: string): Pick<Spelling, "letters" | "duration"> {
  let at = SPELL.flicker;
  const letters: Spelling["letters"] = [];
  for (const ch of message) {
    if (ch === " ") {
      at += SPELL.space;
      continue;
    }
    letters.push({ at, index: ch.charCodeAt(0) - 65 });
    at += SPELL.letterOn + SPELL.letterGap;
  }
  return { letters, duration: at + SPELL.hold + SPELL.chase };
}

/**
 * The messages from 0 to `until` seconds: a rest, a message, a rest...
 * Never the same message twice running.
 */
export function planSpellings(seed: number, until: number): Spelling[] {
  const r = mulberry32(seed);
  const out: Spelling[] = [];
  let t = SPELL.first;
  let last = -1;
  while (t < until) {
    let pick = Math.floor(r() * MESSAGES.length);
    if (pick === last) pick = (pick + 1) % MESSAGES.length;
    // The two that matter most come round more often.
    if (r() < 0.35) pick = last === 0 ? 1 : 0;
    last = pick;
    const message = MESSAGES[pick];
    const s = spellOut(message);
    out.push({ start: t, message, ...s });
    t += s.duration + SPELL.restMin + r() * (SPELL.restMax - SPELL.restMin);
  }
  return out;
}

/** The spelling under way at `t`, if any. */
export function spellingAt(plan: readonly Spelling[], t: number): Spelling | null {
  let lo = 0;
  let hi = plan.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const s = plan[mid];
    if (t < s.start) hi = mid - 1;
    else if (t >= s.start + s.duration) lo = mid + 1;
    else return s;
  }
  return null;
}

const LETTERS = 26;
/** How bright the string sits while twinkling, and while a message is spelt. */
export const LEVEL = { idle: 0.62, dimmed: 0.06, lit: 1 } as const;

/** A slow, uneven twinkle per bulb: a sum of sines, so it never visibly repeats. */
function twinkle(i: number, t: number): number {
  const a = Math.sin(t * (0.7 + (i % 5) * 0.13) + i * 1.7);
  const b = Math.sin(t * (1.9 + (i % 3) * 0.21) + i * 0.9);
  return LEVEL.idle + 0.16 * a + 0.08 * b;
}

/** A smooth 0→1 over [a, b]. */
function ramp(x: number, a: number, b: number): number {
  const k = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return k * k * (3 - 2 * k);
}

/**
 * How bright each of the 26 bulbs is at `t` (0 dark, 1 full), written
 * into `out` (A first). Allocation-free, so it can run every frame.
 */
export function bulbLevels(plan: readonly Spelling[], t: number, out: Float32Array = new Float32Array(LETTERS)): Float32Array {
  const s = spellingAt(plan, t);
  if (!s) {
    for (let i = 0; i < LETTERS; i++) out[i] = twinkle(i, t);
    return out;
  }
  const local = t - s.start;
  const chaseFrom = s.duration - SPELL.chase;

  for (let i = 0; i < LETTERS; i++) {
    const idle = twinkle(i, t);
    if (local < SPELL.flicker) {
      // Stutter, then fade down: the house's wiring noticing something.
      const k = local / SPELL.flicker;
      const stutter = Math.sin(local * 38 + i * 2.3) > 0.2 ? 1 : 0.35;
      const down = 1 - ramp(k, 0.35, 1);
      out[i] = LEVEL.dimmed + (idle * stutter - LEVEL.dimmed) * down;
    } else if (local < chaseFrom) {
      out[i] = LEVEL.dimmed;
    } else {
      // Chase back on, A to Z, then settle into the twinkle.
      const k = (local - chaseFrom) / SPELL.chase;
      const on = ramp(k * 1.6 - (i / LETTERS) * 0.6, 0, 0.4);
      out[i] = LEVEL.dimmed + (idle - LEVEL.dimmed) * on;
    }
  }
  if (local >= SPELL.flicker && local < chaseFrom) {
    for (const l of s.letters) {
      const since = local - l.at;
      if (since < 0 || since >= SPELL.letterOn + SPELL.letterGap) continue;
      // Snap on, glow, and ease off into the gap.
      const level =
        since < 0.06 ? ramp(since, 0, 0.06) : 1 - ramp(since, SPELL.letterOn - 0.1, SPELL.letterOn + 0.1);
      out[l.index] = Math.max(out[l.index], LEVEL.dimmed + (LEVEL.lit - LEVEL.dimmed) * level);
    }
  }
  return out;
}
