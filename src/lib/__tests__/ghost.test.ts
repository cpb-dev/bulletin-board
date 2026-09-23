import { describe, expect, it } from "vitest";
import {
  GHOST_GAP_MAX,
  GHOST_GAP_MIN,
  ghostPose,
  nextGhostTime,
  PASS_KINDS,
  PASS_SECONDS,
  pickPass,
  type PassKind,
} from "@/lib/ghost";

/** Walks a pass frame by frame, the way the component does. */
function frames(kind: PassKind, steps = 200) {
  return Array.from({ length: steps + 1 }, (_, i) => ghostPose(kind, i / steps));
}

describe("ghostPose", () => {
  it("renders nothing outside the pass", () => {
    for (const kind of PASS_KINDS) {
      expect(ghostPose(kind, -0.01)).toBeNull();
      expect(ghostPose(kind, 1.01)).toBeNull();
      // a window that has never been haunted starts at -Infinity
      expect(ghostPose(kind, NaN)).toBeNull();
    }
  });

  it("never lets a ghost wander onto the wall", () => {
    // there is no cheap way to clip a figure to the glass, so the
    // pose itself has to keep it inside the pane
    for (const kind of PASS_KINDS) {
      for (const pose of frames(kind)) {
        if (!pose) continue;
        expect(Math.abs(pose.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(pose.y)).toBeLessThanOrEqual(0.1);
      }
    }
  });

  it("starts and ends invisible, so nothing pops in", () => {
    for (const kind of PASS_KINDS) {
      expect(ghostPose(kind, 0)!.opacity).toBeCloseTo(0, 2);
    }
    // ...except the one that is meant to vanish between frames
    for (const kind of ["drift", "linger", "fade"] as const) {
      const last = frames(kind).filter(Boolean).at(-1)!;
      expect(last.opacity).toBeLessThan(0.05);
    }
  });

  it("keeps every pose inside its own limits", () => {
    for (const kind of PASS_KINDS) {
      for (const pose of frames(kind)) {
        if (!pose) continue;
        expect(pose.opacity).toBeGreaterThanOrEqual(0);
        expect(pose.opacity).toBeLessThanOrEqual(1);
        expect(pose.shadow).toBeGreaterThanOrEqual(0);
        expect(pose.shadow).toBeLessThanOrEqual(1);
        expect(pose.scale).toBeGreaterThan(0.5);
        expect(pose.scale).toBeLessThan(2);
        expect(pose.z).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("moves smoothly — no pose jumps between frames", () => {
    // a ghost that teleports a tenth of a pane in one frame reads as a
    // dropped frame, not as a haunting
    for (const kind of PASS_KINDS) {
      const poses = frames(kind, 400);
      for (let i = 1; i < poses.length; i++) {
        const a = poses[i - 1];
        const b = poses[i];
        // press ends on a deliberate cut to nothing
        if (!a || !b) continue;
        expect(Math.abs(b.x - a.x)).toBeLessThan(0.03);
        expect(Math.abs(b.z - a.z)).toBeLessThan(0.02);
        expect(Math.abs(b.opacity - a.opacity)).toBeLessThan(0.05);
        expect(Math.abs(b.turn - a.turn)).toBeLessThan(0.05);
      }
    }
  });

  it("crosses the pane on a drift", () => {
    const poses = frames("drift").filter(Boolean);
    expect(poses[0]!.x).toBeCloseTo(-1, 6);
    expect(poses.at(-1)!.x).toBeCloseTo(1, 6);
  });

  it("stops in the middle of a linger and turns to look out", () => {
    const mid = ghostPose("linger", 0.5)!;
    expect(mid.x).toBeCloseTo(0, 6);
    // square to the glass at the halfway point, turned away either side
    expect(Math.abs(mid.turn)).toBeLessThan(0.05);
    expect(ghostPose("linger", 0.2)!.turn).toBeGreaterThan(0.3);
    expect(ghostPose("linger", 0.8)!.turn).toBeGreaterThan(0.3);
  });

  it("dissolves part way across on a fade, rather than reaching the far side", () => {
    const poses = frames("fade").filter(Boolean);
    expect(poses.at(-1)!.x).toBeLessThan(0.35);
    // brightest early, gone by the end
    const peak = Math.max(...poses.map((p) => p!.opacity));
    expect(peak).toBeGreaterThan(0.6);
    expect(poses.at(-1)!.opacity).toBeLessThan(0.05);
  });

  it("presses up to the glass, faces out, then cuts to nothing", () => {
    const held = ghostPose("press", 0.6)!;
    expect(held.z).toBeGreaterThan(0.4);
    expect(held.turn).toBe(0);
    expect(held.scale).toBeGreaterThan(1.2);
    expect(held.opacity).toBeGreaterThan(0.9);
    // no fade out: it is simply not there any more
    expect(ghostPose("press", 0.9)).toBeNull();
    expect(ghostPose("press", 0.86)).toBeNull();
  });

  it("dims the lamp most when it is closest to the glass", () => {
    const press = frames("press").filter(Boolean);
    const drift = frames("drift").filter(Boolean);
    expect(Math.max(...press.map((p) => p!.shadow))).toBeGreaterThan(
      Math.max(...drift.map((p) => p!.shadow))
    );
    // and never blacks the window out entirely
    expect(Math.max(...press.map((p) => p!.shadow))).toBeLessThan(0.9);
  });
});

describe("pickPass", () => {
  it("only ever returns a kind that has a duration", () => {
    for (let i = 0; i < 500; i++) {
      const kind = pickPass(() => i / 500);
      expect(PASS_KINDS).toContain(kind);
      expect(PASS_SECONDS[kind]).toBeGreaterThan(0);
    }
  });

  it("keeps the face at the window rare, and drifting common", () => {
    const counts: Record<string, number> = {};
    let seed = 1;
    const rand = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 4000; i++) {
      const kind = pickPass(rand);
      counts[kind] = (counts[kind] ?? 0) + 1;
    }
    // every kind shows up
    for (const kind of PASS_KINDS) expect(counts[kind]).toBeGreaterThan(0);
    expect(counts.drift).toBeGreaterThan(counts.linger);
    expect(counts.press).toBeLessThan(counts.fade);
    expect(counts.press / 4000).toBeLessThan(0.12);
  });

  it("copes with a generator that returns its extremes", () => {
    expect(PASS_KINDS).toContain(pickPass(() => 0));
    expect(PASS_KINDS).toContain(pickPass(() => 0.999999));
  });
});

describe("nextGhostTime", () => {
  it("books the next sighting a good while off", () => {
    expect(nextGhostTime(100, () => 0)).toBe(100 + GHOST_GAP_MIN);
    expect(nextGhostTime(100, () => 1)).toBe(100 + GHOST_GAP_MAX);
    expect(GHOST_GAP_MIN).toBeGreaterThan(PASS_SECONDS.linger);
  });
});
