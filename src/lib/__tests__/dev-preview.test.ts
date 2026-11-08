import { describe, expect, it } from "vitest";
import {
  DEV_PREVIEW_KEY,
  isDevEmail,
  isPreviewing,
  NO_PREVIEW,
  parseDevEmails,
  previewItems,
  previewPhase,
  previewThemeId,
  readDevPreview,
  sampleNotes,
  writeDevPreview,
  type DevPreview,
} from "../dev-preview";
import { getTheme } from "@/themes";
import type { DayCycle } from "../day-cycle";

function memoryStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  return {
    data,
    getItem: (k: string) => (k in data ? data[k] : null),
    setItem: (k: string, v: string) => {
      data[k] = v;
    },
  };
}

const preview = (p: Partial<DevPreview>): DevPreview => ({ ...NO_PREVIEW, ...p });

describe("who is the developer", () => {
  it("parses a comma- or space-separated list, ignoring case", () => {
    expect(parseDevEmails(" Me@Example.com, other@x.io  third@y.dev,,")).toEqual([
      "me@example.com",
      "other@x.io",
      "third@y.dev",
    ]);
    expect(parseDevEmails(undefined)).toEqual([]);
    expect(parseDevEmails("")).toEqual([]);
  });

  it("matches only listed emails", () => {
    expect(isDevEmail("ME@example.com", "me@example.com")).toBe(true);
    expect(isDevEmail("them@example.com", "me@example.com")).toBe(false);
  });

  it("is off with no email or no list", () => {
    expect(isDevEmail(null, "me@example.com")).toBe(false);
    expect(isDevEmail(undefined, "me@example.com")).toBe(false);
    expect(isDevEmail("me@example.com", undefined)).toBe(false);
    expect(isDevEmail("me@example.com", "")).toBe(false);
  });
});

describe("previewThemeId", () => {
  it("shows the previewed theme to the developer", () => {
    expect(previewThemeId("cozy-cabin", preview({ themeId: "beach-hut" }), true)).toBe(
      "beach-hut"
    );
  });

  it("never applies a preview for anyone else", () => {
    expect(previewThemeId("cozy-cabin", preview({ themeId: "beach-hut" }), false)).toBe(
      "cozy-cabin"
    );
  });

  it("shows the real theme with nothing previewed", () => {
    expect(previewThemeId("cozy-cabin", NO_PREVIEW, true)).toBe("cozy-cabin");
    expect(previewThemeId(undefined, NO_PREVIEW, true)).toBeUndefined();
  });
});

describe("previewPhase", () => {
  const three: DayCycle = { phases: 3 };
  const two: DayCycle = { phases: 2 };
  // Midnight in London: night whatever the season.
  const midnight = new Date("2026-11-07T00:00:00Z");
  // Midday in London: day.
  const midday = new Date("2026-11-07T12:00:00Z");

  it("follows the normal rules without an override", () => {
    expect(previewPhase(three, midnight, false, NO_PREVIEW, true)).toBe("night");
    expect(previewPhase(three, midnight, true, NO_PREVIEW, true)).toBe("day");
    expect(previewPhase(undefined, midnight, false, NO_PREVIEW, true)).toBe("day");
  });

  it("pins the developer's chosen phase", () => {
    expect(previewPhase(three, midday, false, preview({ phase: "night" }), true)).toBe(
      "night"
    );
    expect(previewPhase(three, midday, false, preview({ phase: "evening" }), true)).toBe(
      "evening"
    );
  });

  it("lets the developer see a memory at night too", () => {
    expect(previewPhase(three, midday, true, preview({ phase: "night" }), true)).toBe(
      "night"
    );
  });

  it("respects the theme's own cycle", () => {
    // A two-phase theme has no evening; it shows day, as it would live.
    expect(previewPhase(two, midday, false, preview({ phase: "evening" }), true)).toBe(
      "day"
    );
    // A theme with no cycle is always day.
    expect(previewPhase(undefined, midday, false, preview({ phase: "night" }), true)).toBe(
      "day"
    );
  });

  it("ignores an override for anyone else", () => {
    expect(previewPhase(three, midday, false, preview({ phase: "night" }), false)).toBe(
      "day"
    );
    expect(previewPhase(three, midday, true, preview({ phase: "night" }), false)).toBe(
      "day"
    );
  });
});

describe("isPreviewing", () => {
  it("is true when anything is changed", () => {
    expect(isPreviewing(NO_PREVIEW)).toBe(false);
    expect(isPreviewing(preview({ themeId: "beach-hut" }))).toBe(true);
    expect(isPreviewing(preview({ phase: "night" }))).toBe(true);
    expect(isPreviewing(preview({ sampleNotes: true }))).toBe(true);
  });
});

describe("remembering the preview", () => {
  it("round-trips through storage", () => {
    const storage = memoryStorage();
    const p = preview({ themeId: "stars-hollow", phase: "night", sampleNotes: true });
    writeDevPreview(p, storage);
    expect(readDevPreview(storage)).toEqual(p);
  });

  it("reads anything unusable as no preview", () => {
    expect(readDevPreview(null)).toEqual(NO_PREVIEW);
    expect(readDevPreview(memoryStorage())).toEqual(NO_PREVIEW);
    expect(readDevPreview(memoryStorage({ [DEV_PREVIEW_KEY]: "{not json" }))).toEqual(
      NO_PREVIEW
    );
    expect(readDevPreview(memoryStorage({ [DEV_PREVIEW_KEY]: "null" }))).toEqual(NO_PREVIEW);
  });

  it("drops fields with the wrong shape", () => {
    const storage = memoryStorage({
      [DEV_PREVIEW_KEY]: JSON.stringify({ themeId: 4, phase: "dawn", sampleNotes: "yes" }),
    });
    expect(readDevPreview(storage)).toEqual(NO_PREVIEW);
  });

  it("never throws when storage does", () => {
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(readDevPreview(broken)).toEqual(NO_PREVIEW);
    expect(() => writeDevPreview(NO_PREVIEW, broken)).not.toThrow();
  });
});

describe("sampleNotes", () => {
  it("pins every shape plus an old-style note per paper, inside the board", () => {
    const theme = getTheme("cozy-cabin");
    const notes = sampleNotes(theme);
    expect(notes).toHaveLength(6 + theme.papers.length);
    for (const n of notes) {
      expect(n.x).toBeGreaterThanOrEqual(-1);
      expect(n.x).toBeLessThanOrEqual(1);
      expect(theme.papers.map((p) => p.id)).toContain(n.paper);
    }
    // Pre-BB-24 rows have no shape column at all.
    expect(notes.filter((n) => !("shape" in n))).toHaveLength(1 + theme.papers.length);
  });
});

describe("previewItems", () => {
  const items = ["note-1", "photo-2", "note-3"];

  it("draws every item when nothing is previewed", () => {
    expect(previewItems(items, NO_PREVIEW, true)).toBe(items);
  });

  it("shows a preview as a fresh board: none of the board's own items", () => {
    expect(previewItems(items, preview({ themeId: "christmas-cabin" }), true)).toEqual([]);
    expect(previewItems(items, preview({ sampleNotes: true }), true)).toEqual([]);
    expect(previewItems(items, preview({ phase: "night" }), true)).toEqual([]);
  });

  it("never hides anything for someone who isn't the developer", () => {
    expect(previewItems(items, preview({ themeId: "christmas-cabin" }), false)).toBe(items);
  });

  it("hands back the very same empty list every time", () => {
    // A store selector built on this is compared by reference: a fresh
    // [] each call re-renders forever.
    const p = preview({ themeId: "christmas-cabin" });
    expect(previewItems(items, p, true)).toBe(previewItems(["other"], p, true));
  });

  it("hides without touching: the list it was given is unchanged", () => {
    const before = [...items];
    previewItems(items, preview({ themeId: "christmas-cabin" }), true);
    expect(items).toEqual(before);
  });
});
