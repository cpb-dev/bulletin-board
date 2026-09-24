/**
 * How the square looks at each part of the day (BB-21).
 *
 * Every number that changes between day, evening and night lives here,
 * so the scene and its props only ever ask "what's the look?" and never
 * branch on the phase themselves. The day entry is the theme exactly as
 * it shipped (BB-22) — change it and every daytime board changes.
 *
 * Pure data, so it's tested without a renderer.
 */

import type { DayPhase } from "@/lib/day-cycle";

export interface PhaseLook {
  /** Scene clear colour, behind the dome. */
  background: string;
  /** What distant things fade into. */
  fog: { colour: string; near: number; far: number };
  sky: {
    /** Gradient from the zenith (0) down to the horizon (1). */
    stops: [number, string][];
    /** Cloud tops and undersides, as "r, g, b". */
    cloud: string;
    cloudShade: string;
    /** The thin wisps high up. */
    wisp: string;
    /** 0 for no clouds. */
    cloudAlpha: number;
    /** A warm band just above the skyline, if any. */
    horizonGlow: string | null;
    /** How many stars to scatter; 0 for none. */
    stars: number;
    moon: boolean;
    /** How fast the clouds (and stars) drift, in turns per second. */
    drift: number;
  };
  ambient: { colour: string; intensity: number };
  hemisphere: { sky: string; ground: string; intensity: number };
  /** The sun (or moon): where it comes from, its colour and strength. */
  key: { position: [number, number, number]; colour: string; intensity: number };
  /** Multiplies every shop window's glow from within. */
  windowGlow: number;
  /** Street lamp globes' own glow, and its colour. */
  lampGlow: number;
  lampColour: string;
  /** Real light thrown by the lamps nearest the board; 0 for none. */
  lampLight: number;
  /** Warm light on the board's face, so the notes read after dark. */
  boardLight: number;
}

export const LOOKS: Record<DayPhase, PhaseLook> = {
  // A clear autumn afternoon: a low, warm sun from the front left.
  day: {
    background: "#a9c8e4",
    fog: { colour: "#d9e2e6", near: 24, far: 58 },
    sky: {
      stops: [
        [0, "#3f7fc8"],
        [0.45, "#6ea4dc"],
        [0.8, "#a9cbe8"],
        [0.95, "#d4e2ea"],
        [1, "#d9e2e6"],
      ],
      cloud: "255, 255, 255",
      cloudShade: "176, 188, 206",
      wisp: "245, 250, 255",
      cloudAlpha: 0.8,
      horizonGlow: null,
      stars: 0,
      moon: false,
      drift: 0.003,
    },
    ambient: { colour: "#fff3e0", intensity: 0.55 },
    hemisphere: { sky: "#bcd6ee", ground: "#6f6a45", intensity: 0.75 },
    key: { position: [-9, 12, 8], colour: "#ffe3b8", intensity: 1.55 },
    windowGlow: 1,
    lampGlow: 0.25,
    lampColour: "#fff4dc",
    lampLight: 0,
    boardLight: 0,
  },

  // Golden hour sliding into dusk: the sun low in the west behind the
  // shops, the sky going from peach at the skyline to violet overhead,
  // and the first lamps coming on.
  evening: {
    background: "#6d6f9e",
    fog: { colour: "#e8b48e", near: 20, far: 55 },
    sky: {
      stops: [
        [0, "#343f7a"],
        [0.4, "#6a6aa6"],
        [0.72, "#c98aa0"],
        [0.9, "#f1b07e"],
        [1, "#e8b48e"],
      ],
      cloud: "255, 196, 160",
      cloudShade: "150, 110, 140",
      wisp: "255, 214, 190",
      cloudAlpha: 0.7,
      horizonGlow: "255, 170, 90",
      stars: 0,
      moon: false,
      drift: 0.002,
    },
    ambient: { colour: "#ffd8c0", intensity: 0.42 },
    hemisphere: { sky: "#b29ac4", ground: "#5a4632", intensity: 0.6 },
    key: { position: [-14, 4.5, 3], colour: "#ffa865", intensity: 1.25 },
    windowGlow: 2,
    lampGlow: 0.9,
    lampColour: "#ffe2b0",
    lampLight: 0.6,
    boardLight: 0.25,
  },

  // A clear October night: deep blue sky, stars and a moon, moonlight
  // cool from the right, and the square lit by its lamps and the
  // shop windows.
  night: {
    background: "#0c1430",
    fog: { colour: "#141c38", near: 16, far: 52 },
    sky: {
      stops: [
        [0, "#060a1c"],
        [0.5, "#0e1836"],
        [0.85, "#1a2750"],
        [1, "#141c38"],
      ],
      cloud: "90, 104, 140",
      cloudShade: "30, 36, 60",
      wisp: "110, 124, 160",
      cloudAlpha: 0.25,
      horizonGlow: null,
      stars: 420,
      moon: true,
      drift: 0.0006,
    },
    ambient: { colour: "#8fa2d8", intensity: 0.16 },
    hemisphere: { sky: "#3a4c80", ground: "#1a1a22", intensity: 0.3 },
    key: { position: [10, 14, 6], colour: "#b8c8ff", intensity: 0.45 },
    windowGlow: 3.2,
    lampGlow: 2.2,
    lampColour: "#ffd89a",
    lampLight: 1,
    boardLight: 0.55,
  },
};
