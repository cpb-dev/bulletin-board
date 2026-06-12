import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Toolbar } from "../Toolbar";
import { useBoardStore } from "@/lib/store";

beforeEach(() => {
  useBoardStore.setState({
    view: "room",
    readOnly: false,
    composer: null,
    themePickerOpen: false,
    editingId: null,
  });
});

describe("Toolbar", () => {
  it("offers to walk up when standing back in the room", async () => {
    render(<Toolbar />);
    await userEvent.click(
      screen.getByRole("button", { name: /walk up/i })
    );
    expect(useBoardStore.getState().view).toBe("board");
  });

  it("shows note / photo / theme actions up close", () => {
    useBoardStore.setState({ view: "board" });
    render(<Toolbar />);
    expect(screen.getByRole("button", { name: /note/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /photo/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /change theme/i })
    ).toBeInTheDocument();
  });

  it("hides editing actions on read-only memory boards", () => {
    useBoardStore.setState({ view: "board", readOnly: true });
    render(<Toolbar />);
    expect(screen.queryByRole("button", { name: /note/i })).toBeNull();
    expect(
      screen.getByRole("button", { name: /step back/i })
    ).toBeInTheDocument();
  });

  it("opens the note composer", async () => {
    useBoardStore.setState({ view: "board" });
    render(<Toolbar />);
    await userEvent.click(screen.getByRole("button", { name: /note/i }));
    expect(useBoardStore.getState().composer).toBe("note");
  });

  it("steps back to the room view", async () => {
    useBoardStore.setState({ view: "board" });
    render(<Toolbar />);
    await userEvent.click(screen.getByRole("button", { name: /step back/i }));
    expect(useBoardStore.getState().view).toBe("room");
  });
});
