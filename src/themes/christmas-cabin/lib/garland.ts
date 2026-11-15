/**
 * The board garland's lights (BB-35): how bright each bulb is at a moment.
 *
 * A gentle, uneven twinkle, so the string never looks like it's pulsing
 * in step. Each bulb drifts on two slow sines of its own, and now and
 * then one catches a brief sparkle. Pure, so it's tested without a
 * renderer.
 */

/** The dimmest and brightest a bulb gets. */
export const TWINKLE = { min: 0.45, max: 1 } as const;

/** A smooth bump: 0 outside [0, 1], peaking at 1 in the middle. */
function bump(x: number): number {
  return x <= 0 || x >= 1 ? 0 : Math.sin(Math.PI * x) ** 2;
}

/** How bright bulb `i` is at `t` seconds, from TWINKLE.min to TWINKLE.max. */
export function bulbTwinkle(i: number, t: number): number {
  const a = Math.sin(t * (0.55 + (i % 7) * 0.09) + i * 2.31);
  const b = Math.sin(t * (1.3 + (i % 4) * 0.17) + i * 0.77);
  const base = 0.5 + 0.32 * a + 0.12 * b; // ~0.06 .. 0.94
  // A sparkle: each bulb flares to full once every ~9-15 s, for about a second.
  const period = 9 + (i % 5) * 1.5;
  const sparkle = bump(((t + i * 3.7) % period) / 1.0);
  const k = Math.min(1, Math.max(0, base + (1 - base) * sparkle));
  return TWINKLE.min + (TWINKLE.max - TWINKLE.min) * k;
}
