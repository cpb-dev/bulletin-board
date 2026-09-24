import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LONG_PRESS_MS, ThemePicker } from "../ThemePicker";
import { useBoardStore } from "@/lib/store";
import { THEMES } from "@/themes";
import type { Board } from "@/lib/types";

// Only the network edge is mocked — the store and the catalogue are real.
const updateBoardTheme = vi.hoisted(() => vi.fn());
const updateBoardSecondaryTheme = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ updateBoardTheme, updateBoardSecondaryTheme }));
vi.mock("@/lib/supabase/client", () => ({ createClient: () => ({}) }));

const board: Board = {
  id: "board-1",
  title: "Our board",
  theme: "cozy-cabin",
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
  updateBoardTheme.mockReset();
  updateBoardTheme.mockResolvedValue(undefined);
  updateBoardSecondaryTheme.mockReset();
  updateBoardSecondaryTheme.mockResolvedValue(undefined);
  useBoardStore.setState({ themePickerOpen: true, board });
});

describe("ThemePicker", () => {
  it("groups the themes under Everyday, Special, Seasonal and TV", () => {
    render(<ThemePicker />);
    const sections = screen.getAllByRole("region");
    expect(sections.map((s) => s.getAttribute("aria-label"))).toEqual([
      "Everyday",
      "Special",
      "Seasonal",
      "TV",
    ]);
  });

  it("puts each theme in its own group", () => {
    render(<ThemePicker />);
    const inGroup = (label: string) =>
      within(screen.getByRole("region", { name: label }))
        .getAllByRole("button")
        .map((b) => b.textContent);

    expect(inGroup("Everyday").join(" ")).toContain("Cozy Cabin");
    expect(inGroup("Everyday").join(" ")).toContain("Summer House");
    expect(inGroup("Special").join(" ")).toContain("World Cup");
    expect(inGroup("Special").join(" ")).toContain("Rose Picnic");
    expect(inGroup("Seasonal").join(" ")).toContain("Haunted Hollow");
    expect(inGroup("Seasonal").join(" ")).toContain("Beach Hut");
    expect(inGroup("TV").join(" ")).toContain("Stars Hollow");
  });

  it("offers every theme in the catalogue — none are hidden", () => {
    render(<ThemePicker />);
    for (const theme of THEMES) {
      expect(
        screen.getByRole("button", { name: new RegExp(theme.name, "i") }),
        `${theme.id} should be pickable`
      ).toBeInTheDocument();
    }
  });

  it("marks the board's current theme as pressed", () => {
    render(<ThemePicker />);
    expect(
      screen.getByRole("button", { name: /cozy cabin/i })
    ).toHaveAttribute("aria-pressed", "true");
    expect(
      screen.getByRole("button", { name: /beach hut/i })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("redecorates optimistically when a theme is chosen", async () => {
    render(<ThemePicker />);
    await userEvent.click(screen.getByRole("button", { name: /world cup/i }));
    expect(useBoardStore.getState().board?.theme).toBe("world-cup");
    expect(updateBoardTheme).toHaveBeenCalledWith({}, "board-1", "world-cup", {
      clearSecondary: false,
    });
  });

  it("rolls back and explains itself if the save fails", async () => {
    updateBoardTheme.mockRejectedValue(new Error("offline"));
    render(<ThemePicker />);
    await userEvent.click(screen.getByRole("button", { name: /rose picnic/i }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(useBoardStore.getState().board?.theme).toBe("cozy-cabin");
  });

  describe("second theme (BB-3)", () => {
    const themeButton = (name: RegExp) => screen.getByRole("button", { name });
    const options = (name: string) =>
      screen.getByRole("group", { name: `${name} options` });

    it("holding a theme offers to add it as the second theme", async () => {
      vi.useFakeTimers();
      try {
        render(<ThemePicker />);
        fireEvent.pointerDown(themeButton(/haunted hollow/i), {
          clientX: 10,
          clientY: 10,
        });
        act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
        // Letting go ends the hold without also picking it as main theme.
        fireEvent.pointerUp(themeButton(/haunted hollow/i));
        fireEvent.click(themeButton(/haunted hollow/i));
      } finally {
        vi.useRealTimers();
      }
      expect(useBoardStore.getState().board?.theme).toBe("cozy-cabin");

      await userEvent.click(
        within(options("Haunted Hollow")).getByRole("button", {
          name: /add as second theme/i,
        })
      );
      expect(useBoardStore.getState().board?.secondary_theme).toBe(
        "haunted-hollow"
      );
      expect(updateBoardSecondaryTheme).toHaveBeenCalledWith(
        {},
        "board-1",
        "haunted-hollow"
      );
      expect(themeButton(/haunted hollow/i)).toHaveTextContent(/2nd theme/i);
    });

    it("a quick tap still just changes the main theme", () => {
      vi.useFakeTimers();
      try {
        render(<ThemePicker />);
        fireEvent.pointerDown(themeButton(/beach hut/i));
        act(() => vi.advanceTimersByTime(LONG_PRESS_MS / 5));
        fireEvent.pointerUp(themeButton(/beach hut/i));
        fireEvent.click(themeButton(/beach hut/i));
        act(() => vi.advanceTimersByTime(LONG_PRESS_MS));
      } finally {
        vi.useRealTimers();
      }
      expect(useBoardStore.getState().board?.theme).toBe("beach-hut");
      expect(screen.queryByRole("group")).not.toBeInTheDocument();
    });

    it("holding the second theme offers to remove it", async () => {
      useBoardStore.setState({
        board: { ...board, secondary_theme: "haunted-hollow" },
      });
      render(<ThemePicker />);
      fireEvent.contextMenu(themeButton(/haunted hollow/i));
      await userEvent.click(
        within(options("Haunted Hollow")).getByRole("button", {
          name: /remove second theme/i,
        })
      );
      expect(useBoardStore.getState().board?.secondary_theme).toBeNull();
      expect(updateBoardSecondaryTheme).toHaveBeenCalledWith({}, "board-1", null);
    });

    it("holding another theme offers to switch the second theme to it", async () => {
      useBoardStore.setState({
        board: { ...board, secondary_theme: "haunted-hollow" },
      });
      render(<ThemePicker />);
      fireEvent.contextMenu(themeButton(/beach hut/i));
      await userEvent.click(
        within(options("Beach Hut")).getByRole("button", {
          name: /switch second theme to this/i,
        })
      );
      expect(useBoardStore.getState().board?.secondary_theme).toBe("beach-hut");
    });

    it("the main theme can't be its own second theme", () => {
      render(<ThemePicker />);
      fireEvent.contextMenu(themeButton(/cozy cabin/i));
      expect(options("Cozy Cabin")).toHaveTextContent(/this is the main theme/i);
      expect(
        within(options("Cozy Cabin")).queryByRole("button", {
          name: /second theme/i,
        })
      ).not.toBeInTheDocument();
    });

    it("changing the main theme drops the second theme", async () => {
      useBoardStore.setState({
        board: { ...board, secondary_theme: "haunted-hollow" },
      });
      render(<ThemePicker />);
      await userEvent.click(themeButton(/beach hut/i));
      const saved = useBoardStore.getState().board;
      expect(saved?.theme).toBe("beach-hut");
      expect(saved?.secondary_theme).toBeNull();
      expect(updateBoardTheme).toHaveBeenCalledWith({}, "board-1", "beach-hut", {
        clearSecondary: true,
      });
    });

    it("rolls the second theme back if the save fails", async () => {
      updateBoardSecondaryTheme.mockRejectedValue(new Error("offline"));
      render(<ThemePicker />);
      fireEvent.contextMenu(themeButton(/haunted hollow/i));
      await userEvent.click(
        screen.getByRole("button", { name: /add as second theme/i })
      );
      expect(await screen.findByRole("alert")).toBeInTheDocument();
      expect(useBoardStore.getState().board?.secondary_theme ?? null).toBeNull();
    });
  });
});
