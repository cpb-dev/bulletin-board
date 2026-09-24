/**
 * The fairy bulbs in the board's leaf garland, twinkling after dark
 * (BB-21).
 *
 * Each bulb breathes on its own: three slow waves at frequencies that
 * never line up, offset per bulb, so no two bulbs pulse together and
 * the string never falls into a rhythm. The wave is cubed, so a bulb
 * spends most of its time near full and only now and then dips — a
 * twinkle, not a strobe.
 *
 * Pure so it's tested without a renderer; the bulbs live in
 * `props/LeafGarland.tsx`.
 */

/**
 * How bright bulb `i` is at time `t` (seconds), from `1 - amount`
 * (the deepest dip) up to 1 (full). With `amount` 0 the bulb is steady.
 */
export function twinkle(t: number, i: number, amount: number): number {
  const s = i * 2.39996; // the golden angle: offsets that never repeat
  const wave =
    Math.sin(t * 1.7 + s) * 0.5 +
    Math.sin(t * 2.9 + s * 1.618) * 0.3 +
    Math.sin(t * 0.83 + s * 2.414) * 0.2;
  return 1 - amount * ((wave + 1) / 2) ** 3;
}
