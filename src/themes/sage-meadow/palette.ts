import type { BoardTheme } from "@/themes/types";

/** Sage Meadow — colours, papers, pins and room dressing. */
export const palette: BoardTheme = {
  id: "sage-meadow",
  name: "Sage Meadow",
  tagline: "Soft greens and daisies",
  emoji: "🌼",
  group: "basic",
  room: {
    wall: "#dcead2",
    wallTrim: "#b5cda3",
    floor: "#cbb98f",
    rug: "#a8c79a",
    accent: "#f5d76e",
  },
  board: {
    surface: "#e9e2c8",
    surfaceSpeckle: "#d4c9a4",
    frame: "#8aa873",
  },
  light: {
    sky: "#f3fbe9",
    ambientIntensity: 0.95,
    key: "#fdf6d8",
    keyIntensity: 1.4,
    lamp: "#ffe08a",
  },
  pins: ["#7da963", "#f5d76e", "#e98f6a", "#9db8e8"],
  papers: [
    { id: "daisy", name: "Daisy", bg: "#fffdf2", ink: "#5c5a3a" },
    { id: "sage", name: "Sage", bg: "#e4f0d8", ink: "#48603a" },
    { id: "honey", name: "Honey", bg: "#fdeebc", ink: "#7a6020" },
    { id: "cornflower", name: "Cornflower", bg: "#dde8fb", ink: "#3c5378" },
  ],
  garland: "#f5d76e",
  decorations: "meadow",
  ui: {
    bg: "#ecf3e2",
    panel: "#ffffff",
    accent: "#7da963",
    text: "#42513a",
  },
};
