"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  addListItem,
  deleteListItem,
  listListItems,
  nextPosition,
  renameList,
  setListItemDone,
  updateListItemContent,
} from "@/lib/lists-api";
import type { List, ListItem } from "@/lib/types";

/** A single list opened up: tick items off, add and remove them. */
export function ListDetail({
  list,
  onBack,
}: {
  list: List;
  onBack: () => void;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [items, setItems] = useState<ListItem[]>([]);
  const [title, setTitle] = useState(list.title);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const readOnly = list.status === "archived";

  const refresh = useCallback(async () => {
    setItems(await listListItems(supabase, list.id));
  }, [supabase, list.id]);

  useEffect(() => {
    (async () => {
      try {
        await refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load list.");
      } finally {
        setLoading(false);
      }
    })();
  }, [refresh]);

  // Live sync for this list's items.
  useEffect(() => {
    const channel = supabase
      .channel(`list-${list.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "list_items",
          filter: `list_id=eq.${list.id}`,
        },
        () => refresh().catch(() => {})
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, list.id, refresh]);

  async function add() {
    const content = draft.trim();
    if (!content) return;
    setDraft("");
    try {
      const item = await addListItem(
        supabase,
        list.id,
        content,
        nextPosition(items)
      );
      setItems((prev) => [...prev, item]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add that.");
    }
  }

  async function toggle(item: ListItem) {
    // optimistic
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, done: !i.done } : i))
    );
    try {
      await setListItemDone(supabase, item.id, !item.done);
    } catch {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, done: item.done } : i))
      );
    }
  }

  async function remove(item: ListItem) {
    setItems((prev) => prev.filter((i) => i.id !== item.id));
    await deleteListItem(supabase, item.id).catch(() => refresh());
  }

  async function saveTitle() {
    const clean = title.trim() || "Our list";
    setTitle(clean);
    if (clean !== list.title) await renameList(supabase, list.id, clean);
  }

  async function saveItemContent(item: ListItem, content: string) {
    if (content.trim() === item.content) return;
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, content } : i))
    );
    await updateListItemContent(supabase, item.id, content).catch(() =>
      refresh()
    );
  }

  return (
    <main className="min-h-dvh p-5 max-w-2xl mx-auto">
      <header className="flex items-center gap-2 mb-5">
        <button className="cute-button ghost text-sm" onClick={onBack}>
          ← lists
        </button>
        <input
          className="cute-input hand !text-2xl flex-1"
          value={title}
          maxLength={60}
          disabled={readOnly}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={saveTitle}
          onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
          aria-label="List name"
        />
      </header>

      {readOnly && (
        <p className="text-sm opacity-70 mb-3">
          this list is archived — restore it from the lists page to make
          changes.
        </p>
      )}

      {!readOnly && (
        <div className="cute-panel p-3 mb-5 flex gap-2">
          <input
            className="cute-input"
            placeholder="add an item…"
            value={draft}
            maxLength={120}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && add()}
            autoFocus
          />
          <button className="cute-button" onClick={add} disabled={!draft.trim()}>
            add
          </button>
        </div>
      )}

      {loading && <p className="opacity-75">loading…</p>}
      {error && (
        <p role="alert" className="text-red-300 mb-3">
          {error}
        </p>
      )}

      {!loading && items.length === 0 && (
        <p className="opacity-70 text-sm">nothing here yet 🌱</p>
      )}

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li
            key={item.id}
            className="cute-panel p-3 flex items-center gap-3"
          >
            <button
              onClick={() => !readOnly && toggle(item)}
              aria-label={item.done ? "Mark not done" : "Mark done"}
              aria-pressed={item.done}
              disabled={readOnly}
              className="h-6 w-6 shrink-0 rounded-full border-2 grid place-items-center"
              style={{
                borderColor: "var(--ui-accent)",
                background: item.done ? "var(--ui-accent)" : "transparent",
              }}
            >
              {item.done ? "✓" : ""}
            </button>
            <input
              className={`bg-transparent flex-1 outline-none ${
                item.done ? "line-through opacity-50" : ""
              }`}
              defaultValue={item.content}
              disabled={readOnly}
              onBlur={(e) => saveItemContent(item, e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && e.currentTarget.blur()
              }
              aria-label="List item"
            />
            {!readOnly && (
              <button
                className="opacity-60 hover:opacity-100 shrink-0"
                aria-label="Remove item"
                onClick={() => remove(item)}
              >
                ✕
              </button>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
