import { describe, expect, it } from "vitest";
import { ALPHABET_WALL, ROOM } from "../layout";
import {
  LEVEL,
  MESSAGES,
  SPELL,
  STRING,
  bulbLevels,
  letterSpots,
  planSpellings,
  spellOut,
  spellingAt,
} from "../letterlights";

describe("alphabet wall layout", () => {
  const spots = letterSpots();

  it("puts every letter A to Z on the wall, once, in order", () => {
    expect(spots.map((s) => s.letter).join("")).toBe("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    spots.forEach((s, i) => expect(s.index).toBe(i));
  });

  it("keeps letters and bulbs inside the painted area", () => {
    const { width, height } = ALPHABET_WALL;
    for (const s of spots) {
      expect(Math.abs(s.x)).toBeLessThan(width / 2);
      expect(Math.abs(s.y)).toBeLessThan(height / 2);
      expect(s.bulbY).toBeLessThan(height / 2);
    }
  });

  it("hangs each bulb clear above its own letter", () => {
    const rowH = ALPHABET_WALL.height / ALPHABET_WALL.rows.length;
    for (const s of spots) {
      const bulbBottom = s.bulbY - STRING.bulbDrop - STRING.bulbLength;
      // The letter's top is about a third of a row above its centre.
      expect(bulbBottom, s.letter).toBeGreaterThan(s.y + rowH * 0.22);
    }
  });

  it("takes up most of the wall between the wainscot and the fairy lights", () => {
    const bottom = ALPHABET_WALL.y - ALPHABET_WALL.height / 2;
    const top = ALPHABET_WALL.y + ALPHABET_WALL.height / 2;
    expect(bottom).toBeGreaterThan(1.1); // wainscot cap
    expect(top).toBeLessThan(ROOM.height - 0.45); // fairy lights' swag
    expect(ALPHABET_WALL.width).toBeGreaterThan(3.5);
    expect(ALPHABET_WALL.z - ALPHABET_WALL.width / 2).toBeGreaterThan(ROOM.backZ + 0.3);
  });
});

describe("messages", () => {
  it("only uses letters on the wall, and spaces", () => {
    for (const m of MESSAGES) expect(m).toMatch(/^[A-Z ]+$/);
    expect(MESSAGES).toContain("MERRY CHRISTMAS");
    expect(MESSAGES).toContain("I LOVE YOU");
  });

  it("lights one bulb per letter, in order, skipping spaces", () => {
    const { letters } = spellOut("I LOVE YOU");
    expect(letters.map((l) => String.fromCharCode(65 + l.index)).join("")).toBe("ILOVEYOU");
    for (let i = 1; i < letters.length; i++) expect(letters[i].at).toBeGreaterThan(letters[i - 1].at);
    // The space is a longer pause.
    expect(letters[1].at - letters[0].at).toBeGreaterThan(letters[2].at - letters[1].at);
  });

  it("starts soon, rests between messages, never repeats one back to back", () => {
    const plan = planSpellings(7, 3600);
    expect(plan[0].start).toBe(SPELL.first);
    for (let i = 1; i < plan.length; i++) {
      const gap = plan[i].start - (plan[i - 1].start + plan[i - 1].duration);
      expect(gap).toBeGreaterThanOrEqual(SPELL.restMin);
      expect(gap).toBeLessThanOrEqual(SPELL.restMax);
      expect(plan[i].message).not.toBe(plan[i - 1].message);
    }
    // Over an hour, all of them come round, the two favourites most.
    const counts = new Map<string, number>();
    for (const s of plan) counts.set(s.message, (counts.get(s.message) ?? 0) + 1);
    expect(counts.size).toBe(MESSAGES.length);
    expect(counts.get("I LOVE YOU")!).toBeGreaterThan(counts.get("JOY")!);
  });

  it("is the same story for the same seed", () => {
    expect(planSpellings(3, 600)).toEqual(planSpellings(3, 600));
  });

  it("finds the message under way", () => {
    const plan = planSpellings(1, 600);
    expect(spellingAt(plan, 0)).toBeNull();
    expect(spellingAt(plan, plan[1].start + 0.5)).toBe(plan[1]);
    expect(spellingAt(plan, plan[1].start - 0.5)).toBeNull();
  });
});

describe("bulb levels", () => {
  const plan = planSpellings(11, 600);
  const s = plan[0];

  it("twinkles every bulb gently while resting", () => {
    const l = bulbLevels(plan, 1);
    for (const v of l) {
      expect(v).toBeGreaterThan(0.3);
      expect(v).toBeLessThan(0.9);
    }
  });

  it("lights only the letter being spelt", () => {
    const first = s.letters[0];
    const l = bulbLevels(plan, s.start + first.at + SPELL.letterOn / 2);
    l.forEach((v, i) => {
      if (i === first.index) expect(v).toBeCloseTo(LEVEL.lit, 2);
      else expect(v).toBeCloseTo(LEVEL.dimmed, 5);
    });
  });

  it("blinks off between two of the same letter (the RR in MERRY)", () => {
    const merry = spellOut("MERRY");
    const [, , r1, r2] = merry.letters;
    expect(r1.index).toBe(r2.index);
    const plan = [{ start: 0, message: "MERRY", ...merry }];
    const between = bulbLevels(plan, r2.at - 0.02)[r1.index];
    expect(between).toBeLessThan(0.3);
  });

  it("never jumps between frames", () => {
    const a = new Float32Array(26);
    const b = new Float32Array(26);
    const dt = 1 / 60;
    let worst = 0;
    // Skip the deliberate flicker; elsewhere nothing should snap.
    for (let t = 0; t < 120; t += dt) {
      const sp = spellingAt(plan, t + dt);
      if (sp && t - sp.start < SPELL.flicker + 0.01) continue;
      bulbLevels(plan, t, a);
      bulbLevels(plan, t + dt, b);
      for (let i = 0; i < 26; i++) {
        const near = sp?.letters.some((l) => l.index === i && t + dt - sp.start - l.at > -dt && t - sp.start - l.at < 0.08);
        if (!near) worst = Math.max(worst, Math.abs(a[i] - b[i]));
      }
    }
    expect(worst).toBeLessThan(0.15);
  });

  it("comes back to twinkling after the chase", () => {
    const after = bulbLevels(plan, s.start + s.duration + 0.01);
    const idle = bulbLevels([], s.start + s.duration + 0.01);
    expect([...after]).toEqual([...idle]);
  });
});
