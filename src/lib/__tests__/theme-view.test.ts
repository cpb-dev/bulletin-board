import { describe, expect, it } from "vitest";
import {
  displayedThemeId,
  readThemeView,
  secondaryActionFor,
  secondaryThemeOf,
  themeViewKey,
  writeThemeView,
  type ThemeViewStorage,
} from "../theme-view";

function memoryStorage(): ThemeViewStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

const throwing: ThemeViewStorage = {
  getItem: () => {
    throw new Error("SecurityError");
  },
  setItem: () => {
    throw new Error("QuotaExceededError");
  },
};

describe("secondaryThemeOf", () => {
  it("is the board's second theme when it has one", () => {
    expect(
      secondaryThemeOf({ theme: "cozy-cabin", secondary_theme: "haunted-hollow" })
    ).toBe("haunted-hollow");
  });

  it("is null for boards without one, including ones saved before BB-3", () => {
    expect(secondaryThemeOf({ theme: "cozy-cabin", secondary_theme: null })).toBeNull();
    expect(secondaryThemeOf({ theme: "cozy-cabin" })).toBeNull();
    expect(secondaryThemeOf(null)).toBeNull();
  });

  it("ignores a second theme that is the same as the main one", () => {
    expect(
      secondaryThemeOf({ theme: "cozy-cabin", secondary_theme: "cozy-cabin" })
    ).toBeNull();
  });
});

describe("displayedThemeId", () => {
  const paired = { theme: "cozy-cabin", secondary_theme: "haunted-hollow" };

  it("shows the main theme by default", () => {
    expect(displayedThemeId(paired, "primary")).toBe("cozy-cabin");
  });

  it("shows the second theme when this person chose it", () => {
    expect(displayedThemeId(paired, "secondary")).toBe("haunted-hollow");
  });

  it("falls back to the main theme once the second is removed", () => {
    expect(
      displayedThemeId({ theme: "cozy-cabin", secondary_theme: null }, "secondary")
    ).toBe("cozy-cabin");
  });

  it("is undefined with no board yet", () => {
    expect(displayedThemeId(null, "secondary")).toBeUndefined();
  });
});

describe("secondaryActionFor", () => {
  it("offers to add when there's no second theme yet", () => {
    expect(secondaryActionFor({ theme: "cozy-cabin" }, "haunted-hollow")).toBe("add");
  });

  it("offers to remove when holding the current second theme", () => {
    expect(
      secondaryActionFor(
        { theme: "cozy-cabin", secondary_theme: "haunted-hollow" },
        "haunted-hollow"
      )
    ).toBe("remove");
  });

  it("offers to switch when holding another theme while one is set", () => {
    expect(
      secondaryActionFor(
        { theme: "cozy-cabin", secondary_theme: "haunted-hollow" },
        "beach-hut"
      )
    ).toBe("switch");
  });

  it("won't pair the main theme with itself", () => {
    expect(secondaryActionFor({ theme: "cozy-cabin" }, "cozy-cabin")).toBe("main");
  });
});

describe("remembering the choice", () => {
  it("is kept per board", () => {
    const storage = memoryStorage();
    writeThemeView("board-1", "secondary", storage);
    expect(readThemeView("board-1", storage)).toBe("secondary");
    expect(readThemeView("board-2", storage)).toBe("primary");
    expect(storage.data.get(themeViewKey("board-1"))).toBe("secondary");
  });

  it("can be switched back", () => {
    const storage = memoryStorage();
    writeThemeView("board-1", "secondary", storage);
    writeThemeView("board-1", "primary", storage);
    expect(readThemeView("board-1", storage)).toBe("primary");
  });

  it("reads anything unexpected as the main theme", () => {
    const storage = memoryStorage();
    storage.setItem(themeViewKey("board-1"), "sideways");
    expect(readThemeView("board-1", storage)).toBe("primary");
  });

  it("never throws when storage is missing or locked down", () => {
    expect(readThemeView("board-1", null)).toBe("primary");
    expect(readThemeView("board-1", throwing)).toBe("primary");
    expect(() => writeThemeView("board-1", "secondary", throwing)).not.toThrow();
    expect(() => writeThemeView("board-1", "secondary", null)).not.toThrow();
  });
});
