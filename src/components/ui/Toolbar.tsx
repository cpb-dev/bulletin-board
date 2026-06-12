"use client";

import { useBoardStore } from "@/lib/store";

/** Bottom action bar — changes with where you're standing. */
export function Toolbar() {
  const view = useBoardStore((s) => s.view);
  const readOnly = useBoardStore((s) => s.readOnly);
  const walkUp = useBoardStore((s) => s.walkUp);
  const stepBack = useBoardStore((s) => s.stepBack);
  const setComposer = useBoardStore((s) => s.setComposer);
  const setThemePickerOpen = useBoardStore((s) => s.setThemePickerOpen);

  return (
    <div className="absolute bottom-0 inset-x-0 flex justify-center p-4 pointer-events-none">
      <div className="pointer-events-auto flex items-center gap-2">
        {view === "room" ? (
          <button className="cute-button" onClick={() => walkUp()}>
            walk up to the board 🚶
          </button>
        ) : (
          <>
            {!readOnly && (
              <>
                <button
                  className="cute-button"
                  onClick={() => setComposer("note")}
                >
                  ✏️ note
                </button>
                <button
                  className="cute-button"
                  onClick={() => setComposer("photo")}
                >
                  📷 photo
                </button>
                <button
                  className="cute-button ghost"
                  onClick={() => setThemePickerOpen(true)}
                  aria-label="Change theme"
                >
                  🎨
                </button>
              </>
            )}
            <button className="cute-button ghost" onClick={stepBack}>
              step back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
