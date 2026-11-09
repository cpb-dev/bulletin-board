import { beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { selectSceneItems, useBoardStore } from "@/lib/store";
import { NO_PREVIEW } from "@/lib/dev-preview";
import type { BoardItem } from "@/lib/types";

/** What BoardExperience does: subscribe to the scene's items. */
function SceneItems() {
  const items = useBoardStore(selectSceneItems);
  return <p data-testid="count">{items.length}</p>;
}

const item = { id: "a", kind: "note" } as BoardItem;

beforeEach(() => {
  useBoardStore.setState({ items: [item], isDev: false, devPreview: NO_PREVIEW });
});

describe("subscribing to the scene's items (BB-36)", () => {
  it("renders during a dev preview without looping", () => {
    // A selector that hands back a new [] on every call makes React 19
    // re-render forever ("Maximum update depth exceeded"): the crash a
    // remembered preview caused on load.
    useBoardStore.setState({
      isDev: true,
      devPreview: { ...NO_PREVIEW, themeId: "christmas-cabin" },
    });
    render(<SceneItems />);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
  });

  it("renders the board's items otherwise", () => {
    render(<SceneItems />);
    expect(screen.getByTestId("count")).toHaveTextContent("1");
  });

  it("hands back the same empty list every time while previewing", () => {
    useBoardStore.setState({ isDev: true, devPreview: { ...NO_PREVIEW, sampleNotes: true } });
    const s = useBoardStore.getState();
    expect(selectSceneItems(s)).toBe(selectSceneItems(s));
  });
});
