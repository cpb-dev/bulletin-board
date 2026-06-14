"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  archiveBoard,
  archiveBoardAndStartFresh,
  createAdditionalBoard,
  listActiveBoards,
  renameBoard,
} from "@/lib/api";
import { getTheme } from "@/lib/themes";
import { useBoardStore } from "@/lib/store";
import type { Board } from "@/lib/types";

/** Path for a board: the primary lives at /board, others at /board/[id]. */
function boardHref(b: Board): string {
  return b.is_primary ? "/board" : `/board/${b.id}`;
}

/**
 * Top-bar dropdown for boards: switch between active boards, make a new
 * named board, rename the current one, save an extra board as a memory,
 * and reach the memories archive.
 */
export function BoardMenu() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const board = useBoardStore((s) => s.board);
  const setBoard = useBoardStore((s) => s.setBoard);

  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [name, setName] = useState(board?.title ?? "");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setName(board?.title ?? ""), [board?.title]);

  useEffect(() => {
    if (!open) return;
    listActiveBoards(supabase)
      .then(setBoards)
      .catch(() => setError("Could not load your boards."));
  }, [open, supabase]);

  async function saveName() {
    if (!board || name.trim() === board.title) return;
    const title = name.trim() || "Our board";
    setBoard({ ...board, title });
    await renameBoard(supabase, board.id, title).catch(() => {});
  }

  async function addBoard() {
    if (!newName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const fresh = await createAdditionalBoard(supabase, newName);
      setNewName("");
      setOpen(false);
      router.push(`/board/${fresh.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not make that board.");
    } finally {
      setBusy(false);
    }
  }

  async function saveAsMemory() {
    if (!board || board.is_primary) return;
    setBusy(true);
    try {
      await archiveBoard(supabase, board.id, name);
      setOpen(false);
      router.push("/board");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
      setBusy(false);
    }
  }

  // For the main board: tuck it into memories and start a fresh one.
  async function saveMainAndReset() {
    if (!board || !board.is_primary) return;
    if (
      !confirm(
        "Save this board to memories and start a fresh main board? You'll find it any time under Memories."
      )
    )
      return;
    setBusy(true);
    try {
      await archiveBoardAndStartFresh(supabase, board.id, {
        keepsakeTitle: name,
        nextTitle: "Our board",
        nextTheme: board.theme,
      });
      setOpen(false);
      router.push("/board");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
      setBusy(false);
    }
  }

  return (
    <div className="relative">
      <button
        className="cute-button ghost !px-3 !py-2 text-sm"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        🗂️ boards
      </button>

      {open && (
        <>
          {/* click-away */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="cute-panel pop-in absolute right-0 mt-2 w-72 max-h-[70dvh] overflow-y-auto p-3 z-20">
            {/* current board name (editable) */}
            <label className="text-xs opacity-70">this board’s name</label>
            <input
              className="cute-input !py-2 mt-1"
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
              aria-label="Board name"
            />

            {boards.filter((b) => b.id !== board?.id).length > 0 && (
              <>
                <p className="text-xs opacity-70 mt-3 mb-1">switch to</p>
                <ul className="flex flex-col gap-1">
                  {boards
                    .filter((b) => b.id !== board?.id)
                    .map((b) => (
                      <li key={b.id}>
                        <Link
                          href={boardHref(b)}
                          className="block rounded-lg px-2 py-2 hover:bg-black/10 text-sm"
                          onClick={() => setOpen(false)}
                        >
                          {getTheme(b.theme).emoji} {b.title}
                          {b.is_primary && (
                            <span className="opacity-60"> · main</span>
                          )}
                        </Link>
                      </li>
                    ))}
                </ul>
              </>
            )}

            <p className="text-xs opacity-70 mt-3 mb-1">new board</p>
            <div className="flex gap-2">
              <input
                className="cute-input !py-2"
                placeholder="name it…"
                value={newName}
                maxLength={40}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addBoard()}
              />
              <button
                className="cute-button !px-3"
                onClick={addBoard}
                disabled={busy || !newName.trim()}
              >
                add
              </button>
            </div>

            {board && !board.is_primary && (
              <button
                className="cute-button ghost w-full mt-3 text-sm"
                onClick={saveAsMemory}
                disabled={busy}
              >
                💝 save this board as a memory
              </button>
            )}
            {board && board.is_primary && (
              <button
                className="cute-button ghost w-full mt-3 text-sm"
                onClick={saveMainAndReset}
                disabled={busy}
              >
                💝 save to memories &amp; start fresh
              </button>
            )}

            <Link
              href="/memories"
              className="cute-button ghost w-full mt-3 text-sm"
              onClick={() => setOpen(false)}
            >
              📦 memories
            </Link>

            {error && <p className="text-red-300 text-xs mt-2">{error}</p>}
          </div>
        </>
      )}
    </div>
  );
}
