import { describe, expect, it } from "vitest";
import {
  buildRevealNotification,
  isStillSecret,
  isSurpriseBoard,
  revealDue,
  validateRevealDate,
} from "../surprise";

const NOW = new Date("2026-06-20T12:00:00Z");

describe("isSurpriseBoard", () => {
  it("is true only when private_to is set", () => {
    expect(isSurpriseBoard({ private_to: "u1" })).toBe(true);
    expect(isSurpriseBoard({ private_to: null })).toBe(false);
    expect(isSurpriseBoard(null)).toBe(false);
  });
});

describe("isStillSecret", () => {
  it("is secret before the reveal moment", () => {
    expect(
      isStillSecret(
        { private_to: "u1", reveal_at: "2026-07-01T08:00:00Z" },
        NOW
      )
    ).toBe(true);
  });

  it("stops being secret once the reveal moment passes", () => {
    expect(
      isStillSecret(
        { private_to: "u1", reveal_at: "2026-06-20T11:00:00Z" },
        NOW
      )
    ).toBe(false);
  });

  it("stays private indefinitely with no date set", () => {
    expect(isStillSecret({ private_to: "u1", reveal_at: null }, NOW)).toBe(
      true
    );
  });

  it("a normal board is never secret", () => {
    expect(isStillSecret({ private_to: null, reveal_at: null }, NOW)).toBe(
      false
    );
  });
});

describe("revealDue", () => {
  const base = {
    private_to: "u1",
    reveal_at: "2026-06-20T11:00:00Z",
    revealed_at: null,
  };

  it("is due once the moment passes and nothing was sent yet", () => {
    expect(revealDue(base, NOW)).toBe(true);
  });

  it("is not due before the moment", () => {
    expect(revealDue({ ...base, reveal_at: "2026-07-01T00:00:00Z" }, NOW)).toBe(
      false
    );
  });

  it("never fires twice", () => {
    expect(
      revealDue({ ...base, revealed_at: "2026-06-20T11:05:00Z" }, NOW)
    ).toBe(false);
  });

  it("never fires for boards without a date or privacy", () => {
    expect(revealDue({ ...base, reveal_at: null }, NOW)).toBe(false);
    expect(revealDue({ ...base, private_to: null }, NOW)).toBe(false);
  });
});

describe("validateRevealDate", () => {
  it("accepts a future moment", () => {
    expect(validateRevealDate("2026-07-19T08:00", NOW)).toBeNull();
  });

  it("rejects the past and nonsense", () => {
    expect(validateRevealDate("2026-01-01T08:00", NOW)).toBeTruthy();
    expect(validateRevealDate("not a date", NOW)).toBeTruthy();
  });
});

describe("buildRevealNotification", () => {
  const board = { id: "b9", title: "Happy Birthday!", reveal_message: null };

  it("uses the personal message when present", () => {
    const n = buildRevealNotification(
      { ...board, reveal_message: "Happy birthday my love 🌹" },
      "Cal"
    );
    expect(n.title).toContain("Cal");
    expect(n.body).toBe("Happy birthday my love 🌹");
    expect(n.url).toBe("/board/b9");
  });

  it("falls back to a sweet default body", () => {
    const n = buildRevealNotification(board, "Cal");
    expect(n.body).toContain("Happy Birthday!");
    expect(n.tag).toBe("reveal-b9");
  });
});
