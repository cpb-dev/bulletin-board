import type { BoardTheme } from "@/themes/types";

/**
 * Stars Hollow — colours, papers, pins and room dressing.
 *
 * Taken from the town itself: the cornflower blue of the town sign, the
 * white paint on its posts (which the board's frame borrows), the
 * yellow of the coffee cup outside Luke's, and the rust and maple of
 * the square in October.
 */
export const palette: BoardTheme = {
  id: "stars-hollow",
  name: "Stars Hollow",
  tagline: "Autumn on the town square, coffee at Luke's",
  emoji: "☕",
  group: "tv",
  room: {
    wall: "#efe7d6",
    wallTrim: "#d9cfbb",
    // tints the grass of the square
    floor: "#8fa65a",
    rug: "#a2512a",
    accent: "#c8541e",
  },
  board: {
    surface: "#d8b98a",
    surfaceSpeckle: "#b38c5b",
    // painted white, like the town sign's posts
    frame: "#ece6d8",
  },
  light: {
    sky: "#9cc3e6",
    ambientIntensity: 0.9,
    key: "#ffe2b0",
    keyIntensity: 1.3,
    lamp: "#ffc26b",
  },
  pins: ["#c8541e", "#3f6fb5", "#e0a526", "#8c2f24"],
  papers: [
    { id: "coffee", name: "Coffee", bg: "#f2e3cc", ink: "#5b3a22" },
    { id: "maple", name: "Maple", bg: "#f7cba2", ink: "#7a3413" },
    { id: "hollow", name: "Hollow Blue", bg: "#d8e5f5", ink: "#274a80" },
    { id: "lukes", name: "Luke's Yellow", bg: "#f8e8a2", ink: "#6a4a12" },
  ],
  garland: "#f0b44a",
  decorations: "cottage",
  ui: {
    bg: "#22314a",
    panel: "#34496b",
    accent: "#f0b44a",
    text: "#f6efe0",
  },
};
