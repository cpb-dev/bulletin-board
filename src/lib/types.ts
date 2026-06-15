export type BoardStatus = "active" | "archived";
export type ItemKind = "note" | "photo";

export interface Profile {
  id: string;
  display_name: string;
  created_at: string;
}

export interface Board {
  id: string;
  title: string;
  theme: string;
  status: BoardStatus;
  /** The main board that always shows at /board (only one at a time). */
  is_primary: boolean;
  /** "standard" or "worldcup" (the special temporary board). */
  kind: string;
  created_by: string | null;
  created_at: string;
  archived_at: string | null;
}

export interface BoardItem {
  id: string;
  board_id: string;
  kind: ItemKind;
  content: string;
  photo_path: string | null;
  paper: string;
  x: number;
  y: number;
  rotation: number;
  /** Size multiplier set in edit mode (1 = default). */
  scale: number;
  /** Set when this note tracks a World Cup fixture (keeps its score live). */
  fixture_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

/** Everything needed to recreate a board, used for keepsake exports. */
export interface BoardExport {
  exported_at: string;
  app: string;
  board: Board;
  items: BoardItem[];
}

// ---------- Lists (separate to boards) ----------

export interface List {
  id: string;
  title: string;
  status: BoardStatus;
  created_by: string | null;
  created_at: string;
  archived_at: string | null;
}

export interface ListItem {
  id: string;
  list_id: string;
  content: string;
  done: boolean;
  position: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ---------- Push notifications ----------

export interface PushSubscriptionRow {
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}
