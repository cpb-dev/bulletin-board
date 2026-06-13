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
    scale: 1,
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
    roomLook: { yaw: 0, pitch: 0 },
    suppressNextWalkUp: false,
    suppressNextTap: false,
    mode: "view",
    selectedId: null,
    draggingId: null,
    resizingId: null,
    editingId: null,
    composer: null,
    addMenuOpen: false,
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
    expect(useBoardStore.getState().zoom).toBeLessThanOrEqual(3.6);
    useBoardStore.getState().setZoom(0.01);
    expect(useBoardStore.getState().zoom).toBeGreaterThanOrEqual(0.8);
  });

  it("nudgeZoom multiplies and stays clamped", () => {
    useBoardStore.setState({ zoom: 1 });
    useBoardStore.getState().nudgeZoom(1.25);
    expect(useBoardStore.getState().zoom).toBeCloseTo(1.25, 5);
    // repeated zoom-in never exceeds the clamp
    for (let i = 0; i < 20; i++) useBoardStore.getState().nudgeZoom(1.25);
    expect(useBoardStore.getState().zoom).toBe(3.6);
  });

  it("clamps focus so the camera cannot wander off the board", () => {
    useBoardStore.getState().setFocus({ x: 9, y: -9 });
    expect(useBoardStore.getState().focus).toEqual({ x: 1, y: -1 });
  });

  it("clamps the new wider zoom range", () => {
    useBoardStore.getState().setZoom(100);
    expect(useBoardStore.getState().zoom).toBe(3.6);
    useBoardStore.getState().setZoom(0.01);
    expect(useBoardStore.getState().zoom).toBe(0.8);
  });

  it("clamps room look-around angles", () => {
    useBoardStore.getState().setRoomLook({ yaw: 5, pitch: -5 });
    const { yaw, pitch } = useBoardStore.getState().roomLook;
    expect(yaw).toBe(0.7);
    expect(pitch).toBe(-0.32);
  });

  it("resets mode, look and selection when stepping back", () => {
    const s = useBoardStore.getState();
    s.setMode("edit");
    s.setSelected("item-1");
    s.setRoomLook({ yaw: 0.5, pitch: 0.2 });
    useBoardStore.getState().stepBack();
    const after = useBoardStore.getState();
    expect(after.mode).toBe("view");
    expect(after.selectedId).toBeNull();
    expect(after.roomLook).toEqual({ yaw: 0, pitch: 0 });
  });
});

describe("edit mode", () => {
  it("entering edit keeps any selection, leaving edit clears it", () => {
    const s = useBoardStore.getState();
    s.setMode("edit");
    s.setSelected("item-1");
    expect(useBoardStore.getState().selectedId).toBe("item-1");
    s.setMode("view");
    expect(useBoardStore.getState().selectedId).toBeNull();
  });

  it("scaleItemLocal clamps and only touches the target", () => {
    const s = useBoardStore.getState();
    s.setItems([makeItem(), makeItem({ id: "item-2" })]);
    s.scaleItemLocal("item-2", 99);
    const [a, b] = useBoardStore.getState().items;
    expect(a.scale).toBe(1);
    expect(b.scale).toBe(2.4); // clamped to MAX_ITEM_SCALE
  });

  it("removing the selected item clears the selection", () => {
    const s = useBoardStore.getState();
    s.setItems([makeItem()]);
    s.setMode("edit");
    s.setSelected("item-1");
    s.removeItem("item-1");
    expect(useBoardStore.getState().selectedId).toBeNull();
  });
});

describe("add menu exclusivity", () => {
  it("opening the add menu closes other panels", () => {
    const s = useBoardStore.getState();
    s.setThemePickerOpen(true);
    s.setAddMenuOpen(true);
    expect(useBoardStore.getState().themePickerOpen).toBe(false);
    expect(useBoardStore.getState().addMenuOpen).toBe(true);
  });

  it("choosing a composer closes the add menu", () => {
    const s = useBoardStore.getState();
    s.setAddMenuOpen(true);
    s.setComposer("note");
    expect(useBoardStore.getState().addMenuOpen).toBe(false);
    expect(useBoardStore.getState().composer).toBe("note");
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
