import type { BoardTheme } from "@/themes/types";

/** Summer House — colours, papers, pins and room dressing. */
export const palette: BoardTheme = {
  id: "summer-house",
  name: "Summer House",
  tagline: "Sunlit blue & white with sunflowers",
  emoji: "🌻",
  group: "basic",
  room: {
    wall: "#eaf4fb",
    wallTrim: "#7fb6da",
    floor: "#e8d8b8",
    rug: "#9ad0e6",
    accent: "#f7c948",
  },
  board: {
    surface: "#fdf6e3",
    surfaceSpeckle: "#e7d9b6",
    frame: "#5b96bd",
  },
  light: {
    sky: "#dff1ff",
    ambientIntensity: 1.05,
    key: "#fff6dd",
    keyIntensity: 1.55,
    lamp: "#ffd874",
  },
  pins: ["#f7c948", "#4fa3d1", "#ef8a5a", "#7bc47f"],
  papers: [
    { id: "shell", name: "Shell", bg: "#fffaf0", ink: "#7a6033" },
    { id: "sky", name: "Sky", bg: "#d7eefb", ink: "#2f5d7a" },
    { id: "coral", name: "Coral", bg: "#ffe0d4", ink: "#a8512f" },
    { id: "sunflower", name: "Sunflower", bg: "#fff0c0", ink: "#7d5e16" },
  ],
  garland: "#f7c948",
  decorations: "summer",
  windowView: "garden",
  plantStyle: "flowerbush",
  ui: {
    bg: "#d9edf8",
    panel: "#ffffff",
    accent: "#4fa3d1",
    text: "#33536b",
  },
};
