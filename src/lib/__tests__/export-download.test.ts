import { describe, expect, it } from "vitest";
import { formatBytes, progressLabel } from "../export-download";

describe("formatBytes", () => {
  it("keeps small numbers exact and larger ones readable", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(2048)).toBe("2 kB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.0 MB");
  });
});

describe("progressLabel", () => {
  it("counts the photos once it knows how many there are", () => {
    expect(progressLabel({ stage: "photos", done: 2, total: 5 })).toBe(
      "collecting photos… 2/5"
    );
  });

  it("does not show 0/0 on a board with no photos", () => {
    expect(progressLabel({ stage: "photos", done: 0, total: 0 })).toBe(
      "looking for photos…"
    );
  });

  it("has something to say at every stage", () => {
    for (const stage of ["items", "photos", "viewer", "packing"] as const) {
      expect(progressLabel({ stage })).toMatch(/\S/);
    }
  });
});
