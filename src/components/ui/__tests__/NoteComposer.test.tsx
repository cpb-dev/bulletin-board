import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteComposer } from "../NoteComposer";
import { useBoardStore } from "@/lib/store";
import type { Board, BoardItem } from "@/lib/types";

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({}),
}));

const createNoteMock = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, createNote: createNoteMock };
});

const board: Board = {
  id: "b1",
  title: "Our board",
  theme: "cozy-cabin",
  status: "active",
  is_primary: true,
  kind: "standard",
  created_by: "u1",
  created_at: "2026-01-01T00:00:00Z",
  archived_at: null,
};

beforeEach(() => {
  createNoteMock.mockReset();
  useBoardStore.setState({
    board,
    items: [],
    composer: "note",
    view: "board",
    readOnly: false,
    editingId: null,
  });
});

describe("NoteComposer", () => {
  it("renders nothing when closed", () => {
    useBoardStore.setState({ composer: null });
    const { container } = render(<NoteComposer />);
    expect(container).toBeEmptyDOMElement();
  });

  it("disables pinning until something is written", () => {
    render(<NoteComposer />);
    expect(screen.getByRole("button", { name: /pin it/i })).toBeDisabled();
  });

  it("pins a note and walks up to it", async () => {
    const newItem: BoardItem = {
      id: "i1",
      board_id: "b1",
      kind: "note",
      content: "miss you!",
      photo_path: null,
      paper: "butter",
      x: 0.31,
      y: -0.2,
      rotation: 0.02,
      scale: 1,
      created_by: "u1",
      created_at: "2026-01-02T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
    };
    createNoteMock.mockResolvedValue(newItem);

    render(<NoteComposer />);
    await userEvent.type(
      screen.getByPlaceholderText(/write something sweet/i),
      "miss you!"
    );
    await userEvent.click(screen.getByRole("button", { name: /pin it/i }));

    expect(createNoteMock).toHaveBeenCalledOnce();
    const input = createNoteMock.mock.calls[0][1];
    expect(input.board_id).toBe("b1");
    expect(input.content).toBe("miss you!");
    expect(Math.abs(input.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(input.y)).toBeLessThanOrEqual(1);

    const state = useBoardStore.getState();
    expect(state.items).toContainEqual(newItem);
    expect(state.composer).toBeNull();
    expect(state.view).toBe("board");
    expect(state.focus).toEqual({ x: newItem.x, y: newItem.y });
  });

  it("shows a friendly error when pinning fails", async () => {
    createNoteMock.mockRejectedValue(new Error("network sad"));
    render(<NoteComposer />);
    await userEvent.type(
      screen.getByPlaceholderText(/write something sweet/i),
      "hello"
    );
    await userEvent.click(screen.getByRole("button", { name: /pin it/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent("network sad");
    // composer stays open so the note isn't lost
    expect(useBoardStore.getState().composer).toBe("note");
  });

  it("offers the theme's paper colours", () => {
    render(<NoteComposer />);
    expect(screen.getByRole("button", { name: "Butter" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Rose" })).toBeInTheDocument();
  });
});
