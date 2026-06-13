/**
 * Crab reactions for the Beach Hut scene. Pure so the picker can be
 * unit-tested; the visual animation lives in BeachScene.
 *
 * Each tap triggers a random reaction, and we avoid immediately
 * repeating the last one so a crab feels lively and a bit unpredictable.
 */

export const CRAB_REACTIONS = [
  "hop", // springs straight up
  "spin", // whirls around
  "scuttle", // darts sideways quickly
  "wave", // raises and wiggles its claws
  "dig", // burrows down into the sand
  "bubble", // blows a stream of bubbles
  "hearts", // smitten — little hearts float up
  "shake", // shimmies with a startled wobble
] as const;

export type CrabReaction = (typeof CRAB_REACTIONS)[number];

/** How long each reaction plays, in seconds. */
export const CRAB_REACTION_DURATION: Record<CrabReaction, number> = {
  hop: 0.7,
  spin: 0.9,
  scuttle: 1.0,
  wave: 1.1,
  dig: 1.2,
  bubble: 1.3,
  hearts: 1.4,
  shake: 0.8,
};

/**
 * Pick a random reaction, optionally avoiding `exclude` so a crab never
 * plays the same trick twice in a row.
 */
export function pickCrabReaction(
  rand: () => number = Math.random,
  exclude?: CrabReaction
): CrabReaction {
  const pool = exclude
    ? CRAB_REACTIONS.filter((r) => r !== exclude)
    : CRAB_REACTIONS;
  const idx = Math.floor(rand() * pool.length) % pool.length;
  return pool[idx];
}
