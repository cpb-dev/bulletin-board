import { describe, expect, it } from "vitest";
import { subscriptionToRow, urlBase64ToUint8Array } from "../push";

describe("urlBase64ToUint8Array", () => {
  it("decodes a url-safe base64 VAPID key to bytes", () => {
    // "hello" in base64 is aGVsbG8=
    const bytes = urlBase64ToUint8Array("aGVsbG8");
    expect(Array.from(bytes)).toEqual([104, 101, 108, 108, 111]);
  });

  it("handles url-safe characters (- and _)", () => {
    // bytes [251, 255] base64 = "+/8=", url-safe = "-_8"
    const bytes = urlBase64ToUint8Array("-_8");
    expect(Array.from(bytes)).toEqual([251, 255]);
  });
});

describe("subscriptionToRow", () => {
  it("flattens a browser subscription into a storable row", () => {
    const row = subscriptionToRow(
      {
        endpoint: "https://push.example/abc",
        keys: { p256dh: "KEY", auth: "AUTH" },
      },
      "user-1"
    );
    expect(row).toEqual({
      user_id: "user-1",
      endpoint: "https://push.example/abc",
      p256dh: "KEY",
      auth: "AUTH",
    });
  });

  it("returns null when the subscription is missing required keys", () => {
    expect(
      subscriptionToRow({ endpoint: "https://x", keys: {} }, "user-1")
    ).toBeNull();
    expect(subscriptionToRow({ keys: { p256dh: "a", auth: "b" } }, "u")).toBeNull();
    expect(subscriptionToRow({}, "u")).toBeNull();
  });
});
