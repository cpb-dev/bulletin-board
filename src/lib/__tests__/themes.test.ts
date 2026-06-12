import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEME_ID,
  getPaper,
  getTheme,
  pinColorFor,
  THEMES,
} from "../themes";

describe("theme catalogue", () => {
  it("has at least four themes with unique ids", () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(4);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
  });

  it("includes the default theme", () => {
    expect(THEMES.some((t) => t.id === DEFAULT_THEME_ID)).toBe(true);
  });

  it("gives every theme paper choices and pins", () => {
    for (const theme of THEMES) {
      expect(theme.papers.length).toBeGreaterThanOrEqual(3);
      expect(theme.pins.length).toBeGreaterThanOrEqual(3);
      expect(
        new Set(theme.papers.map((p) => p.id)).size,
        `${theme.id} paper ids should be unique`
      ).toBe(theme.papers.length);
    }
  });
});

describe("getTheme", () => {
  it("returns the requested theme", () => {
    expect(getTheme("midnight-picnic").name).toBe("Midnight Picnic");
  });

  it("falls back to the first theme for unknown / missing ids", () => {
    expect(getTheme("does-not-exist")).toBe(THEMES[0]);
    expect(getTheme(null)).toBe(THEMES[0]);
    expect(getTheme(undefined)).toBe(THEMES[0]);
  });
});

describe("getPaper", () => {
  it("resolves a paper within the theme", () => {
    const theme = getTheme("cozy-cabin");
    expect(getPaper(theme, "rose").bg).toBe("#ffd9d4");
  });

  it("falls back to the first paper for unknown ids (e.g. after a theme switch)", () => {
    const theme = getTheme("midnight-picnic");
    expect(getPaper(theme, "butter")).toBe(theme.papers[0]);
  });
});

describe("pinColorFor", () => {
  const theme = getTheme("cozy-cabin");

  it("is deterministic for the same item", () => {
    expect(pinColorFor(theme, "abc-123")).toBe(pinColorFor(theme, "abc-123"));
  });

  it("always picks a colour from the theme's palette", () => {
    for (const id of ["a", "zz", "550e8400-e29b-41d4-a716-446655440000"]) {
      expect(theme.pins).toContain(pinColorFor(theme, id));
    }
  });
});
