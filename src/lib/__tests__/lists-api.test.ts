import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  addListItem,
  createList,
  listProgress,
  nextPosition,
  setListStatus,
} from "../lists-api";
import type { ListItem } from "../types";

// Chainable supabase-js mock (same approach as api.test.ts).
function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const proxy: Record<string, unknown> = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "then") {
          return (
            resolve: (v: unknown) => unknown,
            reject: (e: unknown) => unknown
          ) => Promise.resolve(result).then(resolve, reject);
        }
        return vi.fn(() => proxy);
      },
    }
  );
  return proxy;
}

function mockSupabase(results: ReturnType<typeof chain>[]) {
  const from = vi.fn();
  for (const r of results) from.mockReturnValueOnce(r);
  return { client: { from } as unknown as SupabaseClient, from };
}

function makeItem(overrides: Partial<ListItem> = {}): ListItem {
  return {
    id: "li-1",
    list_id: "l1",
    content: "milk",
    done: false,
    position: 0,
    created_by: "u1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("listProgress", () => {
  it("is 0 for an empty list", () => {
    expect(listProgress([])).toBe(0);
  });

  it("is the fraction of done items", () => {
    expect(
      listProgress([
        makeItem({ done: true }),
        makeItem({ id: "li-2", done: false }),
      ])
    ).toBe(0.5);
  });

  it("is 1 when everything is ticked", () => {
    expect(listProgress([makeItem({ done: true })])).toBe(1);
  });
});

describe("nextPosition", () => {
  it("starts at 0 for an empty list", () => {
    expect(nextPosition([])).toBe(0);
  });

  it("appends after the highest position", () => {
    expect(nextPosition([{ position: 0 }, { position: 4 }, { position: 2 }])).toBe(
      5
    );
  });
});

describe("createList", () => {
  it("defaults a blank title to 'Our list'", async () => {
    const inserted = chain({ data: { id: "l1", title: "Our list" }, error: null });
    const { client } = mockSupabase([inserted]);
    const result = await createList(client, "   ");
    expect(result.title).toBe("Our list");
  });

  it("surfaces errors", async () => {
    const { client } = mockSupabase([
      chain({ data: null, error: { message: "nope" } }),
    ]);
    await expect(createList(client, "Shopping")).rejects.toThrow("nope");
  });
});

describe("addListItem", () => {
  it("returns the inserted item", async () => {
    const item = makeItem({ content: "eggs", position: 3 });
    const { client } = mockSupabase([chain({ data: item, error: null })]);
    await expect(addListItem(client, "l1", "eggs", 3)).resolves.toEqual(item);
  });
});

describe("setListStatus", () => {
  it("does not throw on success", async () => {
    const { client } = mockSupabase([chain({ data: null, error: null })]);
    await expect(
      setListStatus(client, "l1", "archived")
    ).resolves.toBeUndefined();
  });

  it("throws a friendly error on failure", async () => {
    const { client } = mockSupabase([
      chain({ data: null, error: { message: "" } }),
    ]);
    await expect(setListStatus(client, "l1", "active")).rejects.toThrow(
      "Could not update that list."
    );
  });
});
