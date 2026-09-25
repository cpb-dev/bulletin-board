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
  /**
   * An optional second theme each person can switch the board to (BB-3).
   * Optional in the type because boards exported or archived before
   * migration 0008 don't carry the column at all.
   */
  secondary_theme?: string | null;
  status: BoardStatus;
  /** The main board that always shows at /board (only one at a time). */
  is_primary: boolean;
  /** "standard" or "worldcup" (the special temporary board). */
  kind: string;
  /** Surprise boards: visible only to this user until reveal_at. */
  private_to: string | null;
  /** When the board becomes visible to everyone (RLS flips by time). */
  reveal_at: string | null;
  /** Personal message pushed to the other member at reveal time. */
  reveal_message: string | null;
  /** Stamped once the reveal notification has been sent. */
  revealed_at: string | null;
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
  /**
   * The note's silhouette (BB-24), separate from its paper colour. Null
   * or missing on every note from before migration 0009, and whenever the
   * paper already implies the shape — see `resolveNoteShape`.
   */
  shape?: string | null;
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
  /** Display names, so an exported note keeps its "posted by" stamp. */
  profiles?: Record<string, Profile>;
  /** Where each photo was written in the export folder. */
  photos?: { path: string; file: string }[];
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
