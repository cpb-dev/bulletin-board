"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createNote } from "@/lib/api";
import { randomTilt, suggestPlacement } from "@/lib/board-geometry";
import {
  currentPlacementView,
  selectDisplayedThemeId,
  useBoardStore,
} from "@/lib/store";
import { getTheme } from "@/themes";
import {
  legacyShape,
  shapeAfterPaperChange,
  shapeToStore,
  type NoteShape,
} from "@/lib/note-shape";
import { Sheet } from "./Sheet";
import { NoteStylePicker } from "./NoteStylePicker";

const MAX_NOTE_LENGTH = 200;

export function NoteComposer() {
  const supabase = useMemo(() => createClient(), []);
  const open = useBoardStore((s) => s.composer === "note");
  const board = useBoardStore((s) => s.board);
  // The papers on offer are the ones of the theme on screen (BB-3).
  const theme = getTheme(useBoardStore(selectDisplayedThemeId));

  const [text, setText] = useState("");
  const [paper, setPaper] = useState(theme.papers[0].id);
  // The shape follows the paper (as it always did) until one is picked.
  const [shape, setShape] = useState<NoteShape>(() =>
    legacyShape(theme.papers[0].id)
  );
  const [shapeChosen, setShapeChosen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open || !board) return null;

  async function pinIt() {
    if (!board || !text.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const store = useBoardStore.getState();
      const spot = suggestPlacement(
        store.items,
        Math.random,
        currentPlacementView(store)
      );
      const note = await createNote(supabase, {
        board_id: board.id,
        content: text.trim(),
        paper,
        shape: shapeToStore(shape, paper),
        x: spot.x,
        y: spot.y,
        rotation: randomTilt(),
      });
      store.upsertItem(note);
      store.setComposer(null);
      store.walkUp({ x: note.x, y: note.y });
      setText("");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not pin the note."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <Sheet
      title="Leave a little note"
      onClose={() => useBoardStore.getState().setComposer(null)}
    >
      <textarea
        className="cute-input hand !text-xl min-h-28 resize-none"
        placeholder="write something sweet…"
        value={text}
        maxLength={MAX_NOTE_LENGTH}
        onChange={(e) => setText(e.target.value)}
        autoFocus
      />
      <div className="mt-1 text-right text-xs opacity-60">
        {text.length}/{MAX_NOTE_LENGTH}
      </div>

      <NoteStylePicker
        theme={theme}
        paper={paper}
        shape={shape}
        onPaper={(p) => {
          setPaper(p);
          setShape((s) => shapeAfterPaperChange(s, shapeChosen, p));
        }}
        onShape={(s) => {
          setShape(s);
          setShapeChosen(true);
        }}
      />

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        className="cute-button mt-4 w-full"
        onClick={pinIt}
        disabled={busy || !text.trim()}
      >
        {busy ? "pinning…" : "pin it to the board 📌"}
      </button>
    </Sheet>
  );
}
