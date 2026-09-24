import { describe, expect, it } from "vitest";
import { THEMES } from "..";
import type { BoardTheme } from "../types";

/**
 * A drift guard for the one rule that matters most: a board saved under a
 * theme has to keep looking the way it looked when it was saved.
 *
 * Each digest covers every colour, paper, pin and room setting a theme
 * renders with — everything except which picker group it's filed under.
 * These were pinned when the catalogue was split into per-theme folders,
 * and checked identical against the catalogue as it stood before.
 *
 * If one of these fails you have changed how an existing theme looks. That
 * is allowed, but never by accident: change the digest in the same commit,
 * say which theme changed and why, and look at it.
 */
const PINNED: Record<string, string> = {
  "cozy-cabin": "92c42e67",
  "peach-parfait": "1c489d27",
  "midnight-picnic": "2bc280c4",
  "sage-meadow": "47a5aff8",
  "summer-house": "4566caa4",
  "world-cup": "e58c5ddd",
  "rose-picnic": "274b1d3f",
  "haunted-hollow": "74d9e3f1",
  "beach-hut": "5c3c3089",
  // added with the theme, not changed from anything
  "stars-hollow": "73e3bdcb",
};

/** JSON with keys in a fixed order, so reordering a palette isn't "drift". */
function stable(value: unknown): string {
  if (Array.isArray(value)) return "[" + value.map(stable).join(",") + "]";
  if (value && typeof value === "object") {
    const o = value as Record<string, unknown>;
    return (
      "{" +
      Object.keys(o)
        .sort()
        .filter((k) => k !== "group")
        .map((k) => JSON.stringify(k) + ":" + stable(o[k]))
        .join(",") +
      "}"
    );
  }
  return JSON.stringify(value);
}

/** FNV-1a over the stable JSON. */
function digest(theme: BoardTheme): string {
  let h = 0x811c9dc5;
  const s = stable(theme);
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

describe("palette drift", () => {
  it.each(THEMES.map((t) => [t.id, t] as const))(
    "%s looks exactly as it always has",
    (id, theme) => {
      expect(PINNED[id], `${id} has no pinned digest — add one`).toBeDefined();
      expect(digest(theme)).toBe(PINNED[id]);
    }
  );

  it("pins every theme in the catalogue", () => {
    expect(Object.keys(PINNED).sort()).toEqual(THEMES.map((t) => t.id).sort());
  });
});
