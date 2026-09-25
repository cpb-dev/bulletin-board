import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  archiveBoard,
  archiveBoardAndStartFresh,
  createAdditionalBoard,
  createNote,
  createSurpriseBoard,
  deleteBoard,
  deleteItem,
  fetchBoardPhotos,
  getPrimaryBoard,
  getWorldCupBoard,
  listActiveBoards,
  photoStoragePath,
  promoteBoardToMain,
  renameBoard,
  updateBoardSecondaryTheme,
  updateBoardTheme,
  updateSurpriseReveal,
} from "../api";
import type { Board, BoardItem } from "../types";

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

/** Like `chain`, but each method is one spy, so its arguments can be checked. */
function recordingChain(result: { data?: unknown; error?: { message: string } | null }) {
  const spies = new Map<PropertyKey, ReturnType<typeof vi.fn>>();
  const proxy: Record<string, ReturnType<typeof vi.fn>> = new Proxy(
    {},
    {
      get(_t, prop) {
        if (prop === "then") {
          return (
            resolve: (v: unknown) => unknown,
            reject: (e: unknown) => unknown
          ) => Promise.resolve(result).then(resolve, reject);
        }
        if (!spies.has(prop)) spies.set(prop, vi.fn(() => proxy));
        return spies.get(prop);
      },
    }
  );
  return proxy;
}

function mockSupabase(fromResults: ReturnType<typeof chain>[]) {
  const from = vi.fn();
  for (const r of fromResults) from.mockReturnValueOnce(r);
  const storageRemove = vi.fn(async () => ({ data: null, error: null }));
  return {
    client: {
      from,
      auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
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
  kind: "standard",
  private_to: null,
  reveal_at: null,
  reveal_message: null,
  revealed_at: null,
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

describe("getWorldCupBoard", () => {
  it("returns the active World Cup board", async () => {
    const wc = { ...board, id: "wc", kind: "worldcup", is_primary: false };
    const { client } = mockSupabase([chain({ data: [wc], error: null })]);
    await expect(getWorldCupBoard(client)).resolves.toEqual(wc);
  });

  it("returns null when there isn't one", async () => {
    const { client } = mockSupabase([chain({ data: [], error: null })]);
    await expect(getWorldCupBoard(client)).resolves.toBeNull();
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

describe("promoteBoardToMain", () => {
  it("demotes the current primary, then promotes the target", async () => {
    const target = { ...board, id: "b2", is_primary: false };
    const { client, from } = mockSupabase([
      chain({ data: target, error: null }), // preflight: fetch target
      chain({ data: null, error: null }), // demote current primary
      chain({ data: null, error: null }), // promote target
    ]);
    await expect(promoteBoardToMain(client, "b2")).resolves.toBeUndefined();
    expect(from).toHaveBeenCalledTimes(3);
  });

  it("refuses to promote a still-secret surprise board", async () => {
    const secret = {
      ...board,
      id: "b9",
      is_primary: false,
      private_to: "u1",
      reveal_at: "2999-01-01T00:00:00Z",
    };
    const { client, from } = mockSupabase([chain({ data: secret, error: null })]);
    await expect(promoteBoardToMain(client, "b9")).rejects.toThrow(
      /after the reveal/
    );
    expect(from).toHaveBeenCalledTimes(1); // never reached the demote step
  });

  it("stops if demoting the current primary fails", async () => {
    const target = { ...board, id: "b2", is_primary: false };
    const { client, from } = mockSupabase([
      chain({ data: target, error: null }), // preflight
      chain({ data: null, error: { message: "nope" } }),
    ]);
    await expect(promoteBoardToMain(client, "b2")).rejects.toThrow("nope");
    expect(from).toHaveBeenCalledTimes(2);
  });
});

describe("createSurpriseBoard", () => {
  it("creates a board private to its creator with the reveal set", async () => {
    const made = {
      ...board,
      id: "b9",
      is_primary: false,
      private_to: "u1",
      theme: "rose-picnic",
      reveal_at: "2026-07-19T08:00:00.000Z",
    };
    const { client } = mockSupabase([chain({ data: made, error: null })]);
    const result = await createSurpriseBoard(client, {
      title: "Happy Birthday!",
      revealAt: "2026-07-19T08:00:00Z",
      revealMessage: "Happy birthday my love 🌹",
    });
    expect(result.private_to).toBe("u1");
    expect(result.theme).toBe("rose-picnic");
  });

  it("surfaces creation errors", async () => {
    const { client } = mockSupabase([
      chain({ data: null, error: { message: "nope" } }),
    ]);
    await expect(
      createSurpriseBoard(client, {
        title: "x",
        revealAt: "2026-07-19T08:00:00Z",
        revealMessage: "",
      })
    ).rejects.toThrow("nope");
  });
});

describe("updateSurpriseReveal", () => {
  it("does not throw on success", async () => {
    const { client } = mockSupabase([chain({ data: null, error: null })]);
    await expect(
      updateSurpriseReveal(client, "b9", {
        revealAt: "2026-07-20T08:00:00Z",
        revealMessage: "new message",
      })
    ).resolves.toBeUndefined();
  });
});

describe("deleteBoard", () => {
  it("deletes the board", async () => {
    const { client, from } = mockSupabase([chain({ data: null, error: null })]);
    await expect(deleteBoard(client, "b2")).resolves.toBeUndefined();
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("surfaces a friendly error", async () => {
    const { client } = mockSupabase([
      chain({ data: null, error: { message: "" } }),
    ]);
    await expect(deleteBoard(client, "b2")).rejects.toThrow(
      "Could not delete that board."
    );
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

  it("createNote leaves the shape column out for plain and classic heart notes", async () => {
    // Pinning must work exactly as before BB-24, even before migration
    // 0009 adds the column.
    const plain = recordingChain({ data: { id: "i1" }, error: null });
    const unset = recordingChain({ data: { id: "i2" }, error: null });
    const { client } = mockSupabase([plain, unset]);
    const base = { board_id: "b1", content: "hi", x: 0, y: 0, rotation: 0 };
    await createNote(client, { ...base, paper: "heart", shape: null });
    await createNote(client, { ...base, paper: "butter" });
    expect(plain.insert).toHaveBeenCalledWith({ ...base, paper: "heart", kind: "note" });
    expect(unset.insert).toHaveBeenCalledWith({ ...base, paper: "butter", kind: "note" });
  });

  it("createNote writes a chosen shape", async () => {
    const insert = recordingChain({ data: { id: "i1" }, error: null });
    const { client } = mockSupabase([insert]);
    const base = { board_id: "b1", content: "hi", x: 0, y: 0, rotation: 0 };
    await createNote(client, { ...base, paper: "butter", shape: "star" });
    expect(insert.insert).toHaveBeenCalledWith({
      ...base,
      paper: "butter",
      shape: "star",
      kind: "note",
    });
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
  it("only touches the theme when there's no second theme to drop", async () => {
    const update = recordingChain({ data: null, error: null });
    const { client } = mockSupabase([update]);
    await updateBoardTheme(client, "b1", "beach-hut");
    expect(update.update).toHaveBeenCalledWith({ theme: "beach-hut" });
  });

  it("drops the second theme along with the old main one", async () => {
    const update = recordingChain({ data: null, error: null });
    const { client } = mockSupabase([update]);
    await updateBoardTheme(client, "b1", "beach-hut", { clearSecondary: true });
    expect(update.update).toHaveBeenCalledWith({
      theme: "beach-hut",
      secondary_theme: null,
    });
  });

  it("throws a friendly error when the update fails", async () => {
    const { client } = mockSupabase([
      chain({ data: null, error: { message: "" } }),
    ]);
    await expect(updateBoardTheme(client, "b1", "x")).rejects.toThrow(
      "Could not change the theme."
    );
  });
});

describe("updateBoardSecondaryTheme", () => {
  it("sets and removes the second theme", async () => {
    const set = recordingChain({ data: null, error: null });
    const clear = recordingChain({ data: null, error: null });
    const { client } = mockSupabase([set, clear]);
    await updateBoardSecondaryTheme(client, "b1", "haunted-hollow");
    await updateBoardSecondaryTheme(client, "b1", null);
    expect(set.update).toHaveBeenCalledWith({ secondary_theme: "haunted-hollow" });
    expect(clear.update).toHaveBeenCalledWith({ secondary_theme: null });
  });

  it("throws a friendly error when the update fails", async () => {
    const { client } = mockSupabase([
      chain({ data: null, error: { message: "" } }),
    ]);
    await expect(updateBoardSecondaryTheme(client, "b1", "x")).rejects.toThrow(
      "Could not change the second theme."
    );
  });
});

describe("photoStoragePath", () => {
  it("namespaces photos by board", () => {
    expect(photoStoragePath("b1", "f1")).toBe("b1/f1.jpg");
  });
});

describe("fetchBoardPhotos", () => {
  function photoItem(id: string, path: string | null): BoardItem {
    return {
      id,
      board_id: "b1",
      kind: path ? "photo" : "note",
      content: "",
      photo_path: path,
      paper: "photo",
      x: 0,
      y: 0,
      rotation: 0,
      scale: 1,
      fixture_id: null,
      created_by: "u1",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
    };
  }

  /** A client whose storage hands out signed URLs for the given paths. */
  function photoClient(signable: string[]) {
    return {
      storage: {
        from: () => ({
          createSignedUrl: async (path: string) =>
            signable.includes(path)
              ? { data: { signedUrl: `https://signed.test/${path}` }, error: null }
              : { data: null, error: { message: "no such object" } },
        }),
      },
    } as unknown as SupabaseClient;
  }

  it("downloads the bytes behind each photo_path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer,
      }))
    );
    const { photos, missing } = await fetchBoardPhotos(
      photoClient(["b1/a.jpg", "b1/b.jpg"]),
      [photoItem("1", "b1/a.jpg"), photoItem("2", "b1/b.jpg")]
    );
    expect(photos.map((p) => p.path)).toEqual(["b1/a.jpg", "b1/b.jpg"]);
    expect(Array.from(photos[0].bytes)).toEqual([1, 2, 3]);
    expect(missing).toEqual([]);
    vi.unstubAllGlobals();
  });

  it("ignores notes, which have nothing to download", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { photos } = await fetchBoardPhotos(photoClient([]), [
      photoItem("1", null),
    ]);
    expect(photos).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });

  it("downloads a shared photo path only once", async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true,
      arrayBuffer: async () => new Uint8Array([7]).buffer,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const { photos } = await fetchBoardPhotos(photoClient(["b1/a.jpg"]), [
      photoItem("1", "b1/a.jpg"),
      photoItem("2", "b1/a.jpg"),
    ]);
    expect(photos).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    vi.unstubAllGlobals();
  });

  it("keeps the photos it could reach and names the ones it could not", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("b1/a.jpg")
          ? { ok: true, arrayBuffer: async () => new Uint8Array([9]).buffer }
          : { ok: false, status: 404 }
      )
    );
    const { photos, missing } = await fetchBoardPhotos(
      photoClient(["b1/a.jpg", "b1/gone.jpg"]),
      [photoItem("1", "b1/a.jpg"), photoItem("2", "b1/gone.jpg")]
    );
    expect(photos.map((p) => p.path)).toEqual(["b1/a.jpg"]);
    expect(missing).toEqual(["b1/gone.jpg"]);
    vi.unstubAllGlobals();
  });

  it("reports progress so a phone can show it", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: true,
        arrayBuffer: async () => new Uint8Array([1]).buffer,
      }))
    );
    const seen: string[] = [];
    await fetchBoardPhotos(
      photoClient(["b1/a.jpg", "b1/b.jpg"]),
      [photoItem("1", "b1/a.jpg"), photoItem("2", "b1/b.jpg")],
      (done, total) => seen.push(`${done}/${total}`)
    );
    expect(seen).toEqual(["0/2", "1/2", "2/2"]);
    vi.unstubAllGlobals();
  });
});
