import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ItemEditor } from "../ItemEditor";
import { useBoardStore } from "@/lib/store";
import type { Board, BoardItem } from "@/lib/types";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

const updateItemMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, updateItem: updateItemMock };
});

const board: Board = {
  id: "b1",
  title: "Our board",
  theme: "rose-picnic",
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

/** A heart note as it sits in the live database: no shape column value. */
const heartNote: BoardItem = {
  id: "n1",
  board_id: "b1",
  kind: "note",
  content: "love you",
  photo_path: null,
  paper: "heart",
  x: 0,
  y: 0,
  rotation: 0,
  scale: 1,
  fixture_id: null,
  created_by: "u1",
  created_at: "2026-01-02T00:00:00Z",
  updated_at: "2026-01-02T00:00:00Z",
};

function open(item: BoardItem) {
  useBoardStore.setState({
    board,
    items: [item],
    editingId: item.id,
    readOnly: false,
  });
  render(<ItemEditor />);
}

const pressed = (name: string) =>
  screen.getByRole("button", { name }).getAttribute("aria-pressed");

beforeEach(() => {
  updateItemMock.mockReset();
  updateItemMock.mockResolvedValue(undefined);
});

describe("ItemEditor note style", () => {
  it("shows an existing heart note as a heart", () => {
    open(heartNote);
    expect(pressed("Heart shape")).toBe("true");
    expect(pressed("Heart")).toBe("true");
  });

  it("saves text edits on a heart note without touching its shape", async () => {
    open(heartNote);
    await userEvent.type(screen.getByDisplayValue("love you"), "!");
    await userEvent.click(screen.getByRole("button", { name: "save" }));
    const patch = updateItemMock.mock.calls[0][2];
    expect(patch).toEqual({ content: "love you!", paper: "heart" });
    expect(useBoardStore.getState().items[0].paper).toBe("heart");
  });

  it("keeps a heart a heart when it's recoloured", async () => {
    open(heartNote);
    await userEvent.click(screen.getByRole("button", { name: "Petal" }));
    expect(pressed("Heart shape")).toBe("true");
    await userEvent.click(screen.getByRole("button", { name: "save" }));
    expect(updateItemMock.mock.calls[0][2]).toEqual({
      content: "love you",
      paper: "petal",
      shape: "heart",
    });
  });

  it("changes shape on its own", async () => {
    open({ ...heartNote, paper: "cream" });
    expect(pressed("Square shape")).toBe("true");
    await userEvent.click(screen.getByRole("button", { name: "Circle shape" }));
    await userEvent.click(screen.getByRole("button", { name: "save" }));
    expect(updateItemMock.mock.calls[0][2]).toEqual({
      content: "love you",
      paper: "cream",
      shape: "circle",
    });
    expect(useBoardStore.getState().items[0].shape).toBe("circle");
  });

  it("clears a stored shape when it goes back to what the paper implies", async () => {
    open({ ...heartNote, paper: "cream", shape: "star" });
    await userEvent.click(screen.getByRole("button", { name: "Square shape" }));
    await userEvent.click(screen.getByRole("button", { name: "save" }));
    expect(updateItemMock.mock.calls[0][2]).toEqual({
      content: "love you",
      paper: "cream",
      shape: null,
    });
  });

  it("leaves save disabled until something changes", () => {
    open(heartNote);
    expect(screen.getByRole("button", { name: "save" })).toBeDisabled();
  });
});
