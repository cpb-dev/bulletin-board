import { describe, expect, it } from "vitest";
import type { DayPhase } from "@/lib/day-cycle";
import { SNOW_WINDOW } from "../layout";
import { GLASS_Z, throughWindow } from "../outdoor";
import {
  bird,
  DURATION,
  eventAt,
  OUTSIDE_SILL,
  scheduleEvents,
  shootingStar,
  sleigh,
  snowball,
  SNOWBALL_FLIGHT,
  snowballTarget,
  TIMING,
  WEIGHTS,
} from "../events";

const PHASES: DayPhase[] = ["day", "evening", "night"];
const steps = (n: number) => Array.from({ length: n + 1 }, (_, i) => i / n);

describe("the schedule", () => {
  it("starts soon after load, then leaves a pause between events", () => {
    for (const phase of PHASES) {
      const s = scheduleEvents(phase, 7, 3600);
      expect(s[0].start).toBeGreaterThanOrEqual(TIMING.firstMin);
      expect(s[0].start).toBeLessThanOrEqual(TIMING.firstMax);
      for (let i = 1; i < s.length; i++) {
        const gap = s[i].start - (s[i - 1].start + s[i - 1].duration);
        expect(gap).toBeGreaterThanOrEqual(TIMING.gapMin);
        expect(gap).toBeLessThanOrEqual(TIMING.gapMax);
      }
    }
  });

  it("only brings what fits the time of day", () => {
    for (const phase of PHASES)
      for (const e of scheduleEvents(phase, 11, 7200)) expect(WEIGHTS[phase][e.kind]).toBeGreaterThan(0);
    // No shooting stars or sleighs by day, no birds at night.
    expect(scheduleEvents("day", 3, 7200).some((e) => e.kind === "sleigh" || e.kind === "shootingStar")).toBe(false);
    expect(scheduleEvents("night", 3, 7200).some((e) => e.kind === "bird")).toBe(false);
  });

  it("brings every event its phase allows, over an evening", () => {
    const kinds = new Set(scheduleEvents("evening", 5, 7200).map((e) => e.kind));
    expect(kinds).toEqual(new Set(Object.keys(WEIGHTS.evening)));
  });

  it("is the same every time for the same seed, and differs between seeds", () => {
    expect(scheduleEvents("night", 9, 600)).toEqual(scheduleEvents("night", 9, 600));
    expect(scheduleEvents("night", 9, 600)).not.toEqual(scheduleEvents("night", 10, 600));
  });

  it("finds the event under way, and nothing between them", () => {
    const s = scheduleEvents("day", 2, 600);
    const e = s[1];
    expect(eventAt(s, e.start + e.duration / 2)?.event).toBe(e);
    expect(eventAt(s, e.start + e.duration / 2)?.p).toBeCloseTo(0.5);
    expect(eventAt(s, e.start - 1)).toBeNull();
    expect(eventAt(s, 0)).toBeNull();
  });
});

describe("the snowball", () => {
  it("flies from outside and lands exactly on its spot on the glass", () => {
    const seed = 42;
    const t = snowballTarget(seed);
    for (const p of steps(200).map((q) => q * SNOWBALL_FLIGHT * 0.999)) {
      const b = snowball(p, seed).ball!;
      expect(b.z).toBeLessThan(GLASS_Z);
    }
    const last = snowball(SNOWBALL_FLIGHT * 0.9999, seed).ball!;
    const w = throughWindow(last)!;
    expect(w.u).toBeCloseTo(t.u, 1);
    expect(w.v).toBeCloseTo(t.v, 1);
  });

  it("is in view through the window as it comes in", () => {
    const mid = snowball(SNOWBALL_FLIGHT * 0.6, 42).ball!;
    const w = throughWindow(mid)!;
    expect(w.u).toBeGreaterThan(-0.2);
    expect(w.u).toBeLessThan(1.2);
    expect(w.v).toBeGreaterThan(0);
    expect(w.v).toBeLessThan(1.3);
  });

  it("splats on the glass, clear of the frame", () => {
    for (let seed = 0; seed < 50; seed++) {
      const { u, v } = snowballTarget(seed);
      expect(u).toBeGreaterThan(0.15);
      expect(u).toBeLessThan(0.85);
      expect(v).toBeGreaterThan(0.25);
      expect(v).toBeLessThan(0.85);
    }
    const s = snowball(0.3, 42);
    expect(s.ball).toBeNull();
    expect(s.splat!.opacity).toBe(1);
  });

  it("melts away by the end, sliding down a touch, without a jump", () => {
    expect(snowball(0.9999, 42).splat!.opacity).toBeLessThan(0.01);
    expect(snowball(0.9999, 42).splat!.slide).toBeGreaterThan(0.05);
    let last = 1;
    for (const p of steps(400).filter((q) => q > SNOWBALL_FLIGHT + 0.05)) {
      const o = snowball(p, 42).splat!.opacity;
      expect(o).toBeLessThanOrEqual(last + 1e-9);
      expect(last - o).toBeLessThan(0.05);
      last = o;
    }
  });
});

describe("the cardinal", () => {
  it("lands on the outside sill, never inside the glass", () => {
    for (const p of steps(400)) {
      const b = bird(p, 5);
      expect(b.pos.z).toBeLessThan(GLASS_Z);
      expect(b.pos.y).toBeGreaterThanOrEqual(OUTSIDE_SILL.y - 1e-9);
    }
    // Sitting still (before its hop along the sill).
    const perched = bird(0.3, 5);
    expect(perched.pos.y).toBeCloseTo(OUTSIDE_SILL.y, 2);
    expect(perched.wings).toBe(0);
  });

  it("perches within the window, and comes and goes from beyond it", () => {
    const perched = bird(0.3, 5).pos.x;
    expect(Math.abs(perched - SNOW_WINDOW.x)).toBeLessThan(SNOW_WINDOW.width / 2 - 0.1);
    expect(Math.abs(bird(0, 5).pos.x - SNOW_WINDOW.x)).toBeGreaterThan(SNOW_WINDOW.width / 2);
    expect(Math.abs(bird(1, 5).pos.x - SNOW_WINDOW.x)).toBeGreaterThan(SNOW_WINDOW.width / 2);
  });

  it("moves without a jump", () => {
    const poses = steps(800).map((p) => bird(p, 5).pos);
    for (let i = 1; i < poses.length; i++) {
      const d = Math.hypot(poses[i].x - poses[i - 1].x, poses[i].y - poses[i - 1].y);
      expect(d).toBeLessThan(0.05);
    }
  });
});

describe("the sleigh and the shooting star", () => {
  it("cross the sky through the window", () => {
    const mid = throughWindow(sleigh(0.5, 3).pos)!;
    expect(mid.u).toBeGreaterThan(0.2);
    expect(mid.u).toBeLessThan(0.8);
    expect(mid.v).toBeGreaterThan(0.6);
    expect(mid.v).toBeLessThan(1);
    // ...entering and leaving from beyond the frame, so it never pops in.
    expect(Math.min(throughWindow(sleigh(0, 3).pos)!.u, throughWindow(sleigh(1, 3).pos)!.u)).toBeLessThan(0);
  });

  it("streak a shooting star across the upper sky, fading in and out", () => {
    const s = shootingStar(0.5, 8);
    const w = throughWindow(s.head)!;
    expect(w.v).toBeGreaterThan(0.55);
    expect(shootingStar(0, 8).glow).toBeCloseTo(0);
    expect(shootingStar(1, 8).glow).toBeCloseTo(0);
    expect(s.glow).toBeGreaterThan(0.9);
  });

  it("have the durations the scheduler uses", () => {
    expect(DURATION.shootingStar).toBeLessThan(DURATION.sleigh);
  });
});
