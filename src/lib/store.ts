import { create } from "zustand";
import { clampScale, type PlacementView } from "./board-geometry";
import {
  displayedThemeId,
  writeThemeView,
  type ThemeView,
} from "./theme-view";
import type { Board, BoardItem, Profile } from "./types";
import type { Fixture } from "./worldcup";

export type ViewMode = "room" | "board";
/** What pointer drags do on the board. */
export type InteractionMode = "view" | "edit";
export type ComposerMode = "note" | "photo" | null;

interface BoardState {
  board: Board | null;
  items: BoardItem[];
  profiles: Record<string, Profile>;
  readOnly: boolean;

  /** Camera: pulled back in the room, or walked up to the board. */
  view: ViewMode;
  /** Where on the board the close-up camera is looking (normalized). */
  focus: { x: number; y: number };
  /** How far right you can pan (1 = main board; larger = mini board). */
  focusMaxX: number;
  zoom: number;
  /** Head turn while standing back in the room (radians). */
  roomLook: { yaw: number; pitch: number };
  /** Set true by a room look-around drag to cancel the trailing walk-up tap. */
  suppressNextWalkUp: boolean;
  /** Set true by a board pan so the trailing tap doesn't open a note. */
  suppressNextTap: boolean;

  /** In edit mode, dragging moves/resizes notes; in view mode it pans. */
  mode: InteractionMode;
  selectedId: string | null;

  draggingId: string | null;
  resizingId: string | null;
  editingId: string | null;
  /** Item lifted up for a close-up "held in your hand" look (read-only). */
  heldId: string | null;
  composer: ComposerMode;
  addMenuOpen: boolean;
  themePickerOpen: boolean;
  /** Which of the board's themes this person is looking at (BB-3). */
  themeView: ThemeView;

  setBoard: (board: Board | null) => void;
  setItems: (items: BoardItem[]) => void;
  setProfiles: (profiles: Record<string, Profile>) => void;
  setReadOnly: (readOnly: boolean) => void;

  walkUp: (focus?: { x: number; y: number }) => void;
  stepBack: () => void;
  setFocus: (focus: { x: number; y: number }) => void;
  setFocusMaxX: (max: number) => void;
  setZoom: (zoom: number) => void;
  setRoomLook: (look: { yaw: number; pitch: number }) => void;
  setSuppressNextWalkUp: (suppress: boolean) => void;
  setSuppressNextTap: (suppress: boolean) => void;
  nudgeZoom: (factor: number) => void;

  setMode: (mode: InteractionMode) => void;
  setSelected: (id: string | null) => void;

  setDragging: (id: string | null) => void;
  setResizing: (id: string | null) => void;
  setEditing: (id: string | null) => void;
  setHeld: (id: string | null) => void;
  setComposer: (mode: ComposerMode) => void;
  setAddMenuOpen: (open: boolean) => void;
  setThemePickerOpen: (open: boolean) => void;
  /** Set the view without remembering it (e.g. restoring it on load). */
  setThemeView: (view: ThemeView) => void;
  /** Flip between main and secondary, remembered on this device. */
  toggleThemeView: () => void;

  upsertItem: (item: BoardItem) => void;
  removeItem: (id: string) => void;
  moveItemLocal: (id: string, x: number, y: number) => void;
  scaleItemLocal: (id: string, scale: number) => void;

  /** Live World Cup fixtures, keyed by id (only used on the WC board). */
  worldCupFixtures: Record<string, Fixture>;
  setWorldCupFixtures: (fixtures: Record<string, Fixture>) => void;
}

const clampZoom = (z: number) => Math.min(5, Math.max(0.45, z));
const clampFocus = (v: number) => Math.min(1, Math.max(-1, v));
// Wide enough to bring the "your day" mini board into view from the room.
const clampYaw = (v: number) => Math.min(1.05, Math.max(-1.05, v));
const clampPitch = (v: number) => Math.min(0.32, Math.max(-0.32, v));

export const useBoardStore = create<BoardState>((set) => ({
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

  setBoard: (board) => set({ board }),
  setItems: (items) => set({ items }),
  setProfiles: (profiles) => set({ profiles }),
  setReadOnly: (readOnly) => set({ readOnly }),

  walkUp: (focus) =>
    set((s) => ({
      view: "board",
      focus: focus ?? s.focus,
    })),
  stepBack: () =>
    set({
      view: "room",
      zoom: 1,
      focus: { x: 0, y: 0 },
      roomLook: { yaw: 0, pitch: 0 },
      mode: "view",
      selectedId: null,
      editingId: null,
      heldId: null,
      composer: null,
      addMenuOpen: false,
      themePickerOpen: false,
    }),
  setFocus: (focus) =>
    set((s) => ({
      focus: {
        x: Math.min(s.focusMaxX, Math.max(-1, focus.x)),
        y: clampFocus(focus.y),
      },
    })),
  setFocusMaxX: (focusMaxX) => set({ focusMaxX }),
  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),
  setRoomLook: (look) =>
    set({
      roomLook: { yaw: clampYaw(look.yaw), pitch: clampPitch(look.pitch) },
    }),
  setSuppressNextWalkUp: (suppressNextWalkUp) => set({ suppressNextWalkUp }),
  setSuppressNextTap: (suppressNextTap) => set({ suppressNextTap }),
  nudgeZoom: (factor) => set((s) => ({ zoom: clampZoom(s.zoom * factor) })),

  setMode: (mode) =>
    set((s) => ({
      mode,
      // leaving edit mode drops any selection/handles
      selectedId: mode === "edit" ? s.selectedId : null,
      addMenuOpen: false,
    })),
  setSelected: (selectedId) => set({ selectedId }),

  setDragging: (draggingId) => set({ draggingId }),
  setResizing: (resizingId) => set({ resizingId }),
  setEditing: (editingId) =>
    set({
      editingId,
      heldId: null,
      composer: null,
      addMenuOpen: false,
      themePickerOpen: false,
    }),
  setHeld: (heldId) =>
    set({
      heldId,
      editingId: null,
      composer: null,
      addMenuOpen: false,
      themePickerOpen: false,
    }),
  setComposer: (composer) =>
    set({
      composer,
      editingId: null,
      heldId: null,
      addMenuOpen: false,
      themePickerOpen: false,
    }),
  setAddMenuOpen: (addMenuOpen) =>
    set({
      addMenuOpen,
      composer: null,
      editingId: null,
      themePickerOpen: false,
    }),
  setThemePickerOpen: (themePickerOpen) =>
    set({
      themePickerOpen,
      editingId: null,
      composer: null,
      addMenuOpen: false,
    }),
  setThemeView: (themeView) => set({ themeView }),
  toggleThemeView: () =>
    set((s) => {
      const themeView: ThemeView =
        s.themeView === "secondary" ? "primary" : "secondary";
      if (s.board) writeThemeView(s.board.id, themeView);
      return { themeView };
    }),

  upsertItem: (item) =>
    set((s) => {
      const idx = s.items.findIndex((i) => i.id === item.id);
      if (idx === -1) return { items: [...s.items, item] };
      const items = s.items.slice();
      items[idx] = item;
      return { items };
    }),
  removeItem: (id) =>
    set((s) => ({
      items: s.items.filter((i) => i.id !== id),
      editingId: s.editingId === id ? null : s.editingId,
      heldId: s.heldId === id ? null : s.heldId,
      draggingId: s.draggingId === id ? null : s.draggingId,
      selectedId: s.selectedId === id ? null : s.selectedId,
    })),
  moveItemLocal: (id, x, y) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, x, y } : i)),
    })),
  scaleItemLocal: (id, scale) =>
    set((s) => ({
      items: s.items.map((i) =>
        i.id === id ? { ...i, scale: clampScale(scale) } : i
      ),
    })),

  worldCupFixtures: {},
  setWorldCupFixtures: (worldCupFixtures) => set({ worldCupFixtures }),
}));

/**
 * The theme id actually on screen: the board's main theme, or its
 * secondary when this person has switched to it. Use with
 * `useBoardStore(selectDisplayedThemeId)` wherever the theme's look
 * matters (scene, papers).
 */
export function selectDisplayedThemeId(
  s: Pick<BoardState, "board" | "themeView">
): string | undefined {
  return displayedThemeId(s.board, s.themeView);
}

/**
 * Camera framing for `suggestPlacement`, so a new item lands where the
 * user is looking rather than at the far end of the board. Undefined
 * while standing back in the room — from there the whole board is in
 * view, so the old spread-them-out behaviour is the right one.
 */
export function currentPlacementView(
  s: BoardState = useBoardStore.getState()
): PlacementView | undefined {
  if (s.view !== "board") return undefined;
  const aspect =
    typeof window !== "undefined" && window.innerHeight > 0
      ? window.innerWidth / window.innerHeight
      : 1;
  return { focus: s.focus, zoom: s.zoom, aspect, maxNx: s.focusMaxX };
}
