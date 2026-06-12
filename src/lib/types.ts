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
