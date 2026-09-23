import { describe, expect, it } from "vitest";
import {
  canTouchGlass,
  castFor,
  decayMark,
  FORM_BUILD,
  FORMS,
  GHOST_GAP_MAX,
  GHOST_GAP_MIN,
  ghostPose,
  MARK_FADE_SECONDS,
  nextGhostTime,
  PASS_KINDS,
  PASS_MARK,
  PASS_SECONDS,
  pickSighting,
  SHROUD_HALF,
  type GhostForm,
  type PassKind,
} from "@/lib/ghost";

/** Walks a pass frame by frame, the way the component does. */
function frames(kind: PassKind, steps = 200) {
  return Array.from({ length: steps + 1 }, (_, i) => ghostPose(kind, i / steps));
}

/** A cheap deterministic generator, for the weighted picks. */
function seeded(start = 1) {
  let s = start;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

describe("ghostPose", () => {
  it("renders nothing outside the pass", () => {
    for (const kind of PASS_KINDS) {
      expect(ghostPose(kind, -0.01)).toBeNull();
      expect(ghostPose(kind, 1.01)).toBeNull();
      // a window that has never been haunted starts far in the past
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
        expect(Math.abs(pose.y)).toBeLessThanOrEqual(0.12);
      }
    }
  });

  it("starts invisible, so nothing pops in", () => {
    for (const kind of PASS_KINDS) {
      expect(ghostPose(kind, 0)!.opacity).toBeCloseTo(0, 2);
    }
  });

  it("ends invisible too, except the one meant to vanish mid-frame", () => {
    for (const kind of PASS_KINDS) {
      const last = frames(kind).filter(Boolean).at(-1)!;
      if (kind === "press") {
        // gone between frames, which is worse than fading
        expect(ghostPose("press", 1)).toBeNull();
      } else {
        expect(last.opacity).toBeLessThan(0.06);
      }
    }
  });

  it("keeps every pose inside its own limits", () => {
    for (const kind of PASS_KINDS) {
      for (const pose of frames(kind)) {
        if (!pose) continue;
        for (const v of [
          pose.opacity,
          pose.shadow,
          pose.reach,
          pose.press,
          pose.drag,
          pose.z,
        ]) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
        expect(pose.scale).toBeGreaterThan(0.5);
        expect(pose.scale).toBeLessThan(2);
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
        expect(Math.abs(b.z - a.z)).toBeLessThan(0.03);
        expect(Math.abs(b.opacity - a.opacity)).toBeLessThan(0.05);
        expect(Math.abs(b.turn - a.turn)).toBeLessThan(0.05);
        expect(Math.abs(b.reach - a.reach)).toBeLessThan(0.06);
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
    expect(ghostPose("linger", 0.2)!.turn).toBeGreaterThan(0.2);
    expect(ghostPose("linger", 0.8)!.turn).toBeGreaterThan(0.2);
  });

  it("dissolves part way across on a fade", () => {
    const poses = frames("fade").filter(Boolean);
    expect(poses.at(-1)!.x).toBeLessThan(0.35);
    expect(Math.max(...poses.map((p) => p!.opacity))).toBeGreaterThan(0.6);
    expect(poses.at(-1)!.opacity).toBeLessThan(0.05);
  });

  it("presses up to the glass, faces out, then cuts to nothing", () => {
    const held = ghostPose("press", 0.6)!;
    expect(held.z).toBeGreaterThan(0.9);
    expect(held.turn).toBe(0);
    expect(held.scale).toBeGreaterThan(1.2);
    expect(held.opacity).toBeGreaterThan(0.9);
    expect(ghostPose("press", 0.9)).toBeNull();
  });

  it("only reaches on the passes that touch the glass", () => {
    for (const kind of PASS_KINDS) {
      const peak = Math.max(
        ...frames(kind).map((p) => (p ? p.reach : 0))
      );
      if (kind === "hands" || kind === "drag") {
        expect(peak).toBeGreaterThan(0.5);
      } else {
        expect(peak).toBe(0);
      }
    }
  });

  it("puts both palms flat and holds them there", () => {
    const set = ghostPose("hands", 0.55)!;
    expect(set.reach).toBe(1);
    expect(set.press).toBe(1);
    expect(set.z).toBe(1);
    // and lets go before it goes
    expect(ghostPose("hands", 0.97)!.press).toBeLessThan(0.2);
  });

  it("pulls a dragging hand down the glass, and sinks with it", () => {
    const early = ghostPose("drag", 0.25)!;
    const late = ghostPose("drag", 0.68)!;
    expect(late.drag).toBeGreaterThan(early.drag);
    expect(late.reach).toBeLessThan(early.reach);
    expect(late.y).toBeLessThan(early.y);
    expect(late.press).toBe(1);
  });

  it("dims the lamp most when it is closest to the glass", () => {
    const close = Math.max(
      ...frames("press").map((p) => p?.shadow ?? 0),
      ...frames("hands").map((p) => p?.shadow ?? 0)
    );
    const crossing = Math.max(...frames("drift").map((p) => p?.shadow ?? 0));
    expect(close).toBeGreaterThan(crossing);
    // and never blacks the window out entirely
    expect(close).toBeLessThan(0.9);
  });
});

describe("castFor", () => {
  it("gives every window two or three forms to draw from", () => {
    for (let seed = 1; seed < 60; seed++) {
      const cast = castFor(seed);
      expect(cast.length).toBeGreaterThanOrEqual(2);
      expect(cast.length).toBeLessThanOrEqual(FORMS.length);
      expect(new Set(cast).size).toBe(cast.length);
      for (const form of cast) expect(FORMS).toContain(form);
    }
  });

  it("does not give every window the same cast", () => {
    const casts = new Set(
      Array.from({ length: 40 }, (_, i) => castFor(i + 1).join(","))
    );
    expect(casts.size).toBeGreaterThan(2);
  });

  it("is stable for a seed, so a window keeps its own ghosts", () => {
    expect(castFor(4)).toEqual(castFor(4));
  });
});

describe("pickSighting", () => {
  it("only ever picks from this window's cast", () => {
    const cast: GhostForm[] = ["shade", "small"];
    const rand = seeded();
    for (let i = 0; i < 400; i++) {
      const s = pickSighting(cast, rand);
      expect(cast).toContain(s.form);
      expect(PASS_KINDS).toContain(s.kind);
      expect(PASS_SECONDS[s.kind]).toBeGreaterThan(0);
    }
  });

  it("copes with a generator that returns its extremes", () => {
    for (const r of [() => 0, () => 0.999999]) {
      const s = pickSighting([...FORMS], r);
      expect(FORMS).toContain(s.form);
      expect(PASS_KINDS).toContain(s.kind);
    }
    // and with a window that somehow has no cast at all
    expect(FORMS).toContain(pickSighting([], seeded()).form);
  });

  it("keeps the ones that touch the glass to about a quarter of sightings", () => {
    /*
     * Measured across every form, which is what a person actually
     * sees. Two of the five stand too far back to reach the pane, so
     * the weights have to carry that before this lands where it
     * should — adding those forms quietly cut the rate from a quarter
     * to a sixth, which is the sort of thing nobody notices until the
     * feature has stopped happening.
     */
    const counts: Record<string, number> = {};
    const rand = seeded(7);
    const N = 8000;
    for (let i = 0; i < N; i++) {
      const { kind } = pickSighting([...FORMS], rand);
      counts[kind] = (counts[kind] ?? 0) + 1;
    }
    for (const kind of PASS_KINDS) expect(counts[kind]).toBeGreaterThan(0);
    const touching = (counts.press + counts.hands + counts.drag) / N;
    // rare enough to still be worth waiting for
    expect(touching).toBeGreaterThan(0.19);
    expect(touching).toBeLessThan(0.32);
    expect(counts.drift).toBeGreaterThan(counts.hands);
    expect(counts.drag).toBeLessThan(counts.hands);
  });
});

describe("PASS_MARK", () => {
  it("names a mark for every pass, and only the touching ones leave one", () => {
    for (const kind of PASS_KINDS) {
      expect(PASS_MARK[kind]).toBeDefined();
    }
    expect(PASS_MARK.hands).toBe("palms");
    expect(PASS_MARK.drag).toBe("drag");
    expect(PASS_MARK.press).toBe("face");
    for (const kind of ["drift", "linger", "fade"] as const) {
      expect(PASS_MARK[kind]).toBe("none");
    }
  });

  it("only leaves a mark where the pose actually presses", () => {
    for (const kind of PASS_KINDS) {
      const pressed = Math.max(...frames(kind).map((p) => p?.press ?? 0));
      if (PASS_MARK[kind] === "none") expect(pressed).toBe(0);
      else expect(pressed).toBeGreaterThan(0.4);
    }
  });
});

describe("decayMark", () => {
  it("holds at whatever is pressing right now", () => {
    expect(decayMark(0, 1, 1 / 60)).toBe(1);
    expect(decayMark(0.3, 0.8, 1 / 60)).toBe(0.8);
  });

  it("fades off the glass once nothing is holding it", () => {
    let m = 1;
    for (let t = 0; t < MARK_FADE_SECONDS - 0.5; t += 1 / 60) {
      m = decayMark(m, 0, 1 / 60);
      expect(m).toBeGreaterThan(0);
    }
    // gone a touch after its own fade time, and not before
    for (let t = 0; t < 1; t += 1 / 60) m = decayMark(m, 0, 1 / 60);
    expect(m).toBe(0);
  });

  it("outlives the pass that made it", () => {
    expect(MARK_FADE_SECONDS).toBeGreaterThan(PASS_SECONDS.hands);
  });

  it("stays in range whatever it is handed", () => {
    expect(decayMark(0, 0, 10)).toBe(0);
    expect(decayMark(5, 0, 0)).toBe(1);
    expect(decayMark(-2, 0, 0)).toBe(0);
    expect(decayMark(0.5, 2, 0)).toBe(1);
  });
});

describe("nextGhostTime", () => {
  it("books the next sighting a good while off", () => {
    expect(nextGhostTime(100, () => 0)).toBe(100 + GHOST_GAP_MIN);
    expect(nextGhostTime(100, () => 1)).toBe(100 + GHOST_GAP_MAX);
    // long enough that the slowest pass always finishes first
    for (const kind of PASS_KINDS) {
      expect(GHOST_GAP_MIN).toBeGreaterThan(PASS_SECONDS[kind]);
    }
  });
});

describe("FORM_BUILD", () => {
  /** The two window sizes the haunted house actually uses. */
  const PANES = [
    { w: 0.9, h: 1.1 },
    { w: 0.8, h: 0.9 },
  ];
  /** How the component sizes a figure against its pane. */
  const NATURAL = 0.52;

  it("describes every form", () => {
    for (const form of FORMS) {
      const b = FORM_BUILD[form];
      expect(b).toBeDefined();
      expect(b.size).toBeGreaterThan(0.4);
      expect(b.depth).toBeGreaterThanOrEqual(0);
      expect(b.depth).toBeLessThanOrEqual(1);
    }
  });

  it("has some near the glass and some at the back of the room", () => {
    const near = FORMS.filter(canTouchGlass);
    const far = FORMS.filter((f) => !canTouchGlass(f));
    expect(near.length).toBeGreaterThan(1);
    expect(far.length).toBeGreaterThan(1);
  });

  it("makes the set-back ones the big ones", () => {
    // the whole point: something genuinely further away would be
    // smaller, so a figure only reads as deep *and* large if it is
    // built large and hazed back
    const near = FORMS.filter(canTouchGlass).map((f) => FORM_BUILD[f].size);
    const far = FORMS.filter((f) => !canTouchGlass(f)).map(
      (f) => FORM_BUILD[f].size
    );
    expect(Math.min(...far)).toBeGreaterThan(Math.max(...near));
  });

  it("stands the set-back ones higher up the pane", () => {
    for (const form of FORMS) {
      if (canTouchGlass(form)) continue;
      expect(FORM_BUILD[form].drop).toBeLessThanOrEqual(0);
    }
  });

  it("keeps even the biggest form inside the glass", () => {
    // sized off the wrong figure, a tall form walks out over the
    // clapboard, and there is no cheap way to clip it there
    for (const { w, h } of PANES) {
      for (const form of FORMS) {
        const gh = h * NATURAL * FORM_BUILD[form].size;
        const halfWide = gh * SHROUD_HALF;
        expect(halfWide * 1.15).toBeLessThan(w / 2);
        // and tall enough to still be inside the opening
        expect(gh).toBeLessThan(h);
      }
    }
  });
});

describe("pickSighting and depth", () => {
  it("never sends a form at the back of the room to touch the glass", () => {
    // a handprint appearing while the thing that left it stands six
    // feet behind the pane unpicks the one effect this all turns on
    const rand = seeded(11);
    for (const form of FORMS) {
      if (canTouchGlass(form)) continue;
      for (let i = 0; i < 400; i++) {
        const s = pickSighting([form], rand);
        expect(s.form).toBe(form);
        expect(PASS_MARK[s.kind]).toBe("none");
      }
    }
  });

  it("still lets the near ones do everything", () => {
    const rand = seeded(13);
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      seen.add(pickSighting(["gaunt"], rand).kind);
    }
    for (const kind of PASS_KINDS) expect(seen).toContain(kind);
  });

  it("gives a far-only cast a sensible pass every time", () => {
    const far = FORMS.filter((f) => !canTouchGlass(f));
    const rand = seeded(17);
    for (let i = 0; i < 300; i++) {
      const s = pickSighting(far, rand);
      expect(PASS_KINDS).toContain(s.kind);
      expect(PASS_SECONDS[s.kind]).toBeGreaterThan(0);
    }
    // including when the generator returns its extremes
    for (const r of [() => 0, () => 0.999999]) {
      expect(PASS_MARK[pickSighting(far, r).kind]).toBe("none");
    }
  });
});
