import type { BoardTheme } from "@/themes/types";

/**
 * Great Hall — colours, papers, pins (BB-38).
 *
 * A great stone hall at Christmas: warm candlelit stone, dark oak, and
 * the deep reds, greens and golds of the banners and the trees.
 *
 * `decorations`, `wallStyle` and `roomFeature` only matter to the shared
 * indoor room, which this theme doesn't use — it builds its own.
 */
export const palette: BoardTheme = {
  id: "great-hall",
  name: "Great Hall",
  tagline: "floating candles, an enchanted ceiling and snow that never lands",
  emoji: "🕯️",
  group: "seasonal",
  room: {
    // Honey sandstone walls, dark oak, worn flagstones, crimson runner.
    wall: "#a8916f",
    wallTrim: "#3a2a1c",
    floor: "#6e6253",
    rug: "#7a1a20",
    accent: "#d9b45a",
  },
  board: {
    surface: "#b58a5c",
    surfaceSpeckle: "#93693f",
    frame: "#3a2616",
  },
  light: {
    sky: "#141a2e",
    ambientIntensity: 0.55,
    key: "#ffd2a0",
    keyIntensity: 1,
    lamp: "#ffb35c",
  },
  pins: ["#d9b45a", "#a8232b", "#2c6e45", "#c9ccd4"],
  papers: [
    { id: "parchment", name: "Parchment", bg: "#f1e3c2", ink: "#3b2a18" },
    { id: "crimson", name: "Crimson", bg: "#efc9c4", ink: "#6e1218" },
    { id: "pine", name: "Pine", bg: "#d3e3d0", ink: "#1d4a2c" },
    { id: "gilt", name: "Gilt", bg: "#f3dc9a", ink: "#5f4210" },
  ],
  garland: "#2c6e45",
  decorations: "cabin",
  ui: {
    bg: "#14110e",
    panel: "#2c2219",
    accent: "#d9b45a",
    text: "#f6ead2",
  },
};
