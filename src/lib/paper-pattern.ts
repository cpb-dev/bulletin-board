/**
 * Printed paper (BB-46): an optional pattern on a theme's paper, drawn
 * over its colour. Christmas Cabin's candy-cane, tartan, kraft and
 * snowflake papers use it.
 *
 * Opt-in per paper: a paper without a `pattern` is drawn exactly as
 * before, so every existing theme, live note and archived board is
 * untouched. The canvas drawing is in `components/three/paper-patterns`;
 * this file holds the type and the picker swatch, both pure.
 */

export type PaperPattern = "candy" | "tartan" | "kraft" | "snowflakes";

export const PAPER_PATTERNS: readonly PaperPattern[] = ["candy", "tartan", "kraft", "snowflakes"];

export function isPaperPattern(value: unknown): value is PaperPattern {
  return PAPER_PATTERNS.includes(value as PaperPattern);
}

/**
 * A CSS background for a paper's picker swatch: its colour, with a hint
 * of the print over it. A plain paper is just its colour, as before.
 */
export function swatchBackground(bg: string, pattern?: PaperPattern): string {
  switch (pattern) {
    case "candy":
      return `repeating-linear-gradient(135deg, #c8262e 0 4px, ${bg} 4px 9px)`;
    case "tartan":
      return [
        "repeating-linear-gradient(0deg, rgba(20,60,35,0.55) 0 3px, transparent 3px 11px)",
        "repeating-linear-gradient(90deg, rgba(20,60,35,0.55) 0 3px, transparent 3px 11px)",
        bg,
      ].join(", ");
    case "kraft":
      return `linear-gradient(45deg, transparent 46%, #efe2c4 46% 54%, transparent 54%), ${bg}`;
    case "snowflakes":
      return `radial-gradient(circle at 30% 30%, #fff 0 1.5px, transparent 2px), radial-gradient(circle at 70% 62%, #fff 0 1.5px, transparent 2px), radial-gradient(circle at 40% 80%, #fff 0 1px, transparent 1.5px), ${bg}`;
    default:
      return bg;
  }
}
