import { describe, expect, it } from "vitest";
import {
  CRAB_REACTION_DURATION,
  CRAB_REACTIONS,
  pickCrabReaction,
} from "../crab";

describe("crab reactions", () => {
  it("offers more than five distinct reactions", () => {
    expect(CRAB_REACTIONS.length).toBeGreaterThan(5);
    expect(new Set(CRAB_REACTIONS).size).toBe(CRAB_REACTIONS.length);
  });

  it("has a duration for every reaction", () => {
    for (const r of CRAB_REACTIONS) {
      expect(CRAB_REACTION_DURATION[r]).toBeGreaterThan(0);
    }
  });
});

describe("pickCrabReaction", () => {
  it("returns a valid reaction", () => {
    expect(CRAB_REACTIONS).toContain(pickCrabReaction(() => 0.5));
  });

  it("maps the random value across the whole pool", () => {
    expect(pickCrabReaction(() => 0)).toBe(CRAB_REACTIONS[0]);
    expect(pickCrabReaction(() => 0.999)).toBe(
      CRAB_REACTIONS[CRAB_REACTIONS.length - 1]
    );
  });

  it("never repeats the excluded reaction", () => {
    for (let i = 0; i < CRAB_REACTIONS.length * 4; i++) {
      const rand = () => i / (CRAB_REACTIONS.length * 4);
      const r = pickCrabReaction(rand, "hop");
      expect(r).not.toBe("hop");
    }
  });
});
