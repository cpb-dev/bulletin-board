import { describe, expect, it } from "vitest";
import {
  draftThemeIds,
  parseStatusChange,
  pickerHiddenIds,
  withThemeStatus,
} from "../theme-status";

const catalogue = ["cozy-cabin", "beach-hut", "christmas"];

describe("draftThemeIds", () => {
  it("treats a theme with no row as under construction", () => {
    const rows = [
      { theme_id: "cozy-cabin", status: "live" },
      { theme_id: "beach-hut", status: "live" },
    ];
    expect(draftThemeIds(rows, catalogue)).toEqual(["christmas"]);
  });

  it("treats a draft row, or anything not 'live', as under construction", () => {
    const rows = [
      { theme_id: "cozy-cabin", status: "live" },
      { theme_id: "beach-hut", status: "draft" },
      { theme_id: "christmas", status: "something-new" },
    ];
    expect(draftThemeIds(rows, catalogue)).toEqual(["beach-hut", "christmas"]);
  });

  it("ignores rows for themes the catalogue doesn't have", () => {
    const rows = catalogue.map((id) => ({ theme_id: id, status: "live" }));
    rows.push({ theme_id: "long-gone", status: "draft" });
    expect(draftThemeIds(rows, catalogue)).toEqual([]);
  });

  it("hides nothing when the table can't be read", () => {
    // Not migrated yet, or offline: the picker behaves as before BB-36.
    expect(draftThemeIds(null, catalogue)).toEqual([]);
  });
});

describe("pickerHiddenIds", () => {
  it("hides the drafts", () => {
    expect(pickerHiddenIds(["beach-hut"], { theme: "cozy-cabin" })).toEqual(
      new Set(["beach-hut"])
    );
  });

  it("never hides a theme the board already uses", () => {
    const hidden = pickerHiddenIds(["cozy-cabin", "beach-hut", "christmas"], {
      theme: "cozy-cabin",
      secondary_theme: "beach-hut",
    });
    expect(hidden).toEqual(new Set(["christmas"]));
  });

  it("works with no board", () => {
    expect(pickerHiddenIds(["christmas"], null)).toEqual(new Set(["christmas"]));
  });
});

describe("withThemeStatus", () => {
  it("adds and removes a theme from the drafts", () => {
    expect(withThemeStatus(["christmas"], "beach-hut", "draft")).toEqual([
      "christmas",
      "beach-hut",
    ]);
    expect(withThemeStatus(["christmas", "beach-hut"], "christmas", "live")).toEqual([
      "beach-hut",
    ]);
  });

  it("never lists a theme twice", () => {
    expect(withThemeStatus(["christmas"], "christmas", "draft")).toEqual(["christmas"]);
  });
});

describe("parseStatusChange", () => {
  it("accepts a known theme and status", () => {
    expect(parseStatusChange({ themeId: "christmas", status: "live" }, catalogue)).toEqual({
      themeId: "christmas",
      status: "live",
    });
  });

  it("rejects unknown themes, statuses and junk", () => {
    expect(parseStatusChange({ themeId: "nope", status: "live" }, catalogue)).toBeNull();
    expect(parseStatusChange({ themeId: "christmas", status: "gone" }, catalogue)).toBeNull();
    expect(parseStatusChange(null, catalogue)).toBeNull();
    expect(parseStatusChange("christmas", catalogue)).toBeNull();
  });
});
