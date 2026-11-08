import { beforeEach, describe, expect, it } from "vitest";
import {
  selectDisplayedThemeId,
  selectLocked,
  selectSceneItems,
  selectSceneThemeId,
  useBoardStore,
} from "../store";
import { DEV_PREVIEW_KEY, NO_PREVIEW } from "../dev-preview";
import type { Board } from "../types";
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
    fixture_id: null,
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
    focusMaxX: 1,
    zoom: 1,
    roomLook: { yaw: 0, pitch: 0 },
    suppressNextWalkUp: false,
    suppressNextTap: false,
    mode: "view",
    selectedId: null,
    draggingId: null,
    resizingId: null,
    editingId: null,
    heldId: null,
    composer: null,
    addMenuOpen: false,
    themePickerOpen: false,
    themeView: "primary",
    isDev: false,
    devPreview: NO_PREVIEW,
  });
  window.localStorage.clear();
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
    expect(useBoardStore.getState().zoom).toBeLessThanOrEqual(5);
    useBoardStore.getState().setZoom(0.01);
    expect(useBoardStore.getState().zoom).toBeGreaterThanOrEqual(0.45);
  });

  it("nudgeZoom multiplies and stays clamped", () => {
    useBoardStore.setState({ zoom: 1 });
    useBoardStore.getState().nudgeZoom(1.25);
    expect(useBoardStore.getState().zoom).toBeCloseTo(1.25, 5);
    // repeated zoom-in never exceeds the clamp
    for (let i = 0; i < 20; i++) useBoardStore.getState().nudgeZoom(1.25);
    expect(useBoardStore.getState().zoom).toBe(5);
  });

  it("clamps focus so the camera cannot wander off the board", () => {
    useBoardStore.getState().setFocus({ x: 9, y: -9 });
    expect(useBoardStore.getState().focus).toEqual({ x: 1, y: -1 });
  });

  it("lets focus pan past the main board when a mini board exists", () => {
    useBoardStore.getState().setFocusMaxX(2.9);
    useBoardStore.getState().setFocus({ x: 9, y: 0 });
    expect(useBoardStore.getState().focus.x).toBe(2.9);
    // back to a normal theme, the old clamp applies again
    useBoardStore.getState().setFocusMaxX(1);
    useBoardStore.getState().setFocus({ x: 9, y: 0 });
    expect(useBoardStore.getState().focus.x).toBe(1);
  });

  it("clamps the new wider zoom range", () => {
    useBoardStore.getState().setZoom(100);
    expect(useBoardStore.getState().zoom).toBe(5);
    useBoardStore.getState().setZoom(0.01);
    expect(useBoardStore.getState().zoom).toBe(0.45);
  });

  it("clamps room look-around angles", () => {
    useBoardStore.getState().setRoomLook({ yaw: 5, pitch: -5 });
    const { yaw, pitch } = useBoardStore.getState().roomLook;
    expect(yaw).toBe(1.05);
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

describe("held item", () => {
  it("holding an item closes the editor, and vice-versa", () => {
    const store = useBoardStore.getState();
    store.setEditing("item-1");
    store.setHeld("item-2");
    expect(useBoardStore.getState().editingId).toBeNull();
    expect(useBoardStore.getState().heldId).toBe("item-2");

    store.setEditing("item-1");
    expect(useBoardStore.getState().heldId).toBeNull();
    expect(useBoardStore.getState().editingId).toBe("item-1");
  });

  it("stepping back and removing an item clear the held item", () => {
    const store = useBoardStore.getState();
    store.setItems([makeItem()]);
    store.setHeld("item-1");
    store.removeItem("item-1");
    expect(useBoardStore.getState().heldId).toBeNull();

    store.setHeld("item-2");
    store.stepBack();
    expect(useBoardStore.getState().heldId).toBeNull();
  });
});

describe("dev preview (BB-36)", () => {
  const board = {
    id: "board-1",
    theme: "cozy-cabin",
    secondary_theme: "haunted-hollow",
  } as Board;

  it("never changes the scene for someone who isn't the developer", () => {
    useBoardStore.setState({
      board,
      isDev: false,
      devPreview: { ...NO_PREVIEW, themeId: "beach-hut" },
    });
    const s = useBoardStore.getState();
    expect(selectSceneThemeId(s)).toBe("cozy-cabin");
    expect(selectDisplayedThemeId(s)).toBe("cozy-cabin");
  });

  it("shows the developer the previewed theme in the scene only", () => {
    useBoardStore.setState({ board, isDev: true });
    useBoardStore.getState().setDevPreview({ themeId: "beach-hut" });
    const s = useBoardStore.getState();
    expect(selectSceneThemeId(s)).toBe("beach-hut");
    // The composer and editor follow the real theme, so a note written
    // mid-preview is saved with the real theme's papers.
    expect(selectDisplayedThemeId(s)).toBe("cozy-cabin");
  });

  it("sits on top of the second-theme switch and falls back to it", () => {
    useBoardStore.setState({ board, isDev: true, themeView: "secondary" });
    expect(selectSceneThemeId(useBoardStore.getState())).toBe("haunted-hollow");
    useBoardStore.getState().setDevPreview({ themeId: "beach-hut" });
    expect(selectSceneThemeId(useBoardStore.getState())).toBe("beach-hut");
    useBoardStore.getState().setDevPreview({ themeId: null });
    expect(selectSceneThemeId(useBoardStore.getState())).toBe("haunted-hollow");
  });

  it("merges changes and remembers them on this device, not the board", () => {
    useBoardStore.setState({ board, isDev: true });
    const { setDevPreview } = useBoardStore.getState();
    setDevPreview({ themeId: "stars-hollow" });
    setDevPreview({ phase: "night" });
    expect(useBoardStore.getState().devPreview).toEqual({
      themeId: "stars-hollow",
      phase: "night",
      sampleNotes: false,
    });
    expect(JSON.parse(window.localStorage.getItem(DEV_PREVIEW_KEY)!)).toMatchObject({
      themeId: "stars-hollow",
      phase: "night",
    });
    expect(useBoardStore.getState().board).toBe(board);
  });
});

describe("the board is view-only during a dev preview (BB-36)", () => {
  it("locks while the developer previews anything", () => {
    useBoardStore.setState({ isDev: true });
    expect(selectLocked(useBoardStore.getState())).toBe(false);
    for (const patch of [
      { themeId: "beach-hut" },
      { phase: "night" as const },
      { sampleNotes: true },
    ]) {
      useBoardStore.setState({ devPreview: { ...NO_PREVIEW, ...patch } });
      expect(selectLocked(useBoardStore.getState())).toBe(true);
    }
  });

  it("never locks for anyone else", () => {
    useBoardStore.setState({
      isDev: false,
      devPreview: { ...NO_PREVIEW, themeId: "beach-hut" },
    });
    expect(selectLocked(useBoardStore.getState())).toBe(false);
  });

  it("is still locked on a memory, preview or not", () => {
    useBoardStore.setState({ readOnly: true });
    expect(selectLocked(useBoardStore.getState())).toBe(true);
  });

  it("drops out of editing when a preview starts", () => {
    useBoardStore.setState({
      isDev: true,
      mode: "edit",
      selectedId: "a",
      editingId: "a",
      composer: "note",
      addMenuOpen: true,
    });
    useBoardStore.getState().setDevPreview({ themeId: "beach-hut" });
    const s = useBoardStore.getState();
    expect(s.mode).toBe("view");
    expect(s.selectedId).toBeNull();
    expect(s.editingId).toBeNull();
    expect(s.composer).toBeNull();
    expect(s.addMenuOpen).toBe(false);
  });

  it("leaves editing alone when the preview is turned off", () => {
    useBoardStore.setState({ isDev: true, mode: "edit" });
    useBoardStore.getState().setDevPreview(NO_PREVIEW);
    expect(useBoardStore.getState().mode).toBe("edit");
  });
});

describe("a dev preview hides the board's notes from the scene (BB-36)", () => {
  const items = [makeItem({ id: "a" }), makeItem({ id: "b" })];

  it("draws none of the board's items while previewing, but keeps them all", () => {
    useBoardStore.setState({ items, isDev: true });
    useBoardStore.getState().setDevPreview({ themeId: "christmas-cabin" });
    const s = useBoardStore.getState();
    expect(selectSceneItems(s)).toEqual([]);
    // The board's items are untouched: nothing removed, nothing changed.
    expect(s.items).toBe(items);
  });

  it("keeps up with realtime while hidden, and shows everything after", () => {
    useBoardStore.setState({ items, isDev: true });
    useBoardStore.getState().setDevPreview({ sampleNotes: true });
    // The other person pins something mid-preview.
    useBoardStore.getState().upsertItem(makeItem({ id: "c" }));
    expect(selectSceneItems(useBoardStore.getState())).toEqual([]);
    useBoardStore.getState().setDevPreview(NO_PREVIEW);
    expect(selectSceneItems(useBoardStore.getState()).map((i) => i.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("always draws everything for someone who isn't the developer", () => {
    useBoardStore.setState({
      items,
      isDev: false,
      devPreview: { ...NO_PREVIEW, themeId: "christmas-cabin" },
    });
    expect(selectSceneItems(useBoardStore.getState())).toBe(items);
  });
});
