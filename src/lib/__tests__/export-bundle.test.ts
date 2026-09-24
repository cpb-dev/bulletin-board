import { describe, expect, it } from "vitest";
import {
  buildExportBundle,
  buildReadme,
  buildViewerHtml,
  exportFolderName,
  inlineJson,
  photoManifest,
  safeFileName,
  slugify,
  toBase64,
  type ExportInput,
} from "../export-bundle";
import type { Board, BoardItem } from "../types";

const board: Board = {
  id: "board-1",
  title: "Summer holiday 2026",
  theme: "beach-hut",
  status: "archived",
  is_primary: false,
  kind: "standard",
  private_to: null,
  reveal_at: null,
  reveal_message: null,
  revealed_at: null,
  created_by: "user-1",
  created_at: "2026-06-01T10:00:00.000Z",
  archived_at: "2026-09-01T10:00:00.000Z",
};

function item(over: Partial<BoardItem> = {}): BoardItem {
  return {
    id: "item-1",
    board_id: "board-1",
    kind: "note",
    content: "hello you",
    photo_path: null,
    paper: "butter",
    x: 0,
    y: 0,
    rotation: 0,
    scale: 1,
    fixture_id: null,
    created_by: "user-1",
    created_at: "2026-06-02T10:00:00.000Z",
    updated_at: "2026-06-02T10:00:00.000Z",
    ...over,
  };
}

function input(over: Partial<ExportInput> = {}): ExportInput {
  return {
    board,
    items: [item()],
    profiles: {
      "user-1": {
        id: "user-1",
        display_name: "Kalli",
        created_at: "2026-01-01T00:00:00.000Z",
      },
    },
    photos: [],
    viewerScript: "console.log('viewer');",
    appName: "Our Little Board",
    now: new Date("2026-09-20T12:00:00.000Z"),
    ...over,
  };
}

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

/** Pull the payload back out of the page, the way the viewer sees it. */
function readPayload(html: string) {
  const match = /window\.__MEMORY__ = (.*?);<\/script>/.exec(html);
  if (!match) throw new Error("no memory payload in the exported page");
  return JSON.parse(match[1]);
}

describe("toBase64", () => {
  it("encodes bytes the same way the platform does", () => {
    for (const sample of [[], [0], [0, 1], [0, 1, 2], [255, 254, 253, 0, 77]]) {
      const bytes = new Uint8Array(sample);
      const expected = Buffer.from(bytes).toString("base64");
      expect(toBase64(bytes)).toBe(expected);
    }
  });

  it("pads the tail correctly at every length", () => {
    expect(toBase64(new Uint8Array([77]))).toMatch(/==$/);
    expect(toBase64(new Uint8Array([77, 78]))).toMatch(/[^=]=$/);
    expect(toBase64(new Uint8Array([77, 78, 79]))).not.toMatch(/=/);
  });
});

describe("safeFileName", () => {
  it("strips characters that break folders on some platform or other", () => {
    expect(safeFileName('our/board: "best" <ever>?')).toBe("our board best ever");
  });

  it("keeps accents and emoji, which are fine everywhere", () => {
    expect(safeFileName("Café ☕ 2026")).toBe("Café ☕ 2026");
  });

  it("never ends in a dot or space (Windows refuses those)", () => {
    expect(safeFileName("holiday... ")).toBe("holiday");
  });

  it("falls back when a title is nothing but punctuation", () => {
    expect(safeFileName("///")).toBe("board");
  });

  it("does not leave a trailing space behind after trimming to length", () => {
    const name = safeFileName(`${"a".repeat(59)} tail`);
    expect(name).toHaveLength(59);
    expect(name).not.toMatch(/[. ]$/);
  });
});

describe("slugify", () => {
  it("makes a readable stem out of a caption", () => {
    expect(slugify("First snow! ❄️")).toBe("first-snow");
  });

  it("is empty when there's nothing to use", () => {
    expect(slugify("❄️")).toBe("");
  });
});

describe("exportFolderName", () => {
  it("names the folder after the memory", () => {
    expect(exportFolderName(board)).toBe("Summer holiday 2026 (memory)");
  });
});

describe("photoManifest", () => {
  const photos = [
    { path: "board-1/a.jpg", bytes: new Uint8Array([1]) },
    { path: "board-1/b.jpg", bytes: new Uint8Array([2]) },
  ];

  it("names photos after their captions, numbered in board order", () => {
    const manifest = photoManifest(
      [
        item({ id: "1", kind: "photo", photo_path: "board-1/a.jpg", content: "First snow!" }),
        item({ id: "2", kind: "photo", photo_path: "board-1/b.jpg", content: "" }),
      ],
      photos
    );
    expect(manifest).toEqual([
      { path: "board-1/a.jpg", file: "photos/01-first-snow.jpg" },
      { path: "board-1/b.jpg", file: "photos/02.jpg" },
    ]);
  });

  it("keeps names unique when two captions are the same", () => {
    const manifest = photoManifest(
      [
        item({ id: "1", kind: "photo", photo_path: "board-1/a.jpg", content: "us" }),
        item({ id: "2", kind: "photo", photo_path: "board-1/b.jpg", content: "us" }),
      ],
      photos
    );
    expect(new Set(manifest.map((m) => m.file)).size).toBe(2);
  });

  it("skips items whose photo could not be downloaded", () => {
    const manifest = photoManifest(
      [item({ id: "1", kind: "photo", photo_path: "board-1/gone.jpg" })],
      photos
    );
    expect(manifest).toEqual([]);
  });

  it("ignores notes, which have no photo at all", () => {
    expect(photoManifest([item()], photos)).toEqual([]);
  });
});

describe("inlineJson", () => {
  it("defuses a </script> hidden in someone's note", () => {
    const json = inlineJson({ note: "</script><img onerror=alert(1)>" });
    expect(json).not.toContain("</script>");
    expect(JSON.parse(json).note).toBe("</script><img onerror=alert(1)>");
  });

  it("escapes the separators that are newlines to a JS parser", () => {
    const json = inlineJson({ note: "a\u2028b\u2029c" });
    expect(json).not.toMatch(/[\u2028\u2029]/);
    expect(JSON.parse(json).note).toBe("a\u2028b\u2029c");
  });
});

describe("buildViewerHtml", () => {
  it("carries the board, its items and its people", () => {
    const html = buildViewerHtml(input());
    const payload = readPayload(html);
    expect(payload.board.id).toBe("board-1");
    expect(payload.board.theme).toBe("beach-hut");
    expect(payload.items).toHaveLength(1);
    expect(payload.profiles["user-1"].display_name).toBe("Kalli");
  });

  it("inlines photos as data URIs, since file:// can't read its neighbours", () => {
    const html = buildViewerHtml(
      input({
        items: [item({ kind: "photo", photo_path: "board-1/a.jpg", content: "us" })],
        photos: [{ path: "board-1/a.jpg", bytes: new Uint8Array([255, 216, 255]) }],
      })
    );
    const payload = readPayload(html);
    expect(payload.photos["board-1/a.jpg"]).toBe(
      `data:image/jpeg;base64,${toBase64(new Uint8Array([255, 216, 255]))}`
    );
  });

  it("includes the compiled viewer so the page needs nothing else", () => {
    expect(buildViewerHtml(input())).toContain("console.log('viewer');");
  });

  it("escapes the board title in the page title", () => {
    const html = buildViewerHtml(
      input({ board: { ...board, title: 'Us & "them" <3' } })
    );
    expect(html).toContain("<title>Us &amp; &quot;them&quot; &lt;3 · a memory</title>");
  });

  it("says where the data is when JavaScript is off", () => {
    expect(buildViewerHtml(input())).toContain("board.json");
  });
});

describe("buildReadme", () => {
  it("counts what's in the folder", () => {
    const readme = buildReadme(
      input({
        items: [
          item({ id: "1" }),
          item({ id: "2" }),
          item({ id: "3", kind: "photo", photo_path: "board-1/a.jpg" }),
        ],
        photos: [{ path: "board-1/a.jpg", bytes: new Uint8Array([1]) }],
      }),
      "Summer holiday 2026 (memory)"
    );
    expect(readme).toContain("2 notes, 1 photo");
  });
});

describe("buildExportBundle", () => {
  const bundle = buildExportBundle(
    input({
      items: [
        item({ id: "1", content: "hello you" }),
        item({
          id: "2",
          kind: "photo",
          photo_path: "board-1/a.jpg",
          content: "First snow!",
        }),
      ],
      photos: [{ path: "board-1/a.jpg", bytes: new Uint8Array([255, 216, 255]) }],
    })
  );
  const paths = bundle.entries.map((e) => e.path);

  it("puts everything inside one named folder", () => {
    expect(bundle.folder).toBe("Summer holiday 2026 (memory)");
    expect(bundle.fileName).toBe("Summer holiday 2026 (memory).zip");
    expect(paths.every((p) => p.startsWith(`${bundle.folder}/`))).toBe(true);
  });

  it("writes the viewer, the data, the note and the photos", () => {
    expect(paths).toEqual([
      "Summer holiday 2026 (memory)/index.html",
      "Summer holiday 2026 (memory)/board.json",
      "Summer holiday 2026 (memory)/README.txt",
      "Summer holiday 2026 (memory)/photos/01-first-snow.jpg",
    ]);
  });

  it("stores the photo's real bytes, not a description of it", () => {
    const photo = bundle.entries.find((e) => e.path.endsWith(".jpg"))!;
    expect(Array.from(photo.data)).toEqual([255, 216, 255]);
  });

  it("gives board.json a manifest tying items to photo files", () => {
    const json = JSON.parse(
      decode(bundle.entries.find((e) => e.path.endsWith("board.json"))!.data)
    );
    expect(json.photos).toEqual([
      { path: "board-1/a.jpg", file: "photos/01-first-snow.jpg" },
    ]);
    expect(json.items).toHaveLength(2);
    expect(json.board.title).toBe("Summer holiday 2026");
    expect(json.app).toBe("Our Little Board");
  });

  it("keeps item coordinates normalized, exactly as stored", () => {
    const json = JSON.parse(
      decode(bundle.entries.find((e) => e.path.endsWith("board.json"))!.data)
    );
    expect(json.items[0].x).toBe(0);
    expect(json.items[0].scale).toBe(1);
  });

  it("still produces a whole folder for a board with nothing on it", () => {
    const empty = buildExportBundle(input({ items: [], photos: [] }));
    expect(empty.entries.map((e) => e.path)).toEqual([
      "Summer holiday 2026 (memory)/index.html",
      "Summer holiday 2026 (memory)/board.json",
      "Summer holiday 2026 (memory)/README.txt",
    ]);
  });
});
