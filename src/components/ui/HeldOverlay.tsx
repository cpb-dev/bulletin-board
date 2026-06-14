"use client";

import { useBoardStore } from "@/lib/store";

/**
 * Thin 2D layer shown while a note/photo is held up close: a dismiss
 * button and a hint. Pointer-events stay off the backdrop so the 3D
 * "inspect" tilt (driven by pointer movement) keeps working.
 */
export function HeldOverlay() {
  const heldId = useBoardStore((s) => s.heldId);
  const setHeld = useBoardStore((s) => s.setHeld);
  if (!heldId) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-between py-6">
      <button
        className="cute-button ghost pointer-events-auto !px-4 mt-2"
        onClick={() => setHeld(null)}
      >
        ✕ put it back
      </button>
      <p className="text-sm opacity-80 drop-shadow pointer-events-none">
        move your finger to tilt it · tap to put it back
      </p>
    </div>
  );
}
