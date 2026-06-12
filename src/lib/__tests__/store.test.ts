import { beforeEach, describe, expect, it } from "vitest";
import { useBoardStore } from "../store";
import type { BoardItem } from "../types";

function makeItem(overrides: Partial<BoardItem> = {}): BoardItem {
  return {
    id: "item-1",
    board_id: "board-1",
    kind: "note",
    content: "hi",
    photo_path: null,
    paper: "butter",
    x: 0,
    y: 0,
    rotation: 0,
    created_by: "user-1",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

beforeEach(() => {
  useBoardStore.setState({
    board: null,
    items: [],
    profiles: {},
    readOnly: false,
    view: "room",
    focus: { x: 0, y: 0 },
    zoom: 1,
    draggingId: null,
    editingId: null,
    composer: null,
    themePickerOpen: false,
  });
});

describe("camera state", () => {
  it("walks up and steps back", () => {
    useBoardStore.getState().walkUp({ x: 0.4, y: -0.2 });
    expect(useBoardStore.getState().view).toBe("board");
    expect(useBoardStore.getState().focus).toEqual({ x: 0.4, y: -0.2 });

    useBoardStore.getState().stepBack();
    const s = useBoardStore.getState();
    expect(s.view).toBe("room");
    expect(s.focus).toEqual({ x: 0, y: 0 });
    expect(s.zoom).toBe(1);
  });

  it("stepping back closes any open panels", () => {
    useBoardStore.getState().setComposer("note");
    useBoardStore.getState().stepBack();
    expect(useBoardStore.getState().composer).toBeNull();
  });

  it("clamps zoom to sensible bounds", () => {
    useBoardStore.getState().setZoom(100);
    expect(useBoardStore.getState().zoom).toBeLessThanOrEqual(2.4);
    useBoardStore.getState().setZoom(0.01);
    expect(useBoardStore.getState().zoom).toBeGreaterThanOrEqual(0.7);
  });

  it("clamps focus so the camera cannot wander off the board", () => {
    useBoardStore.getState().setFocus({ x: 9, y: -9 });
    expect(useBoardStore.getState().focus).toEqual({ x: 1, y: -1 });
  });
});

describe("items", () => {
  it("upsert inserts new items and replaces existing ones", () => {
    const store = useBoardStore.getState();
    store.upsertItem(makeItem());
    store.upsertItem(makeItem({ content: "updated" }));
    const items = useBoardStore.getState().items;
    expect(items).toHaveLength(1);
    expect(items[0].content).toBe("updated");
  });

  it("moveItemLocal only touches the targeted item", () => {
    const store = useBoardStore.getState();
    store.setItems([makeItem(), makeItem({ id: "item-2" })]);
    store.moveItemLocal("item-2", 0.5, 0.6);
    const [a, b] = useBoardStore.getState().items;
    expect(a.x).toBe(0);
    expect(b.x).toBe(0.5);
    expect(b.y).toBe(0.6);
  });

  it("removing an item also clears its editing/dragging state", () => {
    const store = useBoardStore.getState();
    store.setItems([makeItem()]);
    store.setEditing("item-1");
    store.setDragging("item-1");
    store.removeItem("item-1");
    const s = useBoardStore.getState();
    expect(s.items).toHaveLength(0);
    expect(s.editingId).toBeNull();
    expect(s.draggingId).toBeNull();
  });
});

describe("panel exclusivity", () => {
  it("only one of editor / composer / theme picker can be open", () => {
    const store = useBoardStore.getState();
    store.setEditing("item-1");
    store.setComposer("photo");
    expect(useBoardStore.getState().editingId).toBeNull();
    expect(useBoardStore.getState().composer).toBe("photo");

    store.setThemePickerOpen(true);
    expect(useBoardStore.getState().composer).toBeNull();
    expect(useBoardStore.getState().themePickerOpen).toBe(true);
  });
});
