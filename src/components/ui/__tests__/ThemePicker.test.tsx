import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ThemePicker } from "../ThemePicker";
import { useBoardStore } from "@/lib/store";
import { THEMES } from "@/themes";
import type { Board } from "@/lib/types";

// Only the network edge is mocked — the store and the catalogue are real.
const updateBoardTheme = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", () => ({ updateBoardTheme }));
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
  useBoardStore.setState({ themePickerOpen: true, board });
});

describe("ThemePicker", () => {
  it("groups the themes under Everyday, Special and Seasonal", () => {
    render(<ThemePicker />);
    const sections = screen.getAllByRole("region");
    expect(sections.map((s) => s.getAttribute("aria-label"))).toEqual([
      "Everyday",
      "Special",
      "Seasonal",
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
    expect(updateBoardTheme).toHaveBeenCalledWith({}, "board-1", "world-cup");
  });

  it("rolls back and explains itself if the save fails", async () => {
    updateBoardTheme.mockRejectedValue(new Error("offline"));
    render(<ThemePicker />);
    await userEvent.click(screen.getByRole("button", { name: /rose picnic/i }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(useBoardStore.getState().board?.theme).toBe("cozy-cabin");
  });
});
