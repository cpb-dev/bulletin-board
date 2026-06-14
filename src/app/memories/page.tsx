"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  archiveBoardAndStartFresh,
  deleteBoard,
  exportBoard,
  getPrimaryBoard,
  listArchivedBoards,
  promoteBoardToMain,
} from "@/lib/api";
import { useRouter } from "next/navigation";
import type { Board } from "@/lib/types";
import { getTheme, THEMES } from "@/lib/themes";

/**
 * The memory box: archive ("back up") the current board to keep it
 * forever, browse old boards, and download keepsake files.
 */
export default function MemoriesPage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [active, setActive] = useState<Board | null>(null);
  const [memories, setMemories] = useState<Board[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [archiving, setArchiving] = useState(false);
  const [keepsakeTitle, setKeepsakeTitle] = useState("");
  const [nextTheme, setNextTheme] = useState(THEMES[0].id);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const [board, archived] = await Promise.all([
          getPrimaryBoard(supabase),
          listArchivedBoards(supabase),
        ]);
        setActive(board);
        setMemories(archived);
        setNextTheme(board.theme);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Could not load memories."
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [supabase]);

  async function archiveNow() {
    if (!active) return;
    setBusy(true);
    setError(null);
    try {
      const title =
        keepsakeTitle.trim() ||
        `Our board · ${new Date().toLocaleDateString(undefined, {
          month: "long",
          year: "numeric",
        })}`;
      const fresh = await archiveBoardAndStartFresh(supabase, active.id, {
        keepsakeTitle: title,
        nextTitle: "Our board",
        nextTheme,
      });
      setMemories([
        { ...active, status: "archived", title, archived_at: new Date().toISOString() },
        ...memories,
      ]);
      setActive(fresh);
      setArchiving(false);
      setKeepsakeTitle("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not save the board."
      );
    } finally {
      setBusy(false);
    }
  }

  async function promote(board: Board) {
    if (
      !confirm(
        `Make “${board.title}” your main board? Your current main board stays as a switchable board.`
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await promoteBoardToMain(supabase, board.id);
      router.push("/board");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch boards.");
      setBusy(false);
    }
  }

  async function remove(board: Board) {
    if (
      !confirm(
        `Delete “${board.title}” forever? Everything pinned to it will be gone for good.`
      )
    )
      return;
    setBusy(true);
    setError(null);
    try {
      await deleteBoard(supabase, board.id);
      setMemories((prev) => prev.filter((m) => m.id !== board.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that.");
    } finally {
      setBusy(false);
    }
  }

  async function download(board: Board) {
    try {
      const data = await exportBoard(supabase, board);
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${board.title.replace(/[^\w\- ]+/g, "").trim() || "board"}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Could not export that board.");
    }
  }

  return (
    <main className="min-h-dvh p-5 max-w-2xl mx-auto">
      <header className="flex items-center justify-between mb-6">
        <h1 className="hand text-4xl">Memory box 📦</h1>
        <Link href="/board" className="cute-button ghost text-sm">
          ← back to the board
        </Link>
      </header>

      {loading && <p className="opacity-75">opening the memory box…</p>}
      {error && (
        <p role="alert" className="text-red-300 mb-4">
          {error}
        </p>
      )}

      {active && (
        <section className="cute-panel p-5 mb-6 pop-in">
          <h2 className="font-bold text-lg">
            current board ·{" "}
            <span className="opacity-75">{getTheme(active.theme).name}</span>
          </h2>
          <p className="text-sm opacity-75 mt-1">
            started {new Date(active.created_at).toLocaleDateString()}
          </p>

          {archiving ? (
            <div className="mt-4 flex flex-col gap-3">
              <input
                className="cute-input"
                placeholder='give this memory a name (e.g. "Summer holiday 2026")'
                value={keepsakeTitle}
                maxLength={60}
                onChange={(e) => setKeepsakeTitle(e.target.value)}
              />
              <div>
                <p className="text-sm opacity-75 mb-2">
                  theme for the fresh board:
                </p>
                <div className="flex flex-wrap gap-2">
                  {THEMES.map((t) => (
                    <button
                      key={t.id}
                      className="cute-button ghost text-sm"
                      style={
                        nextTheme === t.id
                          ? { outline: `3px solid ${t.ui.accent}` }
                          : undefined
                      }
                      onClick={() => setNextTheme(t.id)}
                    >
                      {t.emoji} {t.name}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  className="cute-button flex-1"
                  onClick={archiveNow}
                  disabled={busy}
                >
                  {busy ? "tucking it away…" : "save it forever 💝"}
                </button>
                <button
                  className="cute-button ghost"
                  onClick={() => setArchiving(false)}
                  disabled={busy}
                >
                  cancel
                </button>
              </div>
              <p className="text-xs opacity-60">
                the board and everything pinned to it is kept exactly as it
                is, and a brand-new empty board takes its place.
              </p>
            </div>
          ) : (
            <button
              className="cute-button mt-4"
              onClick={() => setArchiving(true)}
            >
              📦 save this board as a memory
            </button>
          )}
        </section>
      )}

      <section>
        <h2 className="font-bold text-lg mb-3">saved boards</h2>
        {!loading && memories.length === 0 && (
          <p className="opacity-70 text-sm">
            nothing here yet — when a board is full of lovely things, save
            it and it will live here forever. 💛
          </p>
        )}
        <ul className="flex flex-col gap-3">
          {memories.map((m) => {
            const theme = getTheme(m.theme);
            return (
              <li
                key={m.id}
                className="cute-panel p-4 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-bold truncate">
                    {theme.emoji} {m.title}
                  </p>
                  <p className="text-xs opacity-70">
                    saved{" "}
                    {m.archived_at
                      ? new Date(m.archived_at).toLocaleDateString()
                      : "—"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0 justify-end">
                  <Link href={`/memories/${m.id}`} className="cute-button text-sm">
                    visit
                  </Link>
                  <button
                    className="cute-button ghost text-sm"
                    onClick={() => promote(m)}
                    disabled={busy}
                    aria-label={`Make ${m.title} the main board`}
                  >
                    ⭐ make main
                  </button>
                  <button
                    className="cute-button ghost text-sm"
                    onClick={() => download(m)}
                    aria-label={`Download ${m.title}`}
                  >
                    ⬇️
                  </button>
                  <button
                    className="cute-button danger text-sm"
                    onClick={() => remove(m)}
                    disabled={busy}
                    aria-label={`Delete ${m.title}`}
                  >
                    🗑️
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
