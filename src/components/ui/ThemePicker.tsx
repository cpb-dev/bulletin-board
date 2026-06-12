"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateBoardTheme } from "@/lib/api";
import { useBoardStore } from "@/lib/store";
import { THEMES } from "@/lib/themes";
import { Sheet } from "./Sheet";

/** Redecorate the room — theme changes sync live to both of you. */
export function ThemePicker() {
  const supabase = useMemo(() => createClient(), []);
  const open = useBoardStore((s) => s.themePickerOpen);
  const board = useBoardStore((s) => s.board);
  const [error, setError] = useState<string | null>(null);

  if (!open || !board) return null;

  async function choose(themeId: string) {
    if (!board || themeId === board.theme) return;
    const store = useBoardStore.getState();
    const previous = board;
    // Optimistic: redecorate instantly, roll back if the save fails.
    store.setBoard({ ...board, theme: themeId });
    try {
      await updateBoardTheme(supabase, board.id, themeId);
    } catch {
      store.setBoard(previous);
      setError("Could not change the theme — try again in a moment.");
    }
  }

  return (
    <Sheet
      title="Redecorate"
      onClose={() => useBoardStore.getState().setThemePickerOpen(false)}
    >
      <div className="grid grid-cols-2 gap-3">
        {THEMES.map((t) => {
          const selected = board.theme === t.id;
          return (
            <button
              key={t.id}
              onClick={() => choose(t.id)}
              className="rounded-2xl p-3 text-left transition-transform hover:scale-[1.03]"
              style={{
                background: t.ui.panel,
                color: t.ui.text,
                outline: selected
                  ? `3px solid ${t.ui.accent}`
                  : "3px solid transparent",
              }}
              aria-pressed={selected}
            >
              <div className="text-2xl">{t.emoji}</div>
              <div className="font-bold mt-1">{t.name}</div>
              <div className="text-xs opacity-75">{t.tagline}</div>
              <div className="mt-2 flex gap-1">
                {t.pins.map((c) => (
                  <span
                    key={c}
                    className="h-3 w-3 rounded-full"
                    style={{ background: c }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </Sheet>
  );
}
