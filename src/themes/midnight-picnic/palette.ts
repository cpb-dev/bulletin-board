import type { BoardTheme } from "@/themes/types";

/** Midnight Picnic — colours, papers, pins and room dressing. */
export const palette: BoardTheme = {
  id: "midnight-picnic",
  name: "Midnight Picnic",
  tagline: "Starry skies and fairy lights",
  emoji: "🌙",
  group: "basic",
  room: {
    wall: "#232a4d",
    wallTrim: "#161c38",
    floor: "#2c2440",
    rug: "#41356b",
    accent: "#f2c94c",
  },
  board: {
    surface: "#33406b",
    surfaceSpeckle: "#28335a",
    frame: "#171f3d",
  },
  light: {
    sky: "#5a6bb8",
    ambientIntensity: 0.55,
    key: "#aab8ff",
    keyIntensity: 1.1,
    lamp: "#ffd98a",
  },
  pins: ["#f2c94c", "#ff9fb7", "#7ee0d2", "#c5a3ff"],
  papers: [
    { id: "moon", name: "Moonlight", bg: "#f4f1ff", ink: "#3c3760" },
    { id: "gold", name: "Starlight", bg: "#fff0c2", ink: "#6e5618" },
    { id: "dusk", name: "Dusk", bg: "#d9e2ff", ink: "#33406b" },
    { id: "berry", name: "Berry", bg: "#ffd9ec", ink: "#7c3a5c" },
  ],
  garland: "#ffd98a",
  decorations: "night",
  ui: {
    bg: "#141936",
    panel: "#232a4d",
    accent: "#f2c94c",
    text: "#e8ecff",
  },
};
