import type { BoardTheme } from "@/themes/types";

/**
 * Christmas Cabin — colours, papers, pins and room dressing (BB-35).
 *
 * A cabin on a snowy evening: warm wood, holly green and berry red, gold
 * from the fire, and a deep dusk blue through the windows.
 *
 * `decorations`, `wallStyle` and `roomFeature` only matter to the shared
 * indoor room, which this theme doesn't use — it builds its own.
 */
export const palette: BoardTheme = {
  id: "christmas-cabin",
  name: "Christmas Cabin",
  tagline: "fairy lights, a crackling fire and a wall that talks back",
  emoji: "🎄",
  group: "seasonal",
  room: {
    wall: "#9a6a44",
    wallTrim: "#5e3b24",
    floor: "#7a5032",
    rug: "#a32f2f",
    accent: "#2f6b3f",
  },
  board: {
    surface: "#c89d68",
    surfaceSpeckle: "#a98050",
    frame: "#5a3a22",
  },
  light: {
    sky: "#1d2440",
    ambientIntensity: 0.62,
    key: "#ffd6a8",
    keyIntensity: 1.1,
    lamp: "#ff9a4a",
  },
  pins: ["#e0443a", "#2e8b57", "#e8b63a", "#f4f1e8"],
  papers: [
    { id: "snow", name: "Snow", bg: "#fbf8f1", ink: "#2a3a4a" },
    { id: "holly", name: "Holly", bg: "#d6ead2", ink: "#1f4d2c" },
    { id: "berry", name: "Berry", bg: "#f6d0cc", ink: "#7a1f1f" },
    { id: "gold", name: "Gold", bg: "#fbe7a8", ink: "#6b4a14" },
  ],
  garland: "#d93b3b",
  decorations: "cabin",
  ui: {
    bg: "#1c1410",
    panel: "#3a2418",
    accent: "#d94a3a",
    text: "#fff1e0",
  },
};
