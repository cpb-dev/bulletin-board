import { describe, expect, it } from "vitest";
import { keyboardInset } from "../use-keyboard-inset";

describe("keyboardInset", () => {
  it("is zero when the visual viewport fills the layout viewport", () => {
    expect(keyboardInset(800, 800, 0)).toBe(0);
  });

  it("equals the height the keyboard covers", () => {
    // 800px layout, keyboard shrinks visible area to 500px
    expect(keyboardInset(800, 500, 0)).toBe(300);
  });

  it("accounts for the viewport being scrolled up under the keyboard", () => {
    expect(keyboardInset(800, 500, 50)).toBe(250);
  });

  it("never goes negative", () => {
    expect(keyboardInset(800, 900, 0)).toBe(0);
  });
});
