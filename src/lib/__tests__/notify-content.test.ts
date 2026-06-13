import { describe, expect, it } from "vitest";
import { buildNotifyContent } from "../notify-content";

describe("buildNotifyContent", () => {
  it("announces a note with its text", () => {
    const c = buildNotifyContent(
      "items",
      { kind: "note", content: "miss you!" },
      "Kalli"
    );
    expect(c).toMatchObject({
      title: "Kalli left you a note 💌",
      body: "miss you!",
      url: "/board",
    });
  });

  it("truncates very long note bodies", () => {
    const long = "a".repeat(200);
    const c = buildNotifyContent("items", { kind: "note", content: long }, "K");
    expect(c!.body.length).toBeLessThanOrEqual(80);
    expect(c!.body.endsWith("…")).toBe(true);
  });

  it("falls back to a heart for an empty note", () => {
    const c = buildNotifyContent("items", { kind: "note", content: "" }, "K");
    expect(c!.body).toBe("♡");
  });

  it("announces a photo and points at the board", () => {
    const c = buildNotifyContent(
      "items",
      { kind: "photo", content: "us at the beach" },
      "Kalli"
    );
    expect(c).toMatchObject({
      title: "Kalli pinned a photo 📷",
      body: "us at the beach",
      url: "/board",
    });
  });

  it("announces a list item and points at the lists page", () => {
    const c = buildNotifyContent(
      "list_items",
      { content: "oat milk" },
      "Kalli"
    );
    expect(c).toMatchObject({
      title: "Kalli added to a list 📝",
      body: "oat milk",
      url: "/lists",
    });
  });

  it("returns null for tables we don't notify on", () => {
    expect(buildNotifyContent("boards", {}, "K")).toBeNull();
  });
});
