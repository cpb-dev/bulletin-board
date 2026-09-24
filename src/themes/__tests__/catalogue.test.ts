import { describe, expect, it } from "vitest";
import { Room } from "@/components/three/Room";
import {
  DEFAULT_THEME_ID,
  getPaper,
  getTheme,
  groupedThemes,
  pinColorFor,
  THEME_GROUPS,
  THEMES,
} from "..";
import { getThemeModule, THEME_MODULES } from "../scenes";

describe("theme catalogue", () => {
  it("has at least six themes with unique ids", () => {
    expect(THEMES.length).toBeGreaterThanOrEqual(6);
    expect(new Set(THEMES.map((t) => t.id)).size).toBe(THEMES.length);
  });

  it("offers every theme, including the two that used to be hidden", () => {
    for (const id of [
      "cozy-cabin",
      "peach-parfait",
      "midnight-picnic",
      "sage-meadow",
      "summer-house",
      "world-cup",
      "rose-picnic",
      "haunted-hollow",
      "beach-hut",
      "stars-hollow",
    ]) {
      expect(
        THEMES.some((t) => t.id === id),
        `${id} should be in the catalogue`
      ).toBe(true);
    }
  });

  it("lists the same themes as the scene registry, in the same order", () => {
    // The palette list and the module list are separate on purpose, so a
    // page wanting colours doesn't pull in nine 3D scenes. This keeps them
    // from drifting apart.
    expect(THEME_MODULES.map((m) => m.palette.id)).toEqual(
      THEMES.map((t) => t.id)
    );
    for (const m of THEME_MODULES) {
      expect(m.palette, `${m.palette.id} shares one palette object`).toBe(
        getTheme(m.palette.id)
      );
    }
  });

  it("gives every outdoor theme its own scene; the rest are the indoor room", () => {
    // A theme that silently fell back to the indoor room would be a very
    // confusing bug, so pin which themes are indoors and which are not.
    const outdoor = [
      "beach-hut",
      "haunted-hollow",
      "world-cup",
      "rose-picnic",
      "stars-hollow",
    ];
    for (const m of THEME_MODULES) {
      expect(m.Scene, `${m.palette.id} needs a scene`).toBeDefined();
      if (outdoor.includes(m.palette.id)) {
        expect(m.Scene, `${m.palette.id} is outdoors`).not.toBe(Room);
      } else {
        expect(m.Scene, `${m.palette.id} is indoors`).toBe(Room);
      }
    }
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

describe("theme groups", () => {
  it("files every theme under a group that exists", () => {
    const ids = THEME_GROUPS.map((g) => g.id);
    for (const theme of THEMES) {
      expect(ids, `${theme.id} names a group that exists`).toContain(
        theme.group
      );
    }
  });

  it("puts the themes in the groups they were designed for", () => {
    const groupOf = (id: string) => getTheme(id).group;
    expect(groupOf("cozy-cabin")).toBe("basic");
    expect(groupOf("peach-parfait")).toBe("basic");
    expect(groupOf("midnight-picnic")).toBe("basic");
    expect(groupOf("sage-meadow")).toBe("basic");
    expect(groupOf("summer-house")).toBe("basic");
    expect(groupOf("world-cup")).toBe("special");
    expect(groupOf("rose-picnic")).toBe("special");
    expect(groupOf("haunted-hollow")).toBe("seasonal");
    expect(groupOf("beach-hut")).toBe("seasonal");
    expect(groupOf("stars-hollow")).toBe("tv");
  });

  it("shows every theme exactly once, in group order", () => {
    const sections = groupedThemes();
    expect(sections.map((s) => s.group.id)).toEqual(["basic", "special", "seasonal", "tv"]);
    const shown = sections.flatMap((s) => s.themes.map((t) => t.id));
    expect(shown.sort()).toEqual(THEMES.map((t) => t.id).sort());
  });
});

describe("getTheme", () => {
  it("returns the requested theme", () => {
    expect(getTheme("midnight-picnic").name).toBe("Midnight Picnic");
  });

  it("falls back to the first theme for unknown / missing ids", () => {
    // Load-bearing: a board archived under a theme id we no longer have
    // still has to render.
    expect(getTheme("does-not-exist")).toBe(THEMES[0]);
    expect(getTheme(null)).toBe(THEMES[0]);
    expect(getTheme(undefined)).toBe(THEMES[0]);
    expect(getThemeModule("does-not-exist")).toBe(THEME_MODULES[0]);
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
