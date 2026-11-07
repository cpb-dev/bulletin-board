"use client";

import { isPreviewing } from "@/lib/dev-preview";
import { useBoardStore } from "@/lib/store";
import { getTheme } from "@/themes";

/**
 * Shown to the developer whenever dev mode is changing what's on screen
 * (BB-36), so a preview is never mistaken for the board's real look. One
 * tap goes back to the real thing.
 */
export function DevBanner() {
  const preview = useBoardStore((s) => s.devPreview);
  if (!isPreviewing(preview)) return null;

  const parts = [
    preview.themeId && `${getTheme(preview.themeId).emoji} ${getTheme(preview.themeId).name}`,
    preview.phase && `${preview.phase}`,
    preview.sampleNotes && "sample notes",
  ].filter(Boolean);

  return (
    <div className="pointer-events-none absolute top-16 inset-x-0 z-20 flex justify-center px-4">
      <div
        role="status"
        aria-label="Dev preview"
        className="cute-panel pointer-events-auto flex items-center gap-3 px-4 py-2 text-sm"
      >
        <span>
          🛠️ previewing {parts.join(" · ")}
          <span className="block text-xs opacity-70">
            only on this device, nothing is saved
          </span>
        </span>
        <button
          className="cute-button !px-3 !py-1.5 text-sm"
          onClick={() =>
            useBoardStore
              .getState()
              .setDevPreview({ themeId: null, phase: null, sampleNotes: false })
          }
        >
          exit
        </button>
      </div>
    </div>
  );
}
