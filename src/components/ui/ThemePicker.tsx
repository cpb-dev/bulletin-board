"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { updateBoardSecondaryTheme, updateBoardTheme } from "@/lib/api";
import { useBoardStore } from "@/lib/store";
import { secondaryActionFor, secondaryThemeOf } from "@/lib/theme-view";
import { getTheme, groupedThemes } from "@/themes";
import type { Board } from "@/lib/types";
import { Sheet } from "./Sheet";

/** How long a theme must be held to bring up its second-theme options. */
export const LONG_PRESS_MS = 500;
/** A finger that wanders this far (px) is scrolling, not holding. */
const HOLD_SLOP_PX = 10;

/**
 * Redecorate the room — theme changes sync live to both of you.
 *
 * Tap a theme to make it the main theme (which also drops any second
 * theme). Hold one — or right-click it — to add it as the board's second
 * theme, switch the second theme to it, or remove it (BB-3).
 */
export function ThemePicker() {
  const supabase = useMemo(() => createClient(), []);
  const open = useBoardStore((s) => s.themePickerOpen);
  const board = useBoardStore((s) => s.board);
  const [error, setError] = useState<string | null>(null);
  // The theme whose hold menu is showing.
  const [holding, setHolding] = useState<string | null>(null);
  // The catalogue never changes at runtime, so group it once.
  const sections = useMemo(() => groupedThemes(), []);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressStart = useRef<{ x: number; y: number } | null>(null);
  // Set when a hold fires, so the click that ends it doesn't also choose.
  const held = useRef(false);

  useEffect(() => {
    if (!open) setHolding(null);
  }, [open]);
  useEffect(() => () => cancelPress(), []);

  if (!open || !board) return null;

  function cancelPress() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    pressStart.current = null;
  }

  function startPress(themeId: string, e: React.PointerEvent) {
    cancelPress();
    held.current = false;
    pressStart.current = { x: e.clientX, y: e.clientY };
    timer.current = setTimeout(() => {
      held.current = true;
      timer.current = null;
      setError(null);
      setHolding(themeId);
      navigator.vibrate?.(12);
    }, LONG_PRESS_MS);
  }

  function movePress(e: React.PointerEvent) {
    const start = pressStart.current;
    if (!start) return;
    if (Math.hypot(e.clientX - start.x, e.clientY - start.y) > HOLD_SLOP_PX)
      cancelPress();
  }

  /** Optimistic: show the change instantly, roll back if the save fails. */
  async function save(next: Board, write: () => Promise<void>, failed: string) {
    const store = useBoardStore.getState();
    const previous = board!;
    store.setBoard(next);
    setError(null);
    try {
      await write();
    } catch {
      // Only roll back if nothing newer (e.g. a realtime echo) replaced it.
      if (useBoardStore.getState().board === next) store.setBoard(previous);
      setError(failed);
    }
  }

  function choose(themeId: string) {
    if (held.current) {
      held.current = false;
      return;
    }
    if (!board || themeId === board.theme) return;
    // A new main theme drops the second theme too.
    const hadSecondary = secondaryThemeOf(board) !== null;
    void save(
      { ...board, theme: themeId, ...(hadSecondary && { secondary_theme: null }) },
      () =>
        updateBoardTheme(supabase, board.id, themeId, {
          clearSecondary: hadSecondary,
        }),
      "Could not change the theme — try again in a moment."
    );
  }

  function setSecondary(themeId: string | null) {
    setHolding(null);
    if (!board) return;
    void save(
      { ...board, secondary_theme: themeId },
      () => updateBoardSecondaryTheme(supabase, board.id, themeId),
      "Could not change the second theme — try again in a moment."
    );
  }

  const secondary = secondaryThemeOf(board);

  return (
    <Sheet
      title="Redecorate"
      onClose={() => useBoardStore.getState().setThemePickerOpen(false)}
    >
      <p className="mb-4 text-xs opacity-70">
        tap to redecorate · hold a theme to pair it as a second theme you can
        switch to
      </p>
      <div className="flex flex-col gap-5">
        {sections.map(({ group, themes }) => (
          <section key={group.id} aria-label={group.label}>
            <div className="mb-2 flex items-baseline gap-2">
              <h3 className="hand text-lg leading-none">{group.label}</h3>
              <span className="text-xs opacity-60">{group.blurb}</span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {themes.map((t) => {
                const selected = board.theme === t.id;
                const isSecondary = secondary === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => choose(t.id)}
                    onPointerDown={(e) => startPress(t.id, e)}
                    onPointerMove={movePress}
                    onPointerUp={cancelPress}
                    onPointerLeave={cancelPress}
                    onPointerCancel={cancelPress}
                    onContextMenu={(e) => {
                      // Right-click on desktop; also stops the phone's own
                      // long-press menu from covering ours.
                      e.preventDefault();
                      cancelPress();
                      setError(null);
                      setHolding(t.id);
                    }}
                    className="relative rounded-2xl p-3 text-left transition-transform hover:scale-[1.03] select-none"
                    style={{
                      background: t.ui.panel,
                      color: t.ui.text,
                      outline: selected
                        ? `3px solid ${t.ui.accent}`
                        : isSecondary
                          ? `3px dashed ${t.ui.accent}`
                          : "3px solid transparent",
                      WebkitTouchCallout: "none",
                    }}
                    aria-pressed={selected}
                  >
                    {isSecondary && (
                      <span
                        className="absolute right-2 top-2 rounded-full px-2 py-0.5 text-[10px] font-bold"
                        style={{ background: t.ui.accent, color: t.ui.bg }}
                      >
                        2nd theme
                      </span>
                    )}
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
          </section>
        ))}
      </div>
      {holding && (
        <HoldMenu
          board={board}
          themeId={holding}
          onSetSecondary={setSecondary}
          onClose={() => setHolding(null)}
        />
      )}
      {error && (
        <p role="alert" className="mt-3 text-sm text-red-300">
          {error}
        </p>
      )}
    </Sheet>
  );
}

/** What holding a theme offers, pinned to the bottom of the sheet. */
function HoldMenu({
  board,
  themeId,
  onSetSecondary,
  onClose,
}: {
  board: Board;
  themeId: string;
  onSetSecondary: (themeId: string | null) => void;
  onClose: () => void;
}) {
  const theme = getTheme(themeId);
  const action = secondaryActionFor(board, themeId);
  return (
    <div
      role="group"
      aria-label={`${theme.name} options`}
      className="cute-panel pop-in sticky bottom-0 mt-4 flex flex-wrap items-center gap-2 p-3"
    >
      <span className="mr-auto text-sm">
        <span aria-hidden>{theme.emoji}</span> {theme.name}
      </span>
      {action === "main" ? (
        <span className="text-xs opacity-75">
          this is the main theme — hold a different one to pair it
        </span>
      ) : action === "remove" ? (
        <button
          className="cute-button !py-1.5 text-sm"
          onClick={() => onSetSecondary(null)}
        >
          remove second theme
        </button>
      ) : (
        <button
          className="cute-button !py-1.5 text-sm"
          onClick={() => onSetSecondary(themeId)}
        >
          {action === "switch"
            ? "switch second theme to this"
            : "add as second theme"}
        </button>
      )}
      <button
        className="cute-button ghost !px-3 !py-1.5 text-sm"
        onClick={onClose}
        aria-label="Cancel"
      >
        ✕
      </button>
    </div>
  );
}
