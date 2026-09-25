"use client";

import type { BoardTheme } from "@/themes";
import { NOTE_SHAPES, shapeIconPath, type NoteShape } from "@/lib/note-shape";
import { Swatch } from "./Sheet";

/**
 * Colour and shape for a note (BB-24). Colours are the preset papers of
 * the theme on screen; shapes are the same set on every board. The shape
 * icons are filled with the chosen colour, so the row doubles as a
 * preview of the finished note.
 */
export function NoteStylePicker({
  theme,
  paper,
  shape,
  onPaper,
  onShape,
}: {
  theme: BoardTheme;
  paper: string;
  shape: NoteShape;
  onPaper: (paper: string) => void;
  onShape: (shape: NoteShape) => void;
}) {
  const colour = theme.papers.find((p) => p.id === paper) ?? theme.papers[0];
  return (
    <div className="mt-3 flex flex-col gap-3">
      <div
        role="group"
        aria-label="Colour"
        className="flex flex-wrap items-center gap-3"
      >
        <span className="w-12 text-sm opacity-75">colour</span>
        {theme.papers.map((p) => (
          <Swatch
            key={p.id}
            color={p.bg}
            label={p.name}
            selected={paper === p.id}
            onSelect={() => onPaper(p.id)}
          />
        ))}
      </div>
      <div
        role="group"
        aria-label="Shape"
        className="flex flex-wrap items-center gap-2"
      >
        <span className="w-12 text-sm opacity-75">shape</span>
        {NOTE_SHAPES.map((s) => {
          const selected = shape === s.id;
          return (
            <button
              key={s.id}
              type="button"
              aria-label={`${s.name} shape`}
              title={s.name}
              aria-pressed={selected}
              onClick={() => onShape(s.id)}
              className="grid h-10 w-10 place-items-center rounded-xl border-2 transition-transform"
              style={{
                borderColor: selected ? "var(--ui-accent)" : "transparent",
                background: selected ? "rgba(255,255,255,0.12)" : undefined,
                transform: selected ? "scale(1.08)" : undefined,
              }}
            >
              <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
                <path
                  d={shapeIconPath(s.id)}
                  fill={colour.bg}
                  stroke={colour.ink}
                  strokeOpacity={0.35}
                  strokeWidth={1}
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          );
        })}
      </div>
    </div>
  );
}
