import { create } from "zustand";
import type { Board, BoardItem, Profile } from "./types";

export type ViewMode = "room" | "board";
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
  zoom: number;

  draggingId: string | null;
  editingId: string | null;
  composer: ComposerMode;
  themePickerOpen: boolean;

  setBoard: (board: Board | null) => void;
  setItems: (items: BoardItem[]) => void;
  setProfiles: (profiles: Record<string, Profile>) => void;
  setReadOnly: (readOnly: boolean) => void;

  walkUp: (focus?: { x: number; y: number }) => void;
  stepBack: () => void;
  setFocus: (focus: { x: number; y: number }) => void;
  setZoom: (zoom: number) => void;

  setDragging: (id: string | null) => void;
  setEditing: (id: string | null) => void;
  setComposer: (mode: ComposerMode) => void;
  setThemePickerOpen: (open: boolean) => void;

  upsertItem: (item: BoardItem) => void;
  removeItem: (id: string) => void;
  moveItemLocal: (id: string, x: number, y: number) => void;
}

const clampZoom = (z: number) => Math.min(2.4, Math.max(0.7, z));
const clampFocus = (v: number) => Math.min(1, Math.max(-1, v));

export const useBoardStore = create<BoardState>((set) => ({
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
      editingId: null,
      composer: null,
      themePickerOpen: false,
    }),
  setFocus: (focus) =>
    set({ focus: { x: clampFocus(focus.x), y: clampFocus(focus.y) } }),
  setZoom: (zoom) => set({ zoom: clampZoom(zoom) }),

  setDragging: (draggingId) => set({ draggingId }),
  setEditing: (editingId) =>
    set({ editingId, composer: null, themePickerOpen: false }),
  setComposer: (composer) =>
    set({ composer, editingId: null, themePickerOpen: false }),
  setThemePickerOpen: (themePickerOpen) =>
    set({ themePickerOpen, editingId: null, composer: null }),

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
      draggingId: s.draggingId === id ? null : s.draggingId,
    })),
  moveItemLocal: (id, x, y) =>
    set((s) => ({
      items: s.items.map((i) => (i.id === id ? { ...i, x, y } : i)),
    })),
}));
