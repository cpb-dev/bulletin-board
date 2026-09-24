import type { BoardTheme } from "@/themes/types";

/** World Cup — colours, papers, pins and room dressing. */
export const palette: BoardTheme = {
  id: "world-cup",
  name: "World Cup",
  tagline: "Pitch green & gold",
  emoji: "⚽",
  group: "special",
  room: {
    wall: "#1b8a3a",
    wallTrim: "#ffffff",
    floor: "#0e6b2b",
    rug: "#f4f4f4",
    accent: "#ffd23f",
  },
  board: {
    surface: "#2fa44e",
    surfaceSpeckle: "#268b41",
    frame: "#ffffff",
  },
  light: {
    sky: "#e0f6e6",
    ambientIntensity: 0.95,
    key: "#fffbe6",
    keyIntensity: 1.45,
    lamp: "#ffd23f",
  },
  pins: ["#ffd23f", "#e2574c", "#3f7fc1", "#ffffff"],
  papers: [
    { id: "pitch", name: "Pitch", bg: "#eafff0", ink: "#1b6b34" },
    { id: "gold", name: "Gold", bg: "#fff2c2", ink: "#7a5b12" },
    { id: "kit", name: "Kit", bg: "#ffffff", ink: "#2a2a2a" },
    { id: "sky", name: "Sky", bg: "#d7eefb", ink: "#2f5d7a" },
  ],
  garland: "#ffd23f",
  decorations: "cottage",
  ui: {
    bg: "#0e6b2b",
    panel: "#13803a",
    accent: "#ffd23f",
    text: "#eafff0",
  },
};
