import type { BoardTheme } from "@/themes/types";

/** Beach Hut — colours, papers, pins and room dressing. */
export const palette: BoardTheme = {
  id: "beach-hut",
  name: "Beach Hut",
  tagline: "On the sand by the sea, birds & crabs",
  emoji: "🏖️",
  group: "seasonal",
  room: {
    wall: "#7ec8e3",
    wallTrim: "#f2e2b8",
    floor: "#ecd9a6",
    rug: "#36a0c4",
    accent: "#ff7f6b",
  },
  board: {
    surface: "#fbf3df",
    surfaceSpeckle: "#e6d6ad",
    frame: "#e07a5f",
  },
  light: {
    sky: "#bfe9f7",
    ambientIntensity: 1.1,
    key: "#fff4d6",
    keyIntensity: 1.7,
    lamp: "#ffd27a",
  },
  pins: ["#ff7f6b", "#ffd166", "#36a0c4", "#06a77d"],
  papers: [
    { id: "shell", name: "Shell", bg: "#fffaf0", ink: "#8a6240" },
    { id: "wave", name: "Wave", bg: "#cfeef7", ink: "#1f6079" },
    { id: "coral", name: "Coral", bg: "#ffdcd2", ink: "#a8492f" },
    { id: "sunny", name: "Sunny", bg: "#fff0bf", ink: "#7d5c12" },
  ],
  garland: "#ff7f6b",
  decorations: "summer",
  ui: {
    bg: "#1f6079",
    panel: "#2a7a91",
    accent: "#ffd166",
    text: "#eaf6fb",
  },
};
