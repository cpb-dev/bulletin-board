"use client";

import { useBoardStore } from "@/lib/store";
import type { DayPhase } from "@/lib/day-cycle";
import { isPreviewing, NO_PREVIEW } from "@/lib/dev-preview";
import { isDraft, THEMES } from "@/themes";

const PHASES: { id: DayPhase | null; label: string }[] = [
  { id: null, label: "clock" },
  { id: "day", label: "☀️ day" },
  { id: "evening", label: "🌇 evening" },
  { id: "night", label: "🌙 night" },
];

/**
 * The theme picker's Dev section (BB-36), shown only to the developer.
 *
 * Everything here changes what this device shows and nothing else: it
 * never calls the API, so the board's saved theme, the other person's
 * view and archived boards are untouched. Draft themes — hidden from the
 * sections above — are listed here so they can be built on a real board.
 */
export function DevThemeSection() {
  const preview = useBoardStore((s) => s.devPreview);
  const setPreview = useBoardStore((s) => s.setDevPreview);

  return (
    <section
      aria-label="Dev"
      className="rounded-2xl border-2 border-dashed p-3"
      style={{ borderColor: "var(--ui-accent)" }}
    >
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="hand text-lg leading-none">🛠️ Dev</h3>
        <span className="text-xs opacity-60">
          preview only · just you, nothing is saved
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {THEMES.map((t) => {
          const on = preview.themeId === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setPreview({ themeId: on ? null : t.id })}
              aria-pressed={on}
              aria-label={`Preview ${t.name}${isDraft(t) ? " (draft)" : ""}`}
              className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm select-none"
              style={{
                background: t.ui.panel,
                color: t.ui.text,
                outline: on ? `3px solid ${t.ui.accent}` : "3px solid transparent",
              }}
            >
              <span aria-hidden>{t.emoji}</span>
              <span className="truncate">{t.name}</span>
              {isDraft(t) && (
                <span
                  className="ml-auto rounded-full px-1.5 text-[10px] font-bold"
                  style={{ background: t.ui.accent, color: t.ui.bg }}
                >
                  draft
                </span>
              )}
            </button>
          );
        })}
      </div>

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
    </section>
  );
}
