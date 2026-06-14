import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  archiveBoard,
  archiveBoardAndStartFresh,
  createAdditionalBoard,
  createNote,
  deleteItem,
  exportBoard,
  getPrimaryBoard,
  listActiveBoards,
  photoStoragePath,
  renameBoard,
  updateBoardTheme,
} from "../api";
import type { Board } from "../types";

/**
 * Minimal chainable mock of the supabase-js query builder: every
 * method returns the chain, and awaiting it resolves to `result`.
 */
function chain(result: { data?: unknown; error?: { message: string } | null }) {
  const target: Record<string, unknown> = {};
  const proxy: Record<string, unknown> = new Proxy(target, {
    get(_t, prop) {
      if (prop === "then") {
        return (
          resolve: (v: unknown) => unknown,
          reject: (e: unknown) => unknown
        ) => Promise.resolve(result).then(resolve, reject);
      }
      return vi.fn(() => proxy);
    },
  });
  return proxy;
}

function mockSupabase(fromResults: ReturnType<typeof chain>[]) {
  const from = vi.fn();
  for (const r of fromResults) from.mockReturnValueOnce(r);
  const storageRemove = vi.fn(async () => ({ data: null, error: null }));
  return {
    client: {
      from,
      storage: { from: vi.fn(() => ({ remove: storageRemove })) },
    } as unknown as SupabaseClient,
    from,
    storageRemove,
  };
}

const board: Board = {
  id: "b1",
  title: "Our board",
  theme: "cozy-cabin",
  status: "active",
  is_primary: true,
  created_by: "u1",
  created_at: "2026-01-01T00:00:00Z",
  archived_at: null,
};

describe("getPrimaryBoard", () => {
  it("returns the existing primary board", async () => {
    const { client } = mockSupabase([chain({ data: [board], error: null })]);
    await expect(getPrimaryBoard(client)).resolves.toEqual(board);
  });

  it("promotes the oldest active board when none is primary", async () => {
    const orphan = { ...board, is_primary: false };
    const { client, from } = mockSupabase([
      chain({ data: [], error: null }), // no primary
      chain({ data: [orphan], error: null }), // oldest active
      chain({ data: null, error: null }), // update -> primary
    ]);
    const result = await getPrimaryBoard(client);
    expect(result.is_primary).toBe(true);
    expect(from).toHaveBeenCalledTimes(3);
  });

  it("creates a primary board on the couple's first visit", async () => {
    const { client, from } = mockSupabase([
      chain({ data: [], error: null }), // no primary
      chain({ data: [], error: null }), // no active at all
      chain({ data: board, error: null }), // insert returns new board
    ]);
    const result = await getPrimaryBoard(client);
    expect(result).toEqual(board);
    expect(from).toHaveBeenCalledTimes(3);
  });

  it("surfaces load errors with a friendly message", async () => {
    const { client } = mockSupabase([
      chain({ data: null, error: { message: "boom" } }),
    ]);
    await expect(getPrimaryBoard(client)).rejects.toThrow("boom");
  });
});

describe("listActiveBoards", () => {
  it("returns the active boards", async () => {
    const extra = { ...board, id: "b2", is_primary: false };
    const { client } = mockSupabase([
      chain({ data: [board, extra], error: null }),
    ]);
    await expect(listActiveBoards(client)).resolves.toHaveLength(2);
  });
});

describe("createAdditionalBoard", () => {
  it("defaults a blank name", async () => {
    const made = { ...board, id: "b3", title: "New board", is_primary: false };
    const { client } = mockSupabase([chain({ data: made, error: null })]);
    const result = await createAdditionalBoard(client, "   ");
    expect(result.title).toBe("New board");
  });
});

describe("renameBoard", () => {
  it("throws a friendly error on failure", async () => {
    const { client } = mockSupabase([
      chain({ data: null, error: { message: "" } }),
    ]);
    await expect(renameBoard(client, "b1", "Trip")).rejects.toThrow(
      "Could not rename the board."
    );
  });
});

describe("archiveBoard", () => {
  it("archives an additional board without creating a replacement", async () => {
    const { client, from } = mockSupabase([chain({ data: null, error: null })]);
    await expect(
      archiveBoard(client, "b2", "Weekend away")
    ).resolves.toBeUndefined();
    expect(from).toHaveBeenCalledTimes(1);
  });
});

describe("archiveBoardAndStartFresh", () => {
  it("archives the old board, then creates the new one", async () => {
    const fresh = { ...board, id: "b2", theme: "sage-meadow" };
    const { client, from } = mockSupabase([
      chain({ data: null, error: null }), // update -> archived
      chain({ data: fresh, error: null }), // insert new board
    ]);
    const result = await archiveBoardAndStartFresh(client, "b1", {
      keepsakeTitle: "Summer 2026",
      nextTitle: "Our board",
      nextTheme: "sage-meadow",
    });
    expect(result.id).toBe("b2");
    expect(from).toHaveBeenCalledTimes(2);
  });

  it("does not create a new board if archiving failed", async () => {
    const { client, from } = mockSupabase([
      chain({ data: null, error: { message: "nope" } }),
    ]);
    await expect(
      archiveBoardAndStartFresh(client, "b1", {
        keepsakeTitle: "x",
        nextTitle: "y",
        nextTheme: "cozy-cabin",
      })
    ).rejects.toThrow("nope");
    expect(from).toHaveBeenCalledTimes(1);
  });
});

describe("items", () => {
  it("createNote returns the inserted item", async () => {
    const note = { id: "i1", kind: "note", content: "hey you" };
    const { client } = mockSupabase([chain({ data: note, error: null })]);
    await expect(
      createNote(client, {
        board_id: "b1",
        content: "hey you",
        paper: "butter",
        x: 0.1,
        y: 0.2,
        rotation: 0.01,
      })
    ).resolves.toEqual(note);
  });

  it("deleteItem also removes the photo from storage", async () => {
    const { client, storageRemove } = mockSupabase([
      chain({ data: null, error: null }),
    ]);
    await deleteItem(client, { id: "i1", photo_path: "b1/p.jpg" });
    expect(storageRemove).toHaveBeenCalledWith(["b1/p.jpg"]);
  });

  it("deleteItem skips storage for notes", async () => {
    const { client, storageRemove } = mockSupabase([
      chain({ data: null, error: null }),
    ]);
    await deleteItem(client, { id: "i1", photo_path: null });
    expect(storageRemove).not.toHaveBeenCalled();
  });
});

describe("updateBoardTheme", () => {
  it("throws a friendly error when the update fails", async () => {
    const { client } = mockSupabase([
      chain({ data: null, error: { message: "" } }),
    ]);
    await expect(updateBoardTheme(client, "b1", "x")).rejects.toThrow(
      "Could not change the theme."
    );
  });
});

describe("exportBoard", () => {
  it("bundles the board with its items", async () => {
    const items = [{ id: "i1" }, { id: "i2" }];
    const { client } = mockSupabase([chain({ data: items, error: null })]);
    const result = await exportBoard(client, board);
    expect(result.board).toEqual(board);
    expect(result.items).toHaveLength(2);
    expect(new Date(result.exported_at).getTime()).not.toBeNaN();
  });
});

describe("photoStoragePath", () => {
  it("namespaces photos by board", () => {
    expect(photoStoragePath("b1", "f1")).toBe("b1/f1.jpg");
  });
});
