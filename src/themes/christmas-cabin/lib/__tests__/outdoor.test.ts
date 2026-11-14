import { describe, expect, it } from "vitest";
import { ROOM_CAMERA, SNOW_WINDOW } from "../layout";
import {
  alongRay,
  forest,
  GLASS_Z,
  inViewCorridor,
  GROUND,
  hidesSnowman,
  houses,
  LOOKS,
  onGlass,
  SNOWFALL,
  snowFlake,
  SNOWMAN,
  terrainHeight,
  throughWindow,
  VILLAGE,
  WALL_OUT_Z,
} from "../outdoor";

const inWindow = (p: { x: number; y: number; z: number }) => {
  const w = throughWindow(p);
  return !!w && w.u > 0 && w.u < 1 && w.v > 0 && w.v < 1;
};

describe("looking through the window", () => {
  it("round-trips: a point along a ray appears where the ray left the glass", () => {
    for (const [u, v, d] of [
      [0.2, 0.3, 5],
      [0.7, 0.9, 40],
      [0.5, 0.5, 1],
    ]) {
      const w = throughWindow(alongRay(u, v, d))!;
      expect(w.u).toBeCloseTo(u, 9);
      expect(w.v).toBeCloseTo(v, 9);
    }
  });

  it("puts the corners of the glass at the corners of the window", () => {
    const g = onGlass(0, 0);
    expect(g.x).toBeCloseTo(SNOW_WINDOW.x - SNOW_WINDOW.width / 2);
    expect(g.y).toBeCloseTo(SNOW_WINDOW.y - SNOW_WINDOW.height / 2);
    expect(g.z).toBe(GLASS_Z);
  });

  it("looks slightly up through the window: why the land must rise", () => {
    expect(onGlass(0.5, 0).y).toBeGreaterThan(ROOM_CAMERA.y);
  });
});

describe("the land", () => {
  it("is low by the cabin and rises away to a ridge and hills", () => {
    expect(terrainHeight(-3.5, WALL_OUT_Z - 1)).toBeLessThan(0.3);
    expect(terrainHeight(-10, WALL_OUT_Z - 20)).toBeGreaterThan(1.5);
    expect(terrainHeight(-30, WALL_OUT_Z - 70)).toBeGreaterThan(4);
  });

  it("is smooth: no step between neighbouring points", () => {
    for (let x = GROUND.minX; x < GROUND.maxX; x += 3.1)
      for (let z = GROUND.minZ; z < GROUND.maxZ; z += 2.7) {
        expect(Math.abs(terrainHeight(x + 0.1, z) - terrainHeight(x, z))).toBeLessThan(0.1);
        expect(Math.abs(terrainHeight(x, z + 0.1) - terrainHeight(x, z))).toBeLessThan(0.1);
      }
  });

  it("is seen through the bottom of the window, all the way across", () => {
    // Along the bottom edge of the glass, the ray meets rising snow before
    // it runs out of ground: snow fills the lower panes, not sky.
    for (const u of [0.05, 0.5, 0.95]) {
      let hit = false;
      for (let d = 1; d < 75 && !hit; d += 0.5) {
        const p = alongRay(u, 0.05, d);
        if (p.y <= terrainHeight(p.x, p.z)) hit = true;
      }
      expect(hit, `u=${u}`).toBe(true);
    }
  });
});

describe("the snowman", () => {
  it("stands on the snow, out on the ridge", () => {
    expect(SNOWMAN.y).toBeCloseTo(terrainHeight(SNOWMAN.x, SNOWMAN.z), 9);
    expect(WALL_OUT_Z - SNOWMAN.z).toBeGreaterThan(12);
  });

  it("is seen whole through the window, base to hat", () => {
    expect(inWindow({ x: SNOWMAN.x, y: SNOWMAN.y + 0.05, z: SNOWMAN.z })).toBe(true);
    expect(inWindow({ x: SNOWMAN.x, y: SNOWMAN.y + SNOWMAN.height, z: SNOWMAN.z })).toBe(true);
  });

  it("isn't hidden by the land in front of it", () => {
    // Sample the sight line to the snowman's middle: it stays above the snow.
    const mid = { x: SNOWMAN.x, y: SNOWMAN.y + SNOWMAN.height * 0.4, z: SNOWMAN.z };
    for (let k = 1; k < 40; k++) {
      const t = k / 40;
      const g = onGlass(throughWindow(mid)!.u, throughWindow(mid)!.v);
      const p = { x: g.x + (mid.x - g.x) * t, y: g.y + (mid.y - g.y) * t, z: g.z + (mid.z - g.z) * t };
      expect(p.y).toBeGreaterThan(terrainHeight(p.x, p.z));
    }
  });

  it("isn't hidden by a tree", () => {
    for (const p of forest()) expect(hidesSnowman(p)).toBe(false);
  });
});

describe("the village and the forest", () => {
  it("has its cabins in view, standing on the snow", () => {
    const hs = houses();
    expect(hs.length).toBeGreaterThanOrEqual(5);
    for (const h of hs) expect(h.y).toBeCloseTo(terrainHeight(h.x, h.z), 9);
    expect(hs.filter((h) => inWindow({ x: h.x, y: h.y + h.h, z: h.z })).length).toBeGreaterThanOrEqual(3);
    expect(inWindow({ x: VILLAGE.x, y: terrainHeight(VILLAGE.x, VILLAGE.z) + 2, z: VILLAGE.z })).toBe(true);
  });

  it("keeps near trees out of the middle of the view", () => {
    for (const t of forest()) {
      if (WALL_OUT_Z - t.z < 40) expect(inViewCorridor(t)).toBe(false);
    }
  });

  it("puts the moon where you can see it through the window at night", () => {
    const [x, y, z] = LOOKS.night.lightDir;
    const far = { x: ROOM_CAMERA.x + x * 90, y: ROOM_CAMERA.y + y * 90, z: ROOM_CAMERA.z + z * 90 };
    const w = throughWindow(far)!;
    expect(w.u).toBeGreaterThan(0.1);
    expect(w.u).toBeLessThan(0.9);
    // High in the window, clear of the hills and mountains below it.
    expect(w.v).toBeGreaterThan(0.6);
    expect(w.v).toBeLessThan(0.97);
  });

  it("plants a good forest, but none near the window or on the ground's edge", () => {
    const trees = forest();
    expect(trees.length).toBeGreaterThan(120);
    for (const t of trees) {
      expect(WALL_OUT_Z - t.z).toBeGreaterThan(9);
      expect(t.x).toBeGreaterThan(GROUND.minX);
      expect(t.x).toBeLessThan(GROUND.maxX);
      expect(t.z).toBeGreaterThan(GROUND.minZ);
    }
    expect(trees.filter((t) => inWindow({ x: t.x, y: t.y + t.height / 2, z: t.z })).length).toBeGreaterThan(15);
  });
});

describe("snowfall", () => {
  it("falls only outside, and only where it can be seen", () => {
    for (let i = 0; i < SNOWFALL.count; i += 7)
      for (const t of [0, 3.3, 17, 60]) {
        const f = snowFlake(i, t);
        expect(f.z).toBeLessThan(GLASS_Z);
        const w = throughWindow(f)!;
        expect(w.u).toBeGreaterThan(-0.4);
        expect(w.u).toBeLessThan(1.4);
        expect(w.v).toBeGreaterThan(-0.2);
        expect(w.v).toBeLessThan(1.2);
      }
  });

  it("keeps falling, gently", () => {
    for (let i = 0; i < 50; i++) {
      let wraps = 0;
      for (let t = 0; t < 30; t += 1 / 30) {
        const dy = snowFlake(i, t + 1 / 30).y - snowFlake(i, t).y;
        if (dy > 0) wraps++;
        else expect(-dy).toBeLessThan(0.06);
      }
      // Back to the top now and then — a near flake crosses its short
      // slice of the view in a couple of seconds — but not every frame.
      expect(wraps).toBeLessThan(25);
    }
  });

  it("is thicker near the glass than far off", () => {
    const depths = Array.from({ length: SNOWFALL.count }, (_, i) => GLASS_Z - snowFlake(i, 0).z);
    const near = depths.filter((d) => d < SNOWFALL.deepest / 2).length;
    expect(near).toBeGreaterThan(depths.length * 0.6);
  });
});

describe("the looks", () => {
  it("lights the day brightest and the night darkest", () => {
    expect(LOOKS.day.lightIntensity).toBeGreaterThan(LOOKS.evening.lightIntensity);
    expect(LOOKS.evening.lightIntensity).toBeGreaterThan(LOOKS.night.lightIntensity);
  });

  it("has stars and village lights only once the sun's low or gone", () => {
    expect(LOOKS.day.stars).toBe(0);
    expect(LOOKS.day.villageLights).toBe(0);
    expect(LOOKS.night.stars).toBe(1);
    expect(LOOKS.night.villageLights).toBe(1);
  });

  it("keeps the sun and moon above the horizon", () => {
    for (const look of Object.values(LOOKS)) expect(look.lightDir[1]).toBeGreaterThan(0);
  });
});
