"use client";

import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { deleteItem, updateItem } from "@/lib/api";
import { useBoardStore } from "@/lib/store";
import { getTheme } from "@/lib/themes";
import { Sheet, Swatch } from "./Sheet";

/** Bottom sheet for reading, editing or taking down a pinned item. */
export function ItemEditor() {
  const supabase = useMemo(() => createClient(), []);
  const editingId = useBoardStore((s) => s.editingId);
  const item = useBoardStore((s) =>
    s.items.find((i) => i.id === s.editingId)
  );
  const board = useBoardStore((s) => s.board);
  const profiles = useBoardStore((s) => s.profiles);
  const readOnly = useBoardStore((s) => s.readOnly);
  const theme = getTheme(board?.theme);

  const [text, setText] = useState("");
  const [paper, setPaper] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (item) {
      setText(item.content);
      setPaper(item.paper);
      setConfirmingDelete(false);
      setError(null);
    }
  }, [item]);

  if (!editingId || !item) return null;

  const author = item.created_by ? profiles[item.created_by] : undefined;
  const pinnedOn = new Date(item.created_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const isNote = item.kind === "note";
  const dirty = text !== item.content || (isNote && paper !== item.paper);

  function close() {
    useBoardStore.getState().setEditing(null);
  }

  async function save() {
    if (!item) return;
    setBusy(true);
    setError(null);
    try {
      const patch = isNote
        ? { content: text.trim(), paper }
        : { content: text.trim() };
      await updateItem(supabase, item.id, patch);
      useBoardStore.getState().upsertItem({ ...item, ...patch });
      close();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setBusy(false);
    }
  }

  async function takeDown() {
    if (!item) return;
    setBusy(true);
    setError(null);
    try {
      await deleteItem(supabase, item);
      useBoardStore.getState().removeItem(item.id);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not take that down."
      );
      setBusy(false);
    }
  }

  return (
    <Sheet title={isNote ? "A little note" : "A photo"} onClose={close}>
      <p className="text-xs opacity-70 mb-3">
        pinned by {author?.display_name ?? "someone lovely"} · {pinnedOn}
      </p>

      {readOnly ? (
        <p className="hand text-2xl whitespace-pre-wrap">
          {item.content || "♡"}
        </p>
      ) : (
        <>
          <textarea
            className="cute-input hand !text-xl min-h-24 resize-none"
            value={text}
            maxLength={isNote ? 200 : 60}
            placeholder={isNote ? "write something sweet…" : "a little caption…"}
            onChange={(e) => setText(e.target.value)}
          />

          {isNote && (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-sm opacity-75">paper:</span>
              {theme.papers.map((p) => (
                <Swatch
                  key={p.id}
                  color={p.bg}
                  label={p.name}
                  selected={paper === p.id}
                  onSelect={() => setPaper(p.id)}
                />
              ))}
            </div>
          )}

          {error && (
            <p role="alert" className="mt-3 text-sm text-red-300">
              {error}
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              className="cute-button flex-1"
              onClick={save}
              disabled={busy || !dirty || (isNote && !text.trim())}
            >
              {busy ? "saving…" : "save"}
            </button>
            {confirmingDelete ? (
              <button
                className="cute-button danger flex-1"
                onClick={takeDown}
                disabled={busy}
              >
                really take it down?
              </button>
            ) : (
              <button
                className="cute-button ghost"
                onClick={() => setConfirmingDelete(true)}
                disabled={busy}
                aria-label="Take down"
              >
                🗑️
              </button>
            )}
          </div>
        </>
      )}
    </Sheet>
  );
}
