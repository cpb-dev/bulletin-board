"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  archiveBoard,
  archiveBoardAndStartFresh,
  createAdditionalBoard,
  createSurpriseBoard,
  deleteBoard,
  listActiveBoards,
  promoteBoardToMain,
  renameBoard,
  updateSurpriseReveal,
} from "@/lib/api";
import { getTheme } from "@/themes";
import { useBoardStore } from "@/lib/store";
import { isStillSecret, validateRevealDate } from "@/lib/surprise";
import type { Board } from "@/lib/types";

/** Path for a board: the primary lives at /board, others at /board/[id]. */
function boardHref(b: Board): string {
  return b.is_primary ? "/board" : `/board/${b.id}`;
}

/** ISO (UTC) -> value for a datetime-local input, in the user's zone. */
function toLocalInput(iso: string): string {
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

/**
 * Top-bar dropdown for boards. The "main" board is always the first
 * active board; additional boards you've made are listed below it, each
 * with a "⋯" menu to make it the main board or delete it. The main board
 * deliberately has neither so it can't be removed by accident. Memories
 * (archived boards) are reached via the link and stay view-only.
 */
export function BoardMenu() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const board = useBoardStore((s) => s.board);
  const setBoard = useBoardStore((s) => s.setBoard);

  const [open, setOpen] = useState(false);
  const [boards, setBoards] = useState<Board[]>([]);
  const [rowOpen, setRowOpen] = useState<string | null>(null);
  const [name, setName] = useState(board?.title ?? "");
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 🎁 surprise planner
  const [surpriseOpen, setSurpriseOpen] = useState(false);
  const [surpriseTitle, setSurpriseTitle] = useState("");
  const [surpriseDate, setSurpriseDate] = useState("");
  const [surpriseMessage, setSurpriseMessage] = useState("");

  useEffect(() => setName(board?.title ?? ""), [board?.title]);
  useEffect(() => {
    if (board && isStillSecret(board)) {
      setSurpriseDate(board.reveal_at ? toLocalInput(board.reveal_at) : "");
      setSurpriseMessage(board.reveal_message ?? "");
    }
  }, [board]);

  const refresh = useCallback(() => {
    listActiveBoards(supabase)
      .then(setBoards)
      .catch(() => setError("Could not load your boards."));
  }, [supabase]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

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

  async function planSurprise() {
    const dateError = validateRevealDate(surpriseDate);
    if (dateError) {
      setError(dateError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const fresh = await createSurpriseBoard(supabase, {
        title: surpriseTitle,
        revealAt: surpriseDate,
        revealMessage: surpriseMessage,
      });
      setSurpriseOpen(false);
      setSurpriseTitle("");
      setOpen(false);
      router.push(`/board/${fresh.id}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not create the surprise."
      );
    } finally {
      setBusy(false);
    }
  }

  async function saveReveal() {
    if (!board) return;
    const dateError = validateRevealDate(surpriseDate);
    if (dateError) {
      setError(dateError);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await updateSurpriseReveal(supabase, board.id, {
        revealAt: surpriseDate,
        revealMessage: surpriseMessage,
      });
      setBoard({
        ...board,
        reveal_at: new Date(surpriseDate).toISOString(),
        reveal_message: surpriseMessage.trim() || null,
        revealed_at: null,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that.");
    } finally {
      setBusy(false);
    }
  }

  async function makeMain(b: Board) {
    if (
      !confirm(
        `Make “${b.title}” your main board? Your current main board stays as a switchable board.`
      )
    )
      return;
    setBusy(true);
    try {
      await promoteBoardToMain(supabase, b.id);
      setOpen(false);
      router.push("/board");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not switch boards.");
      setBusy(false);
    }
  }

  async function removeBoard(b: Board) {
    if (
      !confirm(
        `Delete “${b.title}” forever? Everything pinned to it will be gone for good.`
      )
    )
      return;
    setBusy(true);
    try {
      await deleteBoard(supabase, b.id);
      setRowOpen(null);
      if (b.id === board?.id) {
        setOpen(false);
        router.push("/board");
        router.refresh();
      } else {
        setBoards((prev) => prev.filter((x) => x.id !== b.id));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete that.");
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

  const others = boards.filter((b) => b.id !== board?.id);

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
            {/* the current board's own actions (only when it's not main) */}
            {board && !board.is_primary && !isStillSecret(board) && (
              <div className="flex gap-2 mt-2">
                <button
                  className="cute-button !px-2 !py-1 text-xs flex-1"
                  onClick={() => makeMain(board)}
                  disabled={busy}
                >
                  ⭐ make main
                </button>
                <button
                  className="cute-button ghost !px-2 !py-1 text-xs flex-1"
                  onClick={saveAsMemory}
                  disabled={busy}
                >
                  💝 to memory
                </button>
                <button
                  className="cute-button danger !px-2 !py-1 text-xs flex-1"
                  onClick={() => removeBoard(board)}
                  disabled={busy}
                >
                  🗑️
                </button>
              </div>
            )}

            {/* a still-secret surprise board: reveal settings live here */}
            {board && isStillSecret(board) && (
              <div className="mt-2 rounded-lg bg-black/15 p-2">
                <p className="text-xs opacity-80 mb-1">
                  🔒 only you can see this board. it unlocks (and she gets
                  your message) at:
                </p>
                <input
                  className="cute-input !py-1.5 text-sm"
                  type="datetime-local"
                  value={surpriseDate}
                  onChange={(e) => setSurpriseDate(e.target.value)}
                  aria-label="Reveal date and time"
                />
                <textarea
                  className="cute-input !py-1.5 text-sm mt-2 min-h-16 resize-none"
                  placeholder="the message she'll get… (e.g. Happy birthday my love 🌹)"
                  value={surpriseMessage}
                  maxLength={160}
                  onChange={(e) => setSurpriseMessage(e.target.value)}
                  aria-label="Reveal message"
                />
                <div className="flex gap-2 mt-2">
                  <button
                    className="cute-button !px-2 !py-1 text-xs flex-1"
                    onClick={saveReveal}
                    disabled={busy}
                  >
                    save reveal
                  </button>
                  <button
                    className="cute-button danger !px-2 !py-1 text-xs"
                    onClick={() => removeBoard(board)}
                    disabled={busy}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            )}

            {others.length > 0 && (
              <>
                <p className="text-xs opacity-70 mt-3 mb-1">switch to</p>
                <ul className="flex flex-col gap-1">
                  {others.map((b) => (
                    <li key={b.id} className="rounded-lg bg-black/5">
                      <div className="flex items-center justify-between px-2 py-1.5 gap-2">
                        <Link
                          href={boardHref(b)}
                          className="text-sm truncate min-w-0 hover:underline"
                          onClick={() => setOpen(false)}
                        >
                          {getTheme(b.theme).emoji} {b.title}
                          {b.is_primary && (
                            <span className="opacity-60"> · main</span>
                          )}
                          {isStillSecret(b) && (
                            <span className="opacity-80"> · 🎁 secret</span>
                          )}
                        </Link>
                        {/* main board is the exception — no ⋯ actions */}
                        {!b.is_primary && (
                          <button
                            className="cute-button ghost !px-2 !py-1 text-xs shrink-0"
                            onClick={() =>
                              setRowOpen((id) => (id === b.id ? null : b.id))
                            }
                            aria-label={`Options for ${b.title}`}
                            aria-expanded={rowOpen === b.id}
                          >
                            ⋯
                          </button>
                        )}
                      </div>
                      {rowOpen === b.id && !b.is_primary && (
                        <div className="flex gap-2 px-2 pb-2">
                          {!isStillSecret(b) && (
                            <button
                              className="cute-button !px-2 !py-1 text-xs flex-1"
                              onClick={() => makeMain(b)}
                              disabled={busy}
                            >
                              ⭐ make main
                            </button>
                          )}
                          <button
                            className="cute-button danger !px-2 !py-1 text-xs flex-1"
                            onClick={() => removeBoard(b)}
                            disabled={busy}
                          >
                            🗑️ delete
                          </button>
                        </div>
                      )}
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

            {/* plan a surprise: private to you until the reveal moment */}
            {!surpriseOpen ? (
              <button
                className="cute-button ghost w-full mt-3 text-sm"
                onClick={() => {
                  setSurpriseOpen(true);
                  setSurpriseDate("");
                  setSurpriseMessage("");
                }}
              >
                🎁 plan a surprise
              </button>
            ) : (
              <div className="mt-3 rounded-lg bg-black/15 p-2">
                <p className="text-xs opacity-80 mb-1">
                  a secret board only you can see — it unlocks for her on the
                  date you pick, with your message as the notification 💝
                </p>
                <input
                  className="cute-input !py-1.5 text-sm"
                  placeholder="name it… (e.g. Happy Birthday!)"
                  value={surpriseTitle}
                  maxLength={40}
                  onChange={(e) => setSurpriseTitle(e.target.value)}
                />
                <input
                  className="cute-input !py-1.5 text-sm mt-2"
                  type="datetime-local"
                  value={surpriseDate}
                  onChange={(e) => setSurpriseDate(e.target.value)}
                  aria-label="Reveal date and time"
                />
                <textarea
                  className="cute-input !py-1.5 text-sm mt-2 min-h-16 resize-none"
                  placeholder="the message she'll get…"
                  value={surpriseMessage}
                  maxLength={160}
                  onChange={(e) => setSurpriseMessage(e.target.value)}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    className="cute-button !px-3 !py-1 text-xs flex-1"
                    onClick={planSurprise}
                    disabled={busy || !surpriseDate}
                  >
                    {busy ? "creating…" : "create the surprise 🎁"}
                  </button>
                  <button
                    className="cute-button ghost !px-3 !py-1 text-xs"
                    onClick={() => setSurpriseOpen(false)}
                    disabled={busy}
                  >
                    cancel
                  </button>
                </div>
              </div>
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
