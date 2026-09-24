import type { BoardTheme } from "@/themes/types";

/** Cozy Cabin — colours, papers, pins and room dressing. */
export const palette: BoardTheme = {
  id: "cozy-cabin",
  name: "Cozy Cabin",
  tagline: "Warm wood, cork and lamplight",
  emoji: "🪵",
  group: "basic",
  room: {
    wall: "#caa472",
    wallTrim: "#8a6440",
    floor: "#9c7349",
    rug: "#b8553f",
    accent: "#5f8f57",
  },
  board: {
    surface: "#c89d68",
    surfaceSpeckle: "#a98050",
    frame: "#6e4a2a",
  },
  light: {
    sky: "#ffe7c2",
    ambientIntensity: 0.85,
    key: "#ffd9a0",
    keyIntensity: 1.5,
    lamp: "#ffb364",
  },
  pins: ["#e2574c", "#3f7fc1", "#e8b63a", "#5f9e57"],
  papers: [
    { id: "butter", name: "Butter", bg: "#fff3b8", ink: "#5b4226" },
    { id: "rose", name: "Rose", bg: "#ffd9d4", ink: "#7a3b3b" },
    { id: "sky", name: "Sky", bg: "#d3ecff", ink: "#2d5573" },
    { id: "mint", name: "Mint", bg: "#dcf5d8", ink: "#33603a" },
  ],
  garland: "#e2574c",
  decorations: "cabin",
  wallStyle: "logs",
  roomFeature: "fireplace",
  ui: {
    bg: "#2e2017",
    panel: "#473526",
    accent: "#e8a04c",
    text: "#ffeed8",
  },
};
