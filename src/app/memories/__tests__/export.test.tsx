import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import MemoriesPage from "../page";
import type { Board, BoardItem } from "@/lib/types";
import { buildZip } from "@/lib/zip";

/**
 * The export flow end to end from the page's point of view. Only the
 * network edge is mocked — the ZIP, the folder layout and the offline
 * page are all built for real, so this fails if any of them break.
 */

const api = vi.hoisted(() => ({
  getPrimaryBoard: vi.fn(),
  listArchivedBoards: vi.fn(),
  listItems: vi.fn(),
  getProfiles: vi.fn(),
  fetchBoardPhotos: vi.fn(),
  archiveBoardAndStartFresh: vi.fn(),
  APP_NAME: "Our Little Board",
}));
vi.mock("@/lib/api", () => api);
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));
vi.mock("next/link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

function board(over: Partial<Board> = {}): Board {
  return {
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
    created_by: "u1",
    created_at: "2026-06-01T00:00:00Z",
    archived_at: "2026-09-01T00:00:00Z",
    ...over,
  };
}

const photoItem: BoardItem = {
  id: "item-1",
  board_id: "board-1",
  kind: "photo",
  content: "First swim",
  photo_path: "board-1/a.jpg",
  paper: "photo",
  x: 0.1,
  y: -0.2,
  rotation: 0.05,
  scale: 1.2,
  fixture_id: null,
  created_by: "u1",
  created_at: "2026-06-02T00:00:00Z",
  updated_at: "2026-06-02T00:00:00Z",
};

/** Capture what the page hands to the browser as a download. */
function captureDownload() {
  const captured: { name?: string; blob?: Blob } = {};
  const click = vi
    .spyOn(HTMLAnchorElement.prototype, "click")
    .mockImplementation(function (this: HTMLAnchorElement) {
      captured.name = this.download;
    });
  vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
    captured.blob = blob as Blob;
    return "blob:memory";
  });
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  return { captured, click };
}

beforeEach(() => {
  vi.restoreAllMocks();
  api.getPrimaryBoard.mockResolvedValue(board({ status: "active", id: "live" }));
  api.listArchivedBoards.mockResolvedValue([board()]);
  api.listItems.mockResolvedValue([photoItem]);
  api.getProfiles.mockResolvedValue({
    u1: { id: "u1", display_name: "Kalli", created_at: "2026-01-01T00:00:00Z" },
  });
  api.fetchBoardPhotos.mockImplementation(async () => ({
    photos: [{ path: "board-1/a.jpg", bytes: new Uint8Array([255, 216, 255]) }],
    missing: [],
  }));
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, text: async () => "/*viewer*/" }))
  );
});

async function exportFirstMemory() {
  const download = captureDownload();
  render(<MemoriesPage />);
  const button = await screen.findByLabelText(/download summer holiday/i);
  await userEvent.click(button);
  await waitFor(() => expect(download.click).toHaveBeenCalled());
  return download.captured;
}

describe("downloading a memory", () => {
  it("saves a zip named after the memory", async () => {
    const captured = await exportFirstMemory();
    expect(captured.name).toBe("Summer holiday 2026 (memory).zip");
    expect(captured.blob?.type).toBe("application/zip");
  });

  it("packs the board, its photos and an offline page into one folder", async () => {
    const captured = await exportFirstMemory();
    const bytes = new Uint8Array(await captured.blob!.arrayBuffer());
    const names = new TextDecoder().decode(bytes);
    for (const file of [
      "Summer holiday 2026 (memory)/index.html",
      "Summer holiday 2026 (memory)/board.json",
      "Summer holiday 2026 (memory)/README.txt",
      "Summer holiday 2026 (memory)/photos/01-first-swim.jpg",
    ]) {
      expect(names).toContain(file);
    }
    // A real archive, not just a blob of the right name.
    expect(bytes.subarray(0, 4)).toEqual(new Uint8Array([0x50, 0x4b, 3, 4]));
  });

  it("tells you where the file went when it's done", async () => {
    await exportFirstMemory();
    expect(
      await screen.findByText(/unzip it and open index\.html/i)
    ).toBeInTheDocument();
  });

  it("says so when a photo could not be reached", async () => {
    api.fetchBoardPhotos.mockResolvedValue({
      photos: [],
      missing: ["board-1/a.jpg"],
    });
    await exportFirstMemory();
    expect(
      await screen.findByText(/1 photo couldn't be reached/i)
    ).toBeInTheDocument();
  });

  it("shows the photo count as it collects them", async () => {
    api.fetchBoardPhotos.mockImplementation(
      async (
        _client: unknown,
        _items: unknown,
        onProgress?: (done: number, total: number) => void
      ) => {
        onProgress?.(0, 2);
        onProgress?.(1, 2);
        await screen.findByText(/collecting photos… 1\/2/i);
        return { photos: [], missing: [] };
      }
    );
    await exportFirstMemory();
  });

  it("surfaces a missing viewer build instead of a silent half-export", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => ({ ok: false, status: 404 })));
    captureDownload();
    render(<MemoriesPage />);
    await userEvent.click(await screen.findByLabelText(/download summer/i));
    expect(
      await screen.findByRole("alert")
    ).toHaveTextContent(/offline board viewer is missing/i);
  });
});

describe("the archive itself", () => {
  it("is a zip a real unzip can walk (signature and directory line up)", () => {
    const zip = buildZip(
      [{ path: "a/b.txt", data: new TextEncoder().encode("hi") }],
      new Date(2026, 0, 1)
    );
    const view = new DataView(zip.buffer);
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50);
  });
});
