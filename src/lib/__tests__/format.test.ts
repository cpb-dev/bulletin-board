import { describe, expect, it } from "vitest";
import { noteStamp, shortDate } from "../format";

describe("shortDate", () => {
  it("formats an ISO date as day + short month", () => {
    expect(shortDate("2026-06-13T10:00:00Z")).toBe("13 Jun");
  });

  it("returns empty string for missing or invalid input", () => {
    expect(shortDate(null)).toBe("");
    expect(shortDate(undefined)).toBe("");
    expect(shortDate("not a date")).toBe("");
  });
});

describe("noteStamp", () => {
  it("joins name and date with a dot", () => {
    expect(noteStamp("Kalli", "2026-06-13T10:00:00Z")).toBe("Kalli · 13 Jun");
  });

  it("trims the name", () => {
    expect(noteStamp("  Kalli  ", "2026-06-13T10:00:00Z")).toBe(
      "Kalli · 13 Jun"
    );
  });

  it("falls back gracefully when a part is missing", () => {
    expect(noteStamp("Kalli", null)).toBe("Kalli");
    expect(noteStamp(null, "2026-06-13T10:00:00Z")).toBe("13 Jun");
    expect(noteStamp(null, null)).toBe("");
    expect(noteStamp("", undefined)).toBe("");
  });
});
