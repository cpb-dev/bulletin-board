import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "../Toolbar";
import { useBoardStore } from "@/lib/store";

beforeEach(() => {
  useBoardStore.setState({
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
});
