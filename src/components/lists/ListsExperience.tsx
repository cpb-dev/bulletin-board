"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  createList,
  deleteList,
  listLists,
  listListItems,
  listProgress,
  setListStatus,
} from "@/lib/lists-api";
import type { List, ListItem } from "@/lib/types";
import { ListDetail } from "./ListDetail";

/**
 * The Lists page: make any number of named lists (shopping, date ideas,
 * films to watch…), tick things off together, and archive old ones.
 * Kept entirely separate from the board's "memories".
 */
export function ListsExperience() {
  const supabase = useMemo(() => createClient(), []);
  const [active, setActive] = useState<List[]>([]);
  const [archived, setArchived] = useState<List[]>([]);
  const [counts, setCounts] = useState<Record<string, ListItem[]>>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshLists = useCallback(async () => {
    const [a, ar] = await Promise.all([
      listLists(supabase, "active"),
      listLists(supabase, "archived"),
    ]);
    setActive(a);
    setArchived(ar);
    // Pull item rows for active lists so cards can show progress.
    const itemsByList: Record<string, ListItem[]> = {};
    await Promise.all(
      a.map(async (l) => {
        itemsByList[l.id] = await listListItems(supabase, l.id);
      })
    );
    setCounts(itemsByList);
  }, [supabase]);

  useEffect(() => {
    (async () => {
      try {
        await refreshLists();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load lists.");
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshLists]);

  // Live sync across both phones.
  useEffect(() => {
    const channel = supabase
      .channel("lists-page")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "lists" },
        () => refreshLists().catch(() => {})
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "list_items" },
        () => refreshLists().catch(() => {})
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, refreshLists]);

  async function makeList() {
    if (!newTitle.trim()) return;
    try {
      const list = await createList(supabase, newTitle);
      setActive([list, ...active]);
      setCounts({ ...counts, [list.id]: [] });
      setNewTitle("");
      setSelectedId(list.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not make that list.");
    }
  }

  if (selectedId) {
    const list =
      active.find((l) => l.id === selectedId) ??
      archived.find((l) => l.id === selectedId);
    if (list) {
      return (
        <ListDetail
          list={list}
          onBack={() => {
            setSelectedId(null);
            refreshLists().catch(() => {});
          }}
        />
      );
    }
  }

  return (
    <main className="min-h-dvh p-5 max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="hand text-4xl">Our lists 📝</h1>
        <Link href="/board" className="cute-button ghost text-sm">
          ← board
        </Link>
      </header>

      <div className="cute-panel p-4 mb-6 flex gap-2">
        <input
          className="cute-input"
          placeholder="new list… (e.g. Shopping, Date ideas)"
          value={newTitle}
          maxLength={60}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && makeList()}
        />
        <button
          className="cute-button"
          onClick={makeList}
          disabled={!newTitle.trim()}
        >
          add
        </button>
      </div>

      {loading && <p className="opacity-75">opening your lists…</p>}
      {error && (
        <p role="alert" className="text-red-300 mb-4">
          {error}
        </p>
      )}

      {!loading && active.length === 0 && (
        <p className="opacity-70 text-sm mb-6">
          no lists yet — make your first one above ✨
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {active.map((l) => {
          const items = counts[l.id] ?? [];
          const progress = listProgress(items);
          return (
            <li
              key={l.id}
              className="cute-panel p-4 flex items-center justify-between gap-3"
            >
              <button
                className="text-left flex-1 min-w-0"
                onClick={() => setSelectedId(l.id)}
              >
                <p className="font-bold truncate">{l.title}</p>
                <p className="text-xs opacity-70">
                  {items.length === 0
                    ? "empty"
                    : `${items.filter((i) => i.done).length}/${items.length} done`}
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-black/20 overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round(progress * 100)}%`,
                      background: "var(--ui-accent)",
                    }}
                  />
                </div>
              </button>
              <div className="flex gap-1 shrink-0">
                <button
                  className="cute-button ghost !px-3 text-sm"
                  onClick={() => setSelectedId(l.id)}
                >
                  open
                </button>
                <button
                  className="cute-button ghost !px-3 text-sm"
                  aria-label={`Archive ${l.title}`}
                  onClick={async () => {
                    await setListStatus(supabase, l.id, "archived");
                    refreshLists().catch(() => {});
                  }}
                >
                  📦
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      {archived.length > 0 && (
        <section className="mt-8">
          <button
            className="text-sm underline opacity-75 hover:opacity-100"
            onClick={() => setShowArchived(!showArchived)}
          >
            {showArchived ? "hide" : "show"} archived lists ({archived.length})
          </button>
          {showArchived && (
            <ul className="flex flex-col gap-2 mt-3">
              {archived.map((l) => (
                <li
                  key={l.id}
                  className="cute-panel p-3 flex items-center justify-between gap-2"
                >
                  <button
                    className="text-left flex-1 min-w-0"
                    onClick={() => setSelectedId(l.id)}
                  >
                    <p className="font-bold truncate opacity-80">{l.title}</p>
                    <p className="text-xs opacity-60">
                      archived{" "}
                      {l.archived_at
                        ? new Date(l.archived_at).toLocaleDateString()
                        : ""}
                    </p>
                  </button>
                  <button
                    className="cute-button ghost !px-3 text-sm"
                    onClick={async () => {
                      await setListStatus(supabase, l.id, "active");
                      refreshLists().catch(() => {});
                    }}
                  >
                    restore
                  </button>
                  <button
                    className="cute-button danger !px-3 text-sm"
                    aria-label={`Delete ${l.title}`}
                    onClick={async () => {
                      if (!confirm(`Delete "${l.title}" forever?`)) return;
                      await deleteList(supabase, l.id);
                      refreshLists().catch(() => {});
                    }}
                  >
                    🗑️
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </main>
  );
}
