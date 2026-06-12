/**
 * Board themes.
 *
 * Each theme restyles the whole 3D scene (room, board, lighting,
 * decorations) plus the 2D overlay UI, so switching themes feels like
 * redecorating the room rather than just swapping a colour.
 */

export interface PaperColor {
  id: string;
  name: string;
  bg: string;
  ink: string;
}

export interface BoardTheme {
  id: string;
  name: string;
  tagline: string;
  emoji: string;
  room: {
    wall: string;
    wallTrim: string;
    floor: string;
    rug: string;
    accent: string;
  };
  board: {
    surface: string;
    surfaceSpeckle: string;
    frame: string;
  };
  light: {
    sky: string;
    ambientIntensity: number;
    key: string;
    keyIntensity: number;
    lamp: string;
  };
  /** Pin head colours, cycled per item. */
  pins: string[];
  /** Note paper choices offered in the editor. */
  papers: PaperColor[];
  /** Colour of the fairy-light string draped over the board. */
  garland: string;
  decorations: "cabin" | "cottage" | "night" | "meadow";
  ui: {
    bg: string;
    panel: string;
    accent: string;
    text: string;
  };
}

export const THEMES: BoardTheme[] = [
  {
    id: "cozy-cabin",
    name: "Cozy Cabin",
    tagline: "Warm wood, cork and lamplight",
    emoji: "🪵",
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
    ui: {
      bg: "#2e2017",
      panel: "#473526",
      accent: "#e8a04c",
      text: "#ffeed8",
    },
  },
  {
    id: "peach-parfait",
    name: "Peach Parfait",
    tagline: "Pastel pinks and cream linen",
    emoji: "🍑",
    room: {
      wall: "#ffd9cf",
      wallTrim: "#f5b3a6",
      floor: "#f7e3d4",
      rug: "#ffc3d2",
      accent: "#ff9eb0",
    },
    board: {
      surface: "#fff0e0",
      surfaceSpeckle: "#f3d7bd",
      frame: "#ffffff",
    },
    light: {
      sky: "#fff2ec",
      ambientIntensity: 1.0,
      key: "#fff0e2",
      keyIntensity: 1.3,
      lamp: "#ffc9a8",
    },
    pins: ["#ff8fa3", "#ffc15e", "#8fd0ff", "#c5a3ff"],
    papers: [
      { id: "cream", name: "Cream", bg: "#fffaf0", ink: "#8a5a44" },
      { id: "blush", name: "Blush", bg: "#ffe0e6", ink: "#a04860" },
      { id: "peach", name: "Peach", bg: "#ffe6cf", ink: "#9c5a2e" },
      { id: "lilac", name: "Lilac", bg: "#ecdfff", ink: "#5f4a8a" },
    ],
    garland: "#ff8fa3",
    decorations: "cottage",
    ui: {
      bg: "#fff1ea",
      panel: "#ffffff",
      accent: "#ff7d99",
      text: "#6b4a3f",
    },
  },
  {
    id: "midnight-picnic",
    name: "Midnight Picnic",
    tagline: "Starry skies and fairy lights",
    emoji: "🌙",
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
  },
  {
    id: "sage-meadow",
    name: "Sage Meadow",
    tagline: "Soft greens and daisies",
    emoji: "🌼",
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
  },
];

export const DEFAULT_THEME_ID = "cozy-cabin";

export function getTheme(id: string | null | undefined): BoardTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/** Resolve a paper colour within a theme, falling back gracefully. */
export function getPaper(theme: BoardTheme, paperId: string): PaperColor {
  return theme.papers.find((p) => p.id === paperId) ?? theme.papers[0];
}

/** Deterministic pin colour for an item so it never changes between renders. */
export function pinColorFor(theme: BoardTheme, itemId: string): string {
  let hash = 0;
  for (let i = 0; i < itemId.length; i++) {
    hash = (hash * 31 + itemId.charCodeAt(i)) >>> 0;
  }
  return theme.pins[hash % theme.pins.length];
}
