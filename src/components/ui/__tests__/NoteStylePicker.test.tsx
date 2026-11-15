import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NoteStylePicker } from "../NoteStylePicker";
import { getTheme } from "@/themes";

function renderPicker(themeId: string, onShape = vi.fn(), onPaper = vi.fn()) {
  const theme = getTheme(themeId);
  render(
    <NoteStylePicker
      theme={theme}
      paper={theme.papers[0].id}
      shape="square"
      onPaper={onPaper}
      onShape={onShape}
    />
  );
  return { theme, onShape, onPaper };
}

describe("NoteStylePicker — theme extras (BB-46)", () => {
  it("offers the Christmas tree on Christmas Cabin", async () => {
    const { onShape } = renderPicker("christmas-cabin");
    await userEvent.click(screen.getByRole("button", { name: "Christmas tree shape" }));
    expect(onShape).toHaveBeenCalledWith("tree");
  });

  it("leaves every other theme's shapes exactly as they were", () => {
    renderPicker("cozy-cabin");
    expect(screen.queryByRole("button", { name: "Christmas tree shape" })).toBeNull();
    const shapes = screen.getAllByRole("button", { name: / shape$/ }).map((b) => b.getAttribute("title"));
    expect(shapes).toEqual(["Square", "Heart", "Circle", "Cloud", "Star", "Torn page"]);
  });

  it("shows printed papers with their print, plain papers as a flat colour", async () => {
    const { onPaper } = renderPicker("christmas-cabin");
    const candy = screen.getByRole("button", { name: "Candy cane" });
    expect(candy.style.background).toContain("repeating-linear-gradient");
    const snow = screen.getByRole("button", { name: "Snow" });
    expect(snow.style.background).not.toContain("gradient");
    await userEvent.click(candy);
    expect(onPaper).toHaveBeenCalledWith("candy-cane");
  });
});
