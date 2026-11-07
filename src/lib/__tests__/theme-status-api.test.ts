import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listThemeStatuses, setThemeStatus } from "../theme-status-api";

/** Awaiting any chain of query-builder calls resolves to `result`. */
function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const proxy: Record<string, unknown> = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "then") {
          return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
            Promise.resolve(result).then(resolve, reject);
        }
        return vi.fn(() => proxy);
      },
    }
  );
  return proxy;
}

describe("theme status (BB-36)", () => {
  const client = (result: Parameters<typeof chain>[0]) =>
    ({ from: vi.fn(() => chain(result)) }) as unknown as SupabaseClient;

  it("lists every theme's status", async () => {
    const rows = [{ theme_id: "cozy-cabin", status: "live" }];
    expect(await listThemeStatuses(client({ data: rows, error: null }))).toEqual(rows);
  });

  it("is null, not an error, when the table can't be read", async () => {
    expect(
      await listThemeStatuses(client({ data: null, error: { message: "no such table" } }))
    ).toBeNull();
    const throwing = {
      from: () => {
        throw new Error("offline");
      },
    } as unknown as SupabaseClient;
    expect(await listThemeStatuses(throwing)).toBeNull();
  });

  it("changes a status through the dev-only route", async () => {
    const fetchMock = vi.fn(async () => new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await setThemeStatus("christmas", "live");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/dev/themes",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ themeId: "christmas", status: "live" }),
      })
    );
    vi.unstubAllGlobals();
  });

  it("throws the route's reason when it refuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ error: "not allowed" }), { status: 403 }))
    );
    await expect(setThemeStatus("christmas", "live")).rejects.toThrow("not allowed");
    vi.unstubAllGlobals();
  });
});
