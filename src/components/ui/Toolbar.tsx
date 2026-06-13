"use client";

import { useBoardStore } from "@/lib/store";

/** Bottom action bar — changes with where you're standing and the mode. */
export function Toolbar() {
  const view = useBoardStore((s) => s.view);
  const mode = useBoardStore((s) => s.mode);
  const readOnly = useBoardStore((s) => s.readOnly);
  const addMenuOpen = useBoardStore((s) => s.addMenuOpen);
  const walkUp = useBoardStore((s) => s.walkUp);
  const stepBack = useBoardStore((s) => s.stepBack);
  const setMode = useBoardStore((s) => s.setMode);
  const setComposer = useBoardStore((s) => s.setComposer);
  const setAddMenuOpen = useBoardStore((s) => s.setAddMenuOpen);
  const setThemePickerOpen = useBoardStore((s) => s.setThemePickerOpen);

  return (
    <div className="absolute bottom-0 inset-x-0 flex flex-col items-center gap-2 p-4 pointer-events-none">
      {/* Add menu popover */}
      {addMenuOpen && view === "board" && mode === "view" && !readOnly && (
        <div className="pointer-events-auto cute-panel pop-in flex gap-2 p-2 mb-1">
          <button className="cute-button" onClick={() => setComposer("note")}>
            ✏️ note
          </button>
          <button className="cute-button" onClick={() => setComposer("photo")}>
            📷 photo
          </button>
        </div>
      )}

      <div className="pointer-events-auto flex items-center gap-2">
        {view === "room" ? (
          <button className="cute-button" onClick={() => walkUp()}>
            walk up to the board 🚶
          </button>
        ) : readOnly ? (
          <button className="cute-button ghost" onClick={stepBack}>
            step back
          </button>
        ) : mode === "edit" ? (
          <>
            <span className="text-sm opacity-75 px-1">moving &amp; resizing</span>
            <button className="cute-button" onClick={() => setMode("view")}>
              ✓ done
            </button>
          </>
        ) : (
          <>
            <button
              className="cute-button"
              onClick={() => setAddMenuOpen(!addMenuOpen)}
              aria-expanded={addMenuOpen}
            >
              ➕ add
            </button>
            <button
              className="cute-button ghost"
              onClick={() => setMode("edit")}
            >
              ✏️ edit
            </button>
            <button
              className="cute-button ghost"
              onClick={() => setThemePickerOpen(true)}
              aria-label="Change theme"
            >
              🎨
            </button>
            <button className="cute-button ghost" onClick={stepBack}>
              step back
            </button>
          </>
        )}
      </div>
    </div>
  );
}
