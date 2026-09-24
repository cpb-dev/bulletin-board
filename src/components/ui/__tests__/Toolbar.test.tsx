import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "../Toolbar";
import { useBoardStore } from "@/lib/store";
import { readThemeView, themeViewKey } from "@/lib/theme-view";
import type { Board } from "@/lib/types";

const board: Board = {
  id: "board-1",
  title: "Our board",
  theme: "cozy-cabin",
  secondary_theme: null,
  status: "active",
  is_primary: true,
  kind: "standard",
  private_to: null,
  reveal_at: null,
  reveal_message: null,
  revealed_at: null,
  created_by: null,
  created_at: "2026-01-01T00:00:00Z",
  archived_at: null,
};

beforeEach(() => {
  localStorage.clear();
  useBoardStore.setState({
    board,
    themeView: "primary",
    view: "room",
    mode: "view",
    readOnly: false,
    composer: null,
    addMenuOpen: false,
    themePickerOpen: false,
    editingId: null,
    selectedId: null,
  });
});

describe("Toolbar", () => {
  it("offers to walk up when standing back in the room", async () => {
    render(<Toolbar />);
    await userEvent.click(screen.getByRole("button", { name: /walk up/i }));
    expect(useBoardStore.getState().view).toBe("board");
  });

  it("shows add / edit / theme actions up close in view mode", () => {
    useBoardStore.setState({ view: "board" });
    render(<Toolbar />);
    expect(screen.getByRole("button", { name: /add/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /edit/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /change theme/i })
    ).toBeInTheDocument();
  });

  it("the add button reveals note and photo choices", async () => {
    useBoardStore.setState({ view: "board" });
    render(<Toolbar />);
    await userEvent.click(screen.getByRole("button", { name: /add/i }));
    expect(useBoardStore.getState().addMenuOpen).toBe(true);
    expect(screen.getByRole("button", { name: /note/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /photo/i })).toBeInTheDocument();
  });

  it("choosing note from the add menu opens its composer", async () => {
    useBoardStore.setState({ view: "board", addMenuOpen: true });
    render(<Toolbar />);
    await userEvent.click(screen.getByRole("button", { name: /note/i }));
    expect(useBoardStore.getState().composer).toBe("note");
  });

  it("the edit button enters edit mode and shows done", async () => {
    useBoardStore.setState({ view: "board" });
    render(<Toolbar />);
    await userEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(useBoardStore.getState().mode).toBe("edit");
    expect(screen.getByRole("button", { name: /done/i })).toBeInTheDocument();
  });

  it("done exits edit mode", async () => {
    useBoardStore.setState({ view: "board", mode: "edit" });
    render(<Toolbar />);
    await userEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(useBoardStore.getState().mode).toBe("view");
  });

  it("hides editing actions on read-only memory boards", () => {
    useBoardStore.setState({ view: "board", readOnly: true });
    render(<Toolbar />);
    expect(screen.queryByRole("button", { name: /add/i })).toBeNull();
    expect(
      screen.getByRole("button", { name: /step back/i })
    ).toBeInTheDocument();
  });

  it("steps back to the room view", async () => {
    useBoardStore.setState({ view: "board" });
    render(<Toolbar />);
    await userEvent.click(screen.getByRole("button", { name: /step back/i }));
    expect(useBoardStore.getState().view).toBe("room");
  });

  describe("switching to the board's second theme (BB-3)", () => {
    const paired = { ...board, secondary_theme: "haunted-hollow" };

    it("isn't offered on a board with only one theme", () => {
      render(<Toolbar />);
      expect(
        screen.queryByRole("button", { name: /switch to/i })
      ).not.toBeInTheDocument();
    });

    it("sits beside walk up, showing the theme it switches to", () => {
      useBoardStore.setState({ board: paired });
      render(<Toolbar />);
      const walkUp = screen.getByRole("button", { name: /walk up/i });
      const toggle = screen.getByRole("button", {
        name: /switch to haunted hollow/i,
      });
      expect(walkUp.nextElementSibling).toBe(toggle);
      expect(toggle).toHaveTextContent("🎃");
    });

    it("flips the view and remembers it on this device", async () => {
      useBoardStore.setState({ board: paired });
      render(<Toolbar />);
      await userEvent.click(
        screen.getByRole("button", { name: /switch to haunted hollow/i })
      );
      expect(useBoardStore.getState().themeView).toBe("secondary");
      expect(readThemeView("board-1")).toBe("secondary");
      expect(localStorage.getItem(themeViewKey("board-1"))).toBe("secondary");

      await userEvent.click(
        screen.getByRole("button", { name: /switch to cozy cabin/i })
      );
      expect(useBoardStore.getState().themeView).toBe("primary");
      expect(readThemeView("board-1")).toBe("primary");
    });

    it("is offered on memories too, which are read-only", () => {
      useBoardStore.setState({ board: paired, readOnly: true });
      render(<Toolbar />);
      expect(
        screen.getByRole("button", { name: /switch to haunted hollow/i })
      ).toBeInTheDocument();
    });

    it("stays out of the way up close", () => {
      useBoardStore.setState({ board: paired, view: "board" });
      render(<Toolbar />);
      expect(
        screen.queryByRole("button", { name: /switch to/i })
      ).not.toBeInTheDocument();
    });
  });
});
