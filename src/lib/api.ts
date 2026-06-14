/**
 * Data access layer. Every function takes the Supabase client as its
 * first argument so the whole module is unit-testable with a mock.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Board, BoardExport, BoardItem, Profile } from "./types";
import { DEFAULT_THEME_ID } from "./themes";
import {
  WORLD_CUP,
  WORLD_CUP_THEME_ID,
  worldCupArchiveDue,
} from "./worldcup";

export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME || "Our Little Board";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 1 day

function fail(message: string | undefined, fallback: string): never {
  throw new Error(message || fallback);
}

// ---------- Boards ----------

/**
 * Fetch the primary board (the one that always shows at /board),
 * creating it on first ever visit. If boards exist but none is flagged
 * primary (e.g. just after the migration), the oldest active board is
 * promoted.
 */
export async function getPrimaryBoard(
  supabase: SupabaseClient
): Promise<Board> {
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("status", "active")
    .eq("is_primary", true)
    .limit(1);
  if (error) fail(error.message, "Could not load the board.");
  if (data && data.length > 0) return data[0] as Board;

  // No primary yet — promote the oldest active board, or create one.
  // The World Cup board is never eligible to be the primary.
  const { data: actives } = await supabase
    .from("boards")
    .select("*")
    .eq("status", "active")
    .neq("kind", "worldcup")
    .order("created_at", { ascending: true })
    .limit(1);
  if (actives && actives.length > 0) {
    const board = actives[0] as Board;
    await supabase
      .from("boards")
      .update({ is_primary: true })
      .eq("id", board.id);
    return { ...board, is_primary: true };
  }
  return createBoard(supabase, "Our board", DEFAULT_THEME_ID, true);
}

/** @deprecated use getPrimaryBoard — kept for back-compat. */
export async function getOrCreateActiveBoard(
  supabase: SupabaseClient
): Promise<Board> {
  return getPrimaryBoard(supabase);
}

export async function createBoard(
  supabase: SupabaseClient,
  title: string,
  theme: string,
  isPrimary = false,
  kind: string = "standard"
): Promise<Board> {
  const { data, error } = await supabase
    .from("boards")
    .insert({ title, theme, is_primary: isPrimary, kind })
    .select()
    .single();
  if (error || !data) fail(error?.message, "Could not create a board.");
  return data as Board;
}

/** Create an extra (non-primary) board the couple can switch to. */
export async function createAdditionalBoard(
  supabase: SupabaseClient,
  title: string,
  theme: string = DEFAULT_THEME_ID
): Promise<Board> {
  return createBoard(supabase, title.trim() || "New board", theme, false);
}

export async function getBoard(
  supabase: SupabaseClient,
  id: string
): Promise<Board | null> {
  const { data } = await supabase
    .from("boards")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as Board) ?? null;
}

/** All active *standard* boards, primary first, then newest. */
export async function listActiveBoards(
  supabase: SupabaseClient
): Promise<Board[]> {
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("status", "active")
    .neq("kind", "worldcup")
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });
  if (error) fail(error.message, "Could not load your boards.");
  return (data ?? []) as Board[];
}

// ---------- World Cup board (temporary, self-contained) ----------

/** The active World Cup board, if one exists. */
export async function getWorldCupBoard(
  supabase: SupabaseClient
): Promise<Board | null> {
  const { data } = await supabase
    .from("boards")
    .select("*")
    .eq("kind", "worldcup")
    .eq("status", "active")
    .limit(1);
  return (data?.[0] as Board) ?? null;
}

/**
 * Archive the World Cup board once the tournament's grace period has
 * passed (so it slips into Memories on its own). No-op otherwise.
 */
export async function sweepWorldCup(supabase: SupabaseClient): Promise<void> {
  if (!worldCupArchiveDue()) return;
  await supabase
    .from("boards")
    .update({ status: "archived", archived_at: new Date().toISOString() })
    .eq("kind", "worldcup")
    .eq("status", "active");
}

/**
 * Load the World Cup board (creating it on first open), or null if the
 * tournament is over — in which case it's archived into Memories.
 */
export async function getOrCreateWorldCupBoard(
  supabase: SupabaseClient
): Promise<Board | null> {
  if (worldCupArchiveDue()) {
    await sweepWorldCup(supabase);
    return null;
  }
  const existing = await getWorldCupBoard(supabase);
  if (existing) return existing;
  return createBoard(supabase, WORLD_CUP.name, WORLD_CUP_THEME_ID, false, "worldcup");
}

export async function listArchivedBoards(
  supabase: SupabaseClient
): Promise<Board[]> {
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("status", "archived")
    .order("archived_at", { ascending: false });
  if (error) fail(error.message, "Could not load your memories.");
  return (data ?? []) as Board[];
}

/** Give a board a new display name. */
export async function renameBoard(
  supabase: SupabaseClient,
  boardId: string,
  title: string
): Promise<void> {
  const { error } = await supabase
    .from("boards")
    .update({ title: title.trim() || "Our board" })
    .eq("id", boardId);
  if (error) fail(error.message, "Could not rename the board.");
}

/**
 * Save an additional board as a memory (archive it). Never used on the
 * primary board — that uses archiveBoardAndStartFresh.
 */
export async function archiveBoard(
  supabase: SupabaseClient,
  boardId: string,
  keepsakeTitle: string
): Promise<void> {
  const { error } = await supabase
    .from("boards")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      is_primary: false,
      title: keepsakeTitle.trim() || "A memory",
    })
    .eq("id", boardId);
  if (error) fail(error.message, "Could not save the board as a memory.");
}

/**
 * "Back up" the primary board: freeze it as a memory and start a fresh
 * primary board in its place. Returns the new primary board.
 */
export async function archiveBoardAndStartFresh(
  supabase: SupabaseClient,
  boardId: string,
  options: { keepsakeTitle: string; nextTitle: string; nextTheme: string }
): Promise<Board> {
  // Clear primary on the outgoing board first so the new one can take it.
  const { error } = await supabase
    .from("boards")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      is_primary: false,
      title: options.keepsakeTitle,
    })
    .eq("id", boardId);
  if (error) fail(error.message, "Could not save the board as a memory.");
  return createBoard(supabase, options.nextTitle, options.nextTheme, true);
}

/**
 * Restore a saved (archived) board and make it the main board. The
 * current primary is demoted to a regular active board so nothing is
 * lost. Only the single-primary index is respected by clearing it first.
 */
export async function promoteBoardToMain(
  supabase: SupabaseClient,
  boardId: string
): Promise<void> {
  // Demote whoever is currently primary (keep it active & switchable).
  const { error: demoteError } = await supabase
    .from("boards")
    .update({ is_primary: false })
    .eq("is_primary", true);
  if (demoteError)
    fail(demoteError.message, "Could not switch the main board.");

  const { error } = await supabase
    .from("boards")
    .update({ status: "active", is_primary: true, archived_at: null })
    .eq("id", boardId);
  if (error) fail(error.message, "Could not make that the main board.");
}

/** Permanently delete a board and everything pinned to it. */
export async function deleteBoard(
  supabase: SupabaseClient,
  boardId: string
): Promise<void> {
  const { error } = await supabase.from("boards").delete().eq("id", boardId);
  if (error) fail(error.message, "Could not delete that board.");
}

export async function updateBoardTheme(
  supabase: SupabaseClient,
  boardId: string,
  theme: string
): Promise<void> {
  const { error } = await supabase
    .from("boards")
    .update({ theme })
    .eq("id", boardId);
  if (error) fail(error.message, "Could not change the theme.");
}

// ---------- Items ----------

export async function listItems(
  supabase: SupabaseClient,
  boardId: string
): Promise<BoardItem[]> {
  const { data, error } = await supabase
    .from("items")
    .select("*")
    .eq("board_id", boardId)
    .order("created_at", { ascending: true });
  if (error) fail(error.message, "Could not load the board's items.");
  return (data ?? []) as BoardItem[];
}

export async function createNote(
  supabase: SupabaseClient,
  input: {
    board_id: string;
    content: string;
    paper: string;
    x: number;
    y: number;
    rotation: number;
  }
): Promise<BoardItem> {
  const { data, error } = await supabase
    .from("items")
    .insert({ ...input, kind: "note" })
    .select()
    .single();
  if (error || !data) fail(error?.message, "Could not pin the note.");
  return data as BoardItem;
}

export async function createPhotoItem(
  supabase: SupabaseClient,
  input: {
    board_id: string;
    photo_path: string;
    content: string;
    x: number;
    y: number;
    rotation: number;
  }
): Promise<BoardItem> {
  const { data, error } = await supabase
    .from("items")
    .insert({ ...input, kind: "photo", paper: "photo" })
    .select()
    .single();
  if (error || !data) fail(error?.message, "Could not pin the photo.");
  return data as BoardItem;
}

export async function updateItem(
  supabase: SupabaseClient,
  id: string,
  patch: Partial<
    Pick<BoardItem, "content" | "paper" | "x" | "y" | "rotation" | "scale">
  >
): Promise<void> {
  const { error } = await supabase.from("items").update(patch).eq("id", id);
  if (error) fail(error.message, "Could not update that.");
}

export async function deleteItem(
  supabase: SupabaseClient,
  item: Pick<BoardItem, "id" | "photo_path">
): Promise<void> {
  const { error } = await supabase.from("items").delete().eq("id", item.id);
  if (error) fail(error.message, "Could not take that down.");
  if (item.photo_path) {
    // Best effort — an orphaned photo never breaks the board.
    await supabase.storage.from("photos").remove([item.photo_path]);
  }
}

// ---------- Photos ----------

export function photoStoragePath(boardId: string, fileId: string): string {
  return `${boardId}/${fileId}.jpg`;
}

export async function uploadPhoto(
  supabase: SupabaseClient,
  boardId: string,
  blob: Blob
): Promise<string> {
  const path = photoStoragePath(boardId, crypto.randomUUID());
  const { error } = await supabase.storage
    .from("photos")
    .upload(path, blob, { contentType: "image/jpeg" });
  if (error) fail(error.message, "Could not upload the photo.");
  return path;
}

export async function getPhotoUrl(
  supabase: SupabaseClient,
  path: string
): Promise<string> {
  const { data, error } = await supabase.storage
    .from("photos")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data) fail(error?.message, "Could not load a photo.");
  return data.signedUrl;
}

// ---------- Profiles ----------

export async function getProfiles(
  supabase: SupabaseClient
): Promise<Record<string, Profile>> {
  const { data } = await supabase.from("profiles").select("*");
  const map: Record<string, Profile> = {};
  for (const p of (data ?? []) as Profile[]) map[p.id] = p;
  return map;
}

// ---------- Keepsake export ----------

export async function exportBoard(
  supabase: SupabaseClient,
  board: Board
): Promise<BoardExport> {
  const items = await listItems(supabase, board.id);
  return {
    exported_at: new Date().toISOString(),
    app: APP_NAME,
    board,
    items,
  };
}
