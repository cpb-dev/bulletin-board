/**
 * Data access layer. Every function takes the Supabase client as its
 * first argument so the whole module is unit-testable with a mock.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Board, BoardExport, BoardItem, Profile } from "./types";
import { DEFAULT_THEME_ID } from "./themes";

export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME || "Our Little Board";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24; // 1 day

function fail(message: string | undefined, fallback: string): never {
  throw new Error(message || fallback);
}

// ---------- Boards ----------

/**
 * Fetch the current active board, creating one on first ever visit.
 */
export async function getOrCreateActiveBoard(
  supabase: SupabaseClient
): Promise<Board> {
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) fail(error.message, "Could not load the board.");
  if (data && data.length > 0) return data[0] as Board;
  return createBoard(supabase, "Our board", DEFAULT_THEME_ID);
}

export async function createBoard(
  supabase: SupabaseClient,
  title: string,
  theme: string
): Promise<Board> {
  const { data, error } = await supabase
    .from("boards")
    .insert({ title, theme })
    .select()
    .single();
  if (error || !data) fail(error?.message, "Could not create a board.");
  return data as Board;
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

/**
 * "Back up" the current board: freeze it as a memory and start a
 * fresh board in its place. Returns the new active board.
 */
export async function archiveBoardAndStartFresh(
  supabase: SupabaseClient,
  boardId: string,
  options: { keepsakeTitle: string; nextTitle: string; nextTheme: string }
): Promise<Board> {
  const { error } = await supabase
    .from("boards")
    .update({
      status: "archived",
      archived_at: new Date().toISOString(),
      title: options.keepsakeTitle,
    })
    .eq("id", boardId);
  if (error) fail(error.message, "Could not save the board as a memory.");
  return createBoard(supabase, options.nextTitle, options.nextTheme);
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
