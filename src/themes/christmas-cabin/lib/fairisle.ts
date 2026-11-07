/**
 * The Christmas Cabin's rug pattern (BB-35): a Nordic Fair Isle knit, the
 * Christmas-jumper look, charted stitch by stitch.
 *
 * A chart is rows of stitches, each one colour: "r" cranberry red (the
 * ground), "c" cream (the motifs) and "g" pine green (the narrow peerie
 * bands). Bands run across the rug's width, mirrored top to bottom about
 * a central band of big snowflakes, like a real knitted blanket.
 *
 * Pure, so the pattern is tested without a canvas.
 */

export type Stitch = "r" | "c" | "g";

/** Stitches across the rug's width and down its depth. */
// Knit stitches are wider than they are tall, so there are more rows
// than the rug's proportions alone would give.
export const CHART = { cols: 115, rows: 99 } as const;

/** Motifs, drawn in cream ("#") on the ground ("."). Each is symmetric. */
const SNOWFLAKE = [
  "....#....",
  ".#..#..#.",
  "..#.#.#..",
  "...###...",
  "####.####",
  "...###...",
  "..#.#.#..",
  ".#..#..#.",
  "....#....",
];

const STAR = [
  "#..#..#",
  ".#.#.#.",
  "..###..",
  "###.###",
  "..###..",
  ".#.#.#.",
  "#..#..#",
];

const BIG_SNOWFLAKE = [
  "......#......",
  "...#..#..#...",
  "....#.#.#....",
  ".#...###...#.",
  "..#..###..#..",
  "...#.#.#.#...",
  "######.######",
  "...#.#.#.#...",
  "..#..###..#..",
  ".#...###...#.",
  "....#.#.#....",
  "...#..#..#...",
  "......#......",
];

/** A thin zig-zag of green "peerie" stitches, three rows tall. */
const PEERIE = ["#...#...", ".#.#.#.#", "..#...#."];

/**
 * One band: a motif repeated across the width, centred, with the gap
 * between repeats chosen so the band is left-right symmetric.
 */
function band(motif: string[], ink: Stitch, ground: Stitch, minGap: number): Stitch[][] {
  const w = motif[0].length;
  // Widen the gap until the repeats centre exactly: the space left over
  // either side has to split evenly, or the band can't mirror.
  let gap = minGap;
  let count = 0;
  let used = 0;
  for (; gap < minGap + 4; gap++) {
    count = Math.floor((CHART.cols + gap) / (w + gap));
    used = count * (w + gap) - gap;
    if ((CHART.cols - used) % 2 === 0) break;
  }
  const step = w + gap;
  const left = (CHART.cols - used) / 2;
  return motif.map((line) => {
    const row: Stitch[] = Array(CHART.cols).fill(ground);
    for (let k = 0; k < count; k++)
      for (let i = 0; i < w; i++) if (line[i] === "#") row[left + k * step + i] = ink;
    return row;
  });
}

/** A repeating border pattern that tiles straight across. */
function tiled(pattern: string[], ink: Stitch, ground: Stitch): Stitch[][] {
  return pattern.map((line) => {
    const row = Array.from({ length: CHART.cols }, (_, i) =>
      line[i % line.length] === "#" ? ink : ground
    );
    // Make it left-right symmetric: mirror the left half onto the right.
    for (let i = 0; i < CHART.cols / 2; i++) row[CHART.cols - 1 - i] = row[i];
    return row;
  });
}

const solid = (s: Stitch, n = 1): Stitch[][] =>
  Array.from({ length: n }, () => Array<Stitch>(CHART.cols).fill(s));

/**
 * The whole chart. The top half is built from the outside in, then
 * mirrored to make the bottom half around a central band of big
 * snowflakes.
 */
export function fairIsleChart(): Stitch[][] {
  const top: Stitch[][] = [
    ...solid("c", 2),
    ...solid("r", 2),
    ...tiled(PEERIE, "g", "r"),
    ...solid("r", 2),
    ...solid("c", 1),
    ...solid("r", 2),
    ...band(STAR, "c", "r", 5),
    ...solid("r", 2),
    ...solid("c", 1),
    ...solid("r", 2),
    ...tiled(PEERIE, "g", "r"),
    ...solid("r", 2),
    ...band(SNOWFLAKE, "c", "r", 6),
    ...solid("r", 3),
  ];
  const middle = band(BIG_SNOWFLAKE, "c", "r", 9);
  const fill = CHART.rows - top.length * 2 - middle.length;
  if (fill < 0) throw new Error("Fair Isle chart is taller than the rug");
  const padTop = Math.floor(fill / 2);
  const centre = [...solid("r", padTop), ...middle, ...solid("r", fill - padTop)];
  // Mirror rows are copies, so a test can compare them freely.
  return [...top, ...centre, ...top.map((r) => [...r]).reverse()];
}
