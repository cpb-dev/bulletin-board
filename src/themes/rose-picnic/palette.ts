import type { BoardTheme } from "@/themes/types";

/** Rose Picnic — colours, papers, pins and room dressing. */
export const palette: BoardTheme = {
  id: "rose-picnic",
  name: "Rose Picnic",
  tagline: "A rose field at golden hour",
  emoji: "🌹",
  group: "special",
  room: {
    wall: "#f7c9d4",
    wallTrim: "#fff3f0",
    floor: "#6a9e57",
    rug: "#ffd7e0",
    accent: "#e5527a",
  },
  board: {
    surface: "#f6e3d2",
    surfaceSpeckle: "#e2c4ad",
    frame: "#fff5f2",
  },
  light: {
    sky: "#ffd9c4",
    ambientIntensity: 0.9,
    key: "#ffe6c9",
    keyIntensity: 1.5,
    lamp: "#ffc7a1",
  },
  pins: ["#e5527a", "#ff9ec0", "#c98ce0", "#f6c34c"],
  papers: [
    // "heart" is the exclusive heart-shaped note (drawn as a heart).
    { id: "heart", name: "Heart", bg: "#ff9ec0", ink: "#7c2044" },
    { id: "petal", name: "Petal", bg: "#ffe3ec", ink: "#96345a" },
    { id: "cream", name: "Cream", bg: "#fff8ef", ink: "#8a5a44" },
    { id: "leaf", name: "Leaf", bg: "#e4f0d8", ink: "#48603a" },
  ],
  garland: "#ff9ec0",
  decorations: "meadow",
  miniBoard: { label: "your day" },
  ui: {
    bg: "#8a2547",
    panel: "#a53560",
    accent: "#ffb3cb",
    text: "#fff0f5",
  },
};
