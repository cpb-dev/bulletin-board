/**
 * The world outside the Christmas Cabin's window (BB-35): the land, where
 * things stand in it, the falling snow, and how it all looks by day,
 * evening and night. Pure, so it's tested without a renderer.
 *
 * The window is a real opening in the back wall. Everything outside is
 * seen through it from the room camera, so placement is worked out by
 * casting rays from the camera through the glass: `throughWindow` says
 * where on the glass a point outside appears, and `alongRay` finds the
 * point outside behind a spot on the glass.
 *
 * From the room camera you look slightly *up* through the window (its
 * sill is just above eye height), so flat ground outside would never be
 * seen. The land behind the cabin rises away instead: a snowy slope up
 * to a ridge, hills beyond, and mountains on the horizon.
 */

import { mulberry32 } from "@/components/three/textures";
import type { DayPhase } from "@/lib/day-cycle";
import { ROOM, ROOM_CAMERA, SNOW_WINDOW } from "./layout";

// ---- the window as a way through the wall --------------------------------

/** The glass, a little way into the wall's thickness. */
export const GLASS_Z = ROOM.backZ - 0.06;
/** The outside face of the wall. */
export const WALL_OUT_Z = ROOM.backZ - 0.2;

export interface V3 {
  x: number;
  y: number;
  z: number;
}

/** A spot on the glass: u across from its left, v up from its bottom. */
export function onGlass(u: number, v: number): V3 {
  const { x, y, width, height } = SNOW_WINDOW;
  return { x: x - width / 2 + u * width, y: y - height / 2 + v * height, z: GLASS_Z };
}

/**
 * Where a point outside appears on the glass from the room camera, as
 * (u, v) — inside the window when both are in 0..1. Null if the point
 * isn't outside.
 */
export function throughWindow(p: V3, from: V3 = ROOM_CAMERA): { u: number; v: number } | null {
  if (p.z >= GLASS_Z) return null;
  const t = (from.z - GLASS_Z) / (from.z - p.z);
  const x = from.x + (p.x - from.x) * t;
  const y = from.y + (p.y - from.y) * t;
  const { width, height } = SNOW_WINDOW;
  return { u: (x - (SNOW_WINDOW.x - width / 2)) / width, v: (y - (SNOW_WINDOW.y - height / 2)) / height };
}

/** The point `depth` metres behind the glass, seen at (u, v) on it. */
export function alongRay(u: number, v: number, depth: number, from: V3 = ROOM_CAMERA): V3 {
  const g = onGlass(u, v);
  const z = GLASS_Z - depth;
  const s = (from.z - z) / (from.z - GLASS_Z);
  return { x: from.x + (g.x - from.x) * s, y: from.y + (g.y - from.y) * s, z };
}

// ---- the land ---------------------------------------------------------------

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/**
 * The height of the snow at (x, z). Flat by the cabin, rising up a slope
 * to a ridge 15–25 m out, then rolling hills beyond. Smooth everywhere,
 * so it's a nice surface to build and a fair one to stand things on.
 */
export function terrainHeight(x: number, z: number): number {
  const d = Math.max(0, WALL_OUT_Z - z);
  const slope = 2.3 * smooth(3, 20, d);
  const hills = 7 * smooth(30, 70, d) * (0.62 + 0.38 * Math.sin(x * 0.06 + 1.3));
  const roll = (0.35 * Math.sin(x * 0.31 + z * 0.17) + 0.25 * Math.sin(x * 0.13 - z * 0.29)) * smooth(4, 14, d);
  return slope + hills + roll;
}

/** The ground's extent: a sheet wide enough for any view through the window. */
export const GROUND = { minX: -95, maxX: 30, minZ: -82, maxZ: WALL_OUT_Z } as const;

// ---- things in the landscape ---------------------------------------------

/** The snowman: on the ridge, a little left of centre through the window. */
export const SNOWMAN = (() => {
  const at = alongRay(0.42, 0, 19);
  return { x: at.x, z: at.z, y: terrainHeight(at.x, at.z), height: 2.0 };
})();

/** A little village of cabins on a hillside, off to the right in the view. */
export const VILLAGE = (() => {
  const centre = alongRay(0.8, 0, 46);
  return { x: centre.x, z: centre.z, spread: 7 };
})();

export interface House {
  x: number;
  z: number;
  y: number;
  w: number;
  d: number;
  h: number;
  rot: number;
}

/** The village's cabins, each sitting on the snow where it stands. */
export function houses(seed = 4): House[] {
  const r = mulberry32(seed);
  const out: House[] = [];
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + r() * 0.5;
    const rad = VILLAGE.spread * (0.3 + r() * 0.7);
    const x = VILLAGE.x + Math.cos(a) * rad;
    const z = VILLAGE.z + Math.sin(a) * rad * 0.6;
    out.push({ x, z, y: terrainHeight(x, z), w: 2.6 + r() * 1.6, d: 2.4 + r() * 1.2, h: 1.8 + r() * 0.8, rot: (r() - 0.5) * 0.8 });
  }
  return out;
}

export interface Pine {
  x: number;
  z: number;
  y: number;
  height: number;
}

/**
 * The pine forest on the hills: scattered more thickly further out,
 * kept off the near slope (they'd fill the window), out of the
 * snowman's patch and the village, and never in front of the snowman.
 * Within 40 m, the middle of the view through the window is kept clear
 * — near trees there loom over everything — so the ridge, the snowman,
 * the village and the far hills show; near trees stand to the sides.
 */
export function forest(seed = 21, count = 170): Pine[] {
  const r = mulberry32(seed);
  const out: Pine[] = [];
  let guard = 0;
  while (out.length < count && guard++ < count * 40) {
    const d = 10 + r() ** 0.7 * 62;
    const z = WALL_OUT_Z - d;
    const x = GROUND.minX + 8 + r() * (GROUND.maxX - GROUND.minX - 16);
    if (Math.hypot(x - SNOWMAN.x, z - SNOWMAN.z) < 6) continue;
    if (Math.hypot(x - VILLAGE.x, z - VILLAGE.z) < VILLAGE.spread + 3) continue;
    const height = 3 + r() * 4.5;
    const p = { x, z, y: terrainHeight(x, z), height };
    if (hidesSnowman(p)) continue;
    if (d < 40 && inViewCorridor(p)) continue;
    out.push(p);
  }
  return out;
}

/** Whether a pine would stand in the middle of the view through the window. */
export function inViewCorridor(p: Pine): boolean {
  const w = throughWindow({ x: p.x, y: p.y + p.height / 2, z: p.z });
  return !!w && w.u > 0.08 && w.u < 0.95;
}

/** Whether a pine stands between the room camera and the snowman. */
export function hidesSnowman(p: Pine): boolean {
  if (p.z <= SNOWMAN.z) return false;
  const a = throughWindow({ x: p.x, y: p.y + p.height / 2, z: p.z });
  const s = throughWindow({ x: SNOWMAN.x, y: SNOWMAN.y + SNOWMAN.height / 2, z: SNOWMAN.z });
  if (!a || !s) return false;
  return Math.abs(a.u - s.u) < 0.18 && Math.abs(a.v - s.v) < 0.6;
}

// ---- snowfall -----------------------------------------------------------------

export const SNOWFALL = { count: 520, nearest: 0.7, deepest: 16 } as const;

/**
 * Flake `i` at time t. Each flake falls at its own pace through the
 * slice of the outdoors seen through the window, at its own depth (more
 * near the glass than far), drifting and fluttering on the breeze, and
 * goes back to the top when it falls out of view.
 */
export function snowFlake(i: number, t: number): V3 {
  const r = mulberry32(7000 + i);
  const depth = SNOWFALL.nearest + r() ** 1.7 * (SNOWFALL.deepest - SNOWFALL.nearest);
  const u = -0.1 + r() * 1.2;
  const speed = 0.45 + r() * 0.5;
  const phase = r() * 100;
  const top = alongRay(u, 1.12, depth);
  const bottom = alongRay(u, -0.12, depth);
  const span = top.y - bottom.y;
  const fallen = (t * speed + phase * span) % span;
  const drift = 0.18 * Math.sin(t * 0.7 + phase) + 0.06 * Math.sin(t * 2.3 + phase * 3);
  return { x: top.x + drift, y: top.y - fallen, z: top.z };
}

// ---- how it looks through the day -------------------------------------

export interface OutdoorLook {
  skyTop: string;
  skyHorizon: string;
  /** Where the sun (by day/evening) or moon (by night) is: a direction. */
  lightDir: [number, number, number];
  lightColor: string;
  lightIntensity: number;
  ambientSky: string;
  ambientGround: string;
  haze: string;
  /** 0..1 */
  stars: number;
  sunDisc: number;
  moonDisc: number;
  clouds: string;
  cloudCover: number;
  snow: string;
  villageLights: number;
  /** The light that spills in through the window onto the floor. */
  windowLight: string;
  windowIntensity: number;
}

const norm = (x: number, y: number, z: number): [number, number, number] => {
  const l = Math.hypot(x, y, z);
  return [x / l, y / l, z / l];
};

/**
 * Day: a low, pale winter sun and a clear blue sky. Evening: the sun on
 * the horizon, the snow gone pink and gold, the village lights coming
 * on. Night: deep blue, a bright moon, stars, and every window lit.
 */
export const LOOKS: Record<DayPhase, OutdoorLook> = {
  day: {
    skyTop: "#5d8fd0",
    skyHorizon: "#dce8f3",
    // Behind the room, over the cabin's roof: lighting the snow from the front.
    lightDir: norm(0.45, 0.55, 0.55),
    lightColor: "#fff3df",
    lightIntensity: 1.05,
    ambientSky: "#aac4e6",
    ambientGround: "#e6eef7",
    haze: "#d8e5f1",
    stars: 0,
    sunDisc: 1,
    moonDisc: 0,
    clouds: "#ffffff",
    cloudCover: 0.45,
    snow: "#ffffff",
    villageLights: 0,
    windowLight: "#dfeaff",
    windowIntensity: 7,
  },
  evening: {
    skyTop: "#2e3570",
    skyHorizon: "#f2a07a",
    lightDir: norm(-0.62, 0.07, -0.78),
    lightColor: "#ffaa6e",
    lightIntensity: 0.95,
    ambientSky: "#8a7fb8",
    ambientGround: "#d6a9b4",
    haze: "#d99f98",
    stars: 0.35,
    sunDisc: 1,
    moonDisc: 0,
    clouds: "#ffc8a8",
    cloudCover: 0.4,
    snow: "#ffe9e6",
    villageLights: 0.85,
    windowLight: "#ffb38a",
    windowIntensity: 3.5,
  },
  night: {
    skyTop: "#050919",
    skyHorizon: "#1c2850",
    // Low, and right where you look out of the window, above the hills.
    lightDir: norm(-0.47, 0.155, -0.87),
    lightColor: "#b9c9ff",
    lightIntensity: 0.42,
    ambientSky: "#2a3a6e",
    ambientGround: "#6c7cb4",
    haze: "#18234a",
    stars: 1,
    sunDisc: 0,
    moonDisc: 1,
    clouds: "#3a4670",
    cloudCover: 0.3,
    snow: "#cfdcff",
    villageLights: 1,
    windowLight: "#8fa8ff",
    windowIntensity: 1.6,
  },
};
