import { describe, expect, it } from "vitest";
import {
  BOOT,
  BOOT_REACH,
  DOUBLE_TAP,
  FIREBOX_BACK_Z,
  FLUE_FRONT_Z,
  LEG_RADIUS,
  SANTA_Z,
  FIRE,
  flicker,
  LINTEL,
  NO_TAPS,
  OPENING,
  registerTap,
  SANTA,
  SANTA_TOTAL,
  santaPose,
  smokePuff,
  SMOKE,
  SOLE_HIDDEN,
  SOLE_LOWEST,
  spark,
  SPARKS,
  stockingOutline,
  stoneCourses,
  THROAT,
} from "../fireplace";
import { FIREPLACE } from "../layout";

/** Walk a function over time and return its samples. */
const walk = <T,>(f: (t: number) => T, from: number, to: number, steps: number) =>
  Array.from({ length: steps + 1 }, (_, i) => f(from + ((to - from) * i) / steps));

describe("the fireplace's shape", () => {
  it("fits its opening, lintel and mantel inside the fireplace", () => {
    expect(OPENING.width).toBeLessThan(FIREPLACE.width - 0.6);
    expect(OPENING.top).toBeLessThan(LINTEL.top);
  });

  it("leaves the throat wide enough for Santa, behind solid masonry", () => {
    // Coming down straight, his toes stay behind the solid block over the
    // opening, and his heels clear the firebox's back wall.
    expect(SANTA_Z + BOOT_REACH).toBeLessThan(FLUE_FRONT_Z);
    expect(SANTA_Z - LEG_RADIUS).toBeGreaterThan(FIREBOX_BACK_Z);
  });

  it("keeps the flames inside the opening", () => {
    expect(FIRE.flameTop).toBeLessThan(OPENING.top - 0.2);
  });
});

describe("flicker", () => {
  const samples = walk(flicker, 0, 60, 6000);

  it("stays in a gentle range around full brightness", () => {
    for (const f of samples) {
      expect(f).toBeGreaterThan(0.7);
      expect(f).toBeLessThan(1.3);
    }
  });

  it("never jumps between frames", () => {
    for (let i = 1; i < samples.length; i++) {
      expect(Math.abs(samples[i] - samples[i - 1])).toBeLessThan(0.05);
    }
  });

  it("actually flickers", () => {
    expect(Math.max(...samples) - Math.min(...samples)).toBeGreaterThan(0.3);
  });
});

describe("sparks", () => {
  it("never leave the fireplace's opening", () => {
    for (let i = 0; i < SPARKS.count; i++)
      for (const s of walk((t) => spark(i, t), 0, 20, 400)) {
        expect(Math.abs(s.x)).toBeLessThan(OPENING.width / 2);
        expect(s.y).toBeGreaterThan(FIRE.y);
        expect(s.y).toBeLessThan(OPENING.top);
        expect(s.glow).toBeGreaterThanOrEqual(0);
        expect(s.glow).toBeLessThanOrEqual(1);
      }
  });

  it("rise, and keep coming", () => {
    const at = (t: number) => Array.from({ length: SPARKS.count }, (_, i) => spark(i, t));
    // At any moment, some sparks are alight.
    for (const t of [0, 1.3, 7.7, 30]) {
      expect(at(t).filter((s) => s.glow > 0.2).length).toBeGreaterThan(3);
    }
  });

  it("are dark when they're reborn at the bottom, so there's no pop", () => {
    // Just before and just after a spark loops, its glow is near zero.
    for (let i = 0; i < SPARKS.count; i++) {
      const glows = walk((t) => spark(i, t).glow, 0, 6, 3000);
      for (let k = 1; k < glows.length; k++) {
        expect(Math.abs(glows[k] - glows[k - 1])).toBeLessThan(0.2);
      }
    }
  });
});

describe("smoke", () => {
  it("rises from the flame tips into the throat", () => {
    for (let i = 0; i < SMOKE.count; i++)
      for (const p of walk((t) => smokePuff(i, t), 0, 12, 300)) {
        expect(p.y).toBeGreaterThanOrEqual(FIRE.flameTop - 0.16);
        expect(p.y).toBeLessThanOrEqual(THROAT.y + 1e-9);
        expect(p.opacity).toBeGreaterThanOrEqual(0);
        expect(p.opacity).toBeLessThan(0.4);
      }
  });

  it("is drawn back towards the flue, and swells, as it climbs", () => {
    // One puff across its whole life: its lowest and highest points.
    const life = walk((t) => smokePuff(0, t), 0, SMOKE.life, 400);
    const lowest = life.reduce((a, b) => (b.y < a.y ? b : a));
    const highest = life.reduce((a, b) => (b.y > a.y ? b : a));
    expect(highest.z).toBeLessThan(lowest.z);
    expect(highest.scale).toBeGreaterThan(lowest.scale);
  });

  it("fades out before it reaches the throat, so it never pops away", () => {
    for (let i = 0; i < SMOKE.count; i++) {
      const top = walk((t) => smokePuff(i, t), 0, SMOKE.life * 2, 2000).filter(
        (p) => p.y > THROAT.y - 0.03
      );
      for (const p of top) expect(p.opacity).toBeLessThan(0.03);
    }
  });
});

describe("double tap", () => {
  it("fires on two taps close together", () => {
    const a = registerTap(NO_TAPS, 10);
    expect(a.double).toBe(false);
    expect(registerTap(a.state, 10 + DOUBLE_TAP - 0.05).double).toBe(true);
  });

  it("doesn't fire on two taps too far apart", () => {
    const a = registerTap(NO_TAPS, 10);
    const b = registerTap(a.state, 10 + DOUBLE_TAP + 0.1);
    expect(b.double).toBe(false);
    // ...but that second tap can start a new pair.
    expect(registerTap(b.state, 10 + DOUBLE_TAP + 0.3).double).toBe(true);
  });

  it("needs a fresh pair after firing: a triple tap fires once", () => {
    const a = registerTap(NO_TAPS, 1);
    const b = registerTap(a.state, 1.2);
    const c = registerTap(b.state, 1.4);
    expect(b.double).toBe(true);
    expect(c.double).toBe(false);
  });

  it("ignores taps while Santa is still out", () => {
    const a = registerTap(NO_TAPS, 1, true);
    expect(registerTap(a.state, 1.2, true).double).toBe(false);
    expect(registerTap(registerTap(NO_TAPS, 1).state, 1.2, true).double).toBe(false);
  });
});

describe("Santa's boots", () => {
  it("are out of sight before and after", () => {
    for (const t of [-1, 0, SANTA_TOTAL, SANTA_TOTAL + 2]) {
      expect(santaPose(t).visible).toBe(false);
    }
  });

  it("start and finish tucked up the chimney, behind the lintel", () => {
    expect(SOLE_HIDDEN).toBeGreaterThan(OPENING.top + 0.04);
    expect(santaPose(0.001).soleY).toBeGreaterThan(OPENING.top);
    expect(santaPose(SANTA_TOTAL - 0.001).soleY).toBeGreaterThan(OPENING.top);
  });

  it("come right down into view", () => {
    const mid = santaPose(SANTA.down + SANTA.dangle / 2);
    expect(mid.visible).toBe(true);
    // The boots and a bit of leg hang below the top of the opening.
    expect(mid.soleY + BOOT.height).toBeLessThan(OPENING.top);
  });

  it("never dip into the fire, however they kick", () => {
    for (const p of walk(santaPose, 0, SANTA_TOTAL, 4000)) {
      expect(p.soleY).toBeGreaterThan(FIRE.flameTop);
      // A kicking leg swings the sole up and out, never further down.
      expect(Math.abs(p.swing[0])).toBeLessThan(0.6);
      expect(Math.abs(p.swing[1])).toBeLessThan(0.6);
    }
    expect(SOLE_LOWEST).toBeGreaterThan(FIRE.flameTop);
  });

  it("move without a jump anywhere, across every phase", () => {
    const poses = walk(santaPose, 0.0001, SANTA_TOTAL - 0.0001, 4000);
    for (let i = 1; i < poses.length; i++) {
      expect(Math.abs(poses[i].soleY - poses[i - 1].soleY)).toBeLessThan(0.01);
      expect(Math.abs(poses[i].swing[0] - poses[i - 1].swing[0])).toBeLessThan(0.02);
      expect(Math.abs(poses[i].swing[1] - poses[i - 1].swing[1])).toBeLessThan(0.02);
    }
  });

  it("really dangle: the legs swing, and not in step", () => {
    const poses = walk(santaPose, SANTA.down, SANTA.down + SANTA.dangle, 800);
    const left = poses.map((p) => p.swing[0]);
    expect(Math.max(...left) - Math.min(...left)).toBeGreaterThan(0.4);
    const apart = poses.filter((p) => Math.abs(p.swing[0] - p.swing[1]) > 0.1).length;
    expect(apart).toBeGreaterThan(poses.length / 4);
  });
});

describe("stone courses", () => {
  const W = 1.5;
  const H = 2.2;
  const stones = stoneCourses(W, H, 5);

  it("stay inside the face", () => {
    for (const s of stones) {
      expect(s.x - s.w / 2).toBeGreaterThanOrEqual(-W / 2 - 1e-9);
      expect(s.x + s.w / 2).toBeLessThanOrEqual(W / 2 + 1e-9);
      expect(s.y - s.h / 2).toBeGreaterThanOrEqual(-1e-9);
      expect(s.y + s.h / 2).toBeLessThanOrEqual(H + 1e-9);
    }
  });

  it("never overlap", () => {
    for (let i = 0; i < stones.length; i++)
      for (let j = i + 1; j < stones.length; j++) {
        const a = stones[i];
        const b = stones[j];
        const ox = Math.abs(a.x - b.x) < (a.w + b.w) / 2 - 1e-9;
        const oy = Math.abs(a.y - b.y) < (a.h + b.h) / 2 - 1e-9;
        expect(ox && oy, `stones ${i} and ${j} overlap`).toBe(false);
      }
  });

  it("cover most of the face, leaving visible mortar joints", () => {
    // Fieldstone this size has wide joints: about a fifth is mortar.
    const area = stones.reduce((s, x) => s + x.w * x.h, 0);
    expect(area / (W * H)).toBeGreaterThan(0.72);
    expect(area / (W * H)).toBeLessThan(0.92);
  });

  it("reach the top of the face, with no bare strip", () => {
    const top = Math.max(...stones.map((s) => s.y + s.h / 2));
    expect(top).toBeGreaterThan(H - 0.03);
  });

  it("aren't all the same size", () => {
    const ws = stones.map((s) => s.w);
    expect(Math.max(...ws) / Math.min(...ws)).toBeGreaterThan(2);
  });
});

describe("the stocking", () => {
  const pts = stockingOutline();

  it("hangs down from its top edge, with the toe pointing out", () => {
    expect(pts[0]).toEqual([0, 0]);
    expect(Math.max(...pts.map((p) => p[1]))).toBe(0);
    const toe = Math.max(...pts.map((p) => p[0]));
    const legWidth = pts[1][0];
    expect(toe).toBeGreaterThan(legWidth * 1.5);
  });
});
