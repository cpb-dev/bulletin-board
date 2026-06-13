"use client";

import { useBoardStore } from "@/lib/store";

/**
 * Big, thumb-friendly zoom buttons for the close-up board view — easier
 * than pinching, especially one-handed. Drag the board to move around.
 */
export function ZoomControls() {
  const view = useBoardStore((s) => s.view);
  const nudgeZoom = useBoardStore((s) => s.nudgeZoom);
  const setZoom = useBoardStore((s) => s.setZoom);

  if (view !== "board") return null;

  return (
    <div className="absolute right-4 top-1/2 -translate-y-1/2 flex flex-col gap-2 pointer-events-auto">
      <button
        className="cute-button !px-0 !w-12 !h-12 text-xl"
        onClick={() => nudgeZoom(1.25)}
        aria-label="Zoom in"
      >
        ＋
      </button>
      <button
        className="cute-button !px-0 !w-12 !h-12 text-xl"
        onClick={() => nudgeZoom(0.8)}
        aria-label="Zoom out"
      >
        －
      </button>
      <button
        className="cute-button ghost !px-0 !w-12 !h-10 text-sm"
        onClick={() => setZoom(1)}
        aria-label="Reset zoom"
      >
        ⤢
      </button>
    </div>
  );
}
