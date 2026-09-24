import type { BoardTheme } from "@/themes/types";

/** Haunted Hollow — colours, papers, pins and room dressing. */
export const palette: BoardTheme = {
  id: "haunted-hollow",
  name: "Haunted Hollow",
  tagline: "Autumn graveyard, ghosts at the windows",
  emoji: "🎃",
  group: "seasonal",
  room: {
    wall: "#4a3f4d",
    wallTrim: "#2f2733",
    floor: "#6b5a3c",
    rug: "#7a4420",
    accent: "#e8761f",
  },
  board: {
    surface: "#e8d9b8",
    surfaceSpeckle: "#c4ad84",
    frame: "#4a3729",
  },
  light: {
    sky: "#c7a789",
    ambientIntensity: 0.95,
    key: "#ffe6b8",
    keyIntensity: 1.35,
    lamp: "#ffb347",
  },
  pins: ["#e8761f", "#7a4fa3", "#6b8f3a", "#c2371f"],
  papers: [
    { id: "parchment", name: "Parchment", bg: "#f4e6c8", ink: "#5a4426" },
    { id: "pumpkin", name: "Pumpkin", bg: "#ffd9ae", ink: "#8a4212" },
    { id: "witch", name: "Witch", bg: "#e4d7f2", ink: "#4d2d6b" },
    { id: "moss", name: "Moss", bg: "#dbe8c8", ink: "#3f5a2a" },
  ],
  garland: "#e8761f",
  decorations: "cottage",
  ui: {
    bg: "#2f2733",
    panel: "#463a4d",
    accent: "#e8761f",
    text: "#f4e6c8",
  },
};
