"use client";

import { useState } from "react";
import { useBoardStore } from "@/lib/store";
import type { DayPhase } from "@/lib/day-cycle";
import { isPreviewing, NO_PREVIEW } from "@/lib/dev-preview";
import { setThemeStatus } from "@/lib/theme-status-api";
import { withThemeStatus, type ThemeStatus } from "@/lib/theme-status";
import { THEMES } from "@/themes";

const PHASES: { id: DayPhase | null; label: string }[] = [
  { id: null, label: "clock" },
  { id: "day", label: "☀️ day" },
  { id: "evening", label: "🌇 evening" },
  { id: "night", label: "🌙 night" },
];

/**
 * The theme picker's Dev section (BB-36), shown only to the developer.
 *
 * Previewing changes what this device shows and nothing else: it never
 * writes to a board, and the board is view-only until the preview ends.
 * Every theme is listed, including those under construction (hidden from
 * the sections above). The 🚧 / ✅ switch beside each one is the only
 * thing here that writes anywhere: it marks the theme live or under
 * construction in `theme_status`, through the dev-only /api/dev/themes.
 */
export function DevThemeSection() {
  const preview = useBoardStore((s) => s.devPreview);
  const setPreview = useBoardStore((s) => s.setDevPreview);
  const drafts = useBoardStore((s) => s.draftThemeIds);
  const [error, setError] = useState<string | null>(null);

  /** Optimistic: flip it now, put it back if the save fails. */
  async function changeStatus(themeId: string, status: ThemeStatus) {
    const store = useBoardStore.getState();
    const previous = store.draftThemeIds;
    store.setDraftThemeIds(withThemeStatus(previous, themeId, status));
    setError(null);
    try {
      await setThemeStatus(themeId, status);
    } catch (err) {
      useBoardStore.getState().setDraftThemeIds(previous);
      setError(err instanceof Error ? err.message : "Could not change that.");
    }
  }

  return (
    <section
      aria-label="Dev"
      className="rounded-2xl border-2 border-dashed p-3"
      style={{ borderColor: "var(--ui-accent)" }}
    >
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="hand text-lg leading-none">🛠️ Dev</h3>
        <span className="text-xs opacity-60">
          preview only · just you · the board is locked while previewing
        </span>
      </div>

      <ul className="flex flex-col gap-1.5">
        {THEMES.map((t) => {
          const on = preview.themeId === t.id;
          const draft = drafts.includes(t.id);
          return (
            <li key={t.id} className="flex items-center gap-1.5">
              <button
                onClick={() => setPreview({ themeId: on ? null : t.id })}
                aria-pressed={on}
                aria-label={`Preview ${t.name}`}
                className="flex min-w-0 flex-1 items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm select-none"
                style={{
                  background: t.ui.panel,
                  color: t.ui.text,
                  outline: on ? `3px solid ${t.ui.accent}` : "3px solid transparent",
                }}
              >
                <span aria-hidden>{t.emoji}</span>
                <span className="truncate">{t.name}</span>
              </button>
              <button
                onClick={() => changeStatus(t.id, draft ? "live" : "draft")}
                aria-label={
                  draft ? `Release ${t.name}` : `Mark ${t.name} as under construction`
                }
                title={draft ? "under construction — tap to release" : "live — tap to hide"}
                className={`cute-button !px-2 !py-1 text-xs ${draft ? "" : "ghost"}`}
              >
                {draft ? "🚧" : "✅"}
              </button>
            </li>
          );
        })}
      </ul>

      <div
        role="group"
        aria-label="Time of day"
        className="mt-3 flex flex-wrap items-center gap-1.5 text-sm"
      >
        <span className="mr-1 text-xs opacity-70">time of day</span>
        {PHASES.map((p) => (
          <button
            key={p.label}
            className={`cute-button !px-2.5 !py-1 text-xs ${preview.phase === p.id ? "" : "ghost"}`}
            aria-pressed={preview.phase === p.id}
            onClick={() => setPreview({ phase: p.id })}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          className={`cute-button !px-2.5 !py-1 text-xs ${preview.sampleNotes ? "" : "ghost"}`}
          aria-pressed={preview.sampleNotes}
          onClick={() => setPreview({ sampleNotes: !preview.sampleNotes })}
        >
          📝 sample notes
        </button>
        {isPreviewing(preview) && (
          <button
            className="cute-button ghost !px-2.5 !py-1 text-xs"
            onClick={() => setPreview(NO_PREVIEW)}
          >
            stop previewing
          </button>
        )}
      </div>

      {error && (
        <p role="alert" className="mt-2 text-sm text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
