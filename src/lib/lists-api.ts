/**
 * Data access for Lists. Separate from boards entirely — their own
 * page, their own archive. Client injected for testability, like api.ts.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { List, ListItem } from "./types";

function fail(message: string | undefined, fallback: string): never {
  throw new Error(message || fallback);
}

// ---------- Lists ----------

export async function listLists(
  supabase: SupabaseClient,
  status: "active" | "archived"
): Promise<List[]> {
  const { data, error } = await supabase
    .from("lists")
    .select("*")
    .eq("status", status)
    .order(status === "archived" ? "archived_at" : "created_at", {
      ascending: false,
    });
  if (error) fail(error.message, "Could not load your lists.");
  return (data ?? []) as List[];
}

export async function createList(
  supabase: SupabaseClient,
  title: string
): Promise<List> {
  const clean = title.trim() || "Our list";
  const { data, error } = await supabase
    .from("lists")
    .insert({ title: clean })
    .select()
    .single();
  if (error || !data) fail(error?.message, "Could not make that list.");
  return data as List;
}

export async function renameList(
  supabase: SupabaseClient,
  id: string,
  title: string
): Promise<void> {
  const { error } = await supabase
    .from("lists")
    .update({ title: title.trim() || "Our list" })
    .eq("id", id);
  if (error) fail(error.message, "Could not rename that list.");
}

export async function setListStatus(
  supabase: SupabaseClient,
  id: string,
  status: "active" | "archived"
): Promise<void> {
  const { error } = await supabase
    .from("lists")
    .update({
      status,
      archived_at: status === "archived" ? new Date().toISOString() : null,
    })
    .eq("id", id);
  if (error) fail(error.message, "Could not update that list.");
}

export async function deleteList(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("lists").delete().eq("id", id);
  if (error) fail(error.message, "Could not delete that list.");
}

// ---------- List items ----------

export async function listListItems(
  supabase: SupabaseClient,
  listId: string
): Promise<ListItem[]> {
  const { data, error } = await supabase
    .from("list_items")
    .select("*")
    .eq("list_id", listId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) fail(error.message, "Could not load that list.");
  return (data ?? []) as ListItem[];
}

export async function addListItem(
  supabase: SupabaseClient,
  listId: string,
  content: string,
  position: number
): Promise<ListItem> {
  const { data, error } = await supabase
    .from("list_items")
    .insert({ list_id: listId, content: content.trim(), position })
    .select()
    .single();
  if (error || !data) fail(error?.message, "Could not add that.");
  return data as ListItem;
}

export async function setListItemDone(
  supabase: SupabaseClient,
  id: string,
  done: boolean
): Promise<void> {
  const { error } = await supabase
    .from("list_items")
    .update({ done })
    .eq("id", id);
  if (error) fail(error.message, "Could not update that.");
}

export async function updateListItemContent(
  supabase: SupabaseClient,
  id: string,
  content: string
): Promise<void> {
  const { error } = await supabase
    .from("list_items")
    .update({ content: content.trim() })
    .eq("id", id);
  if (error) fail(error.message, "Could not update that.");
}

export async function deleteListItem(
  supabase: SupabaseClient,
  id: string
): Promise<void> {
  const { error } = await supabase.from("list_items").delete().eq("id", id);
  if (error) fail(error.message, "Could not remove that.");
}

/** Fraction (0..1) of a list's items that are done — for the progress pip. */
export function listProgress(items: ListItem[]): number {
  if (items.length === 0) return 0;
  return items.filter((i) => i.done).length / items.length;
}

/** Next position value to append an item at the end. */
export function nextPosition(items: Pick<ListItem, "position">[]): number {
  return items.reduce((max, i) => Math.max(max, i.position), -1) + 1;
}
