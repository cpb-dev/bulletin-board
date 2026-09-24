import type { BoardTheme } from "@/themes/types";

/** Peach Parfait — colours, papers, pins and room dressing. */
export const palette: BoardTheme = {
  id: "peach-parfait",
  name: "Peach Parfait",
  tagline: "Pastel pinks and cream linen",
  emoji: "🍑",
  group: "basic",
  room: {
    wall: "#ffd9cf",
    wallTrim: "#f5b3a6",
    floor: "#f7e3d4",
    rug: "#ffc3d2",
    accent: "#ff9eb0",
  },
  board: {
    surface: "#fff0e0",
    surfaceSpeckle: "#f3d7bd",
    frame: "#ffffff",
  },
  light: {
    sky: "#fff2ec",
    ambientIntensity: 1.0,
    key: "#fff0e2",
    keyIntensity: 1.3,
    lamp: "#ffc9a8",
  },
  pins: ["#ff8fa3", "#ffc15e", "#8fd0ff", "#c5a3ff"],
  papers: [
    { id: "cream", name: "Cream", bg: "#fffaf0", ink: "#8a5a44" },
    { id: "blush", name: "Blush", bg: "#ffe0e6", ink: "#a04860" },
    { id: "peach", name: "Peach", bg: "#ffe6cf", ink: "#9c5a2e" },
    { id: "lilac", name: "Lilac", bg: "#ecdfff", ink: "#5f4a8a" },
  ],
  garland: "#ff8fa3",
  decorations: "cottage",
  ui: {
    bg: "#fff1ea",
    panel: "#ffffff",
    accent: "#ff7d99",
    text: "#6b4a3f",
  },
};
