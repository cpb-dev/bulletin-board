"use client";

import { useBoardStore } from "@/lib/store";

/**
 * Thin 2D layer shown while a note/photo is held up close: a dismiss
 * button (placed below the top menu so it doesn't overlap it) and a
 * hint. Pointer-events stay off the backdrop so the 3D "inspect" tilt
 * keeps working.
 */
export function HeldOverlay() {
  const heldId = useBoardStore((s) => s.heldId);
  const setHeld = useBoardStore((s) => s.setHeld);
  if (!heldId) return null;

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <button
        className="cute-button ghost pointer-events-auto absolute top-20 left-1/2 -translate-x-1/2"
        onClick={() => setHeld(null)}
      >
        ✕ put it back
      </button>
      <p className="absolute bottom-6 inset-x-0 text-center text-sm opacity-80 drop-shadow pointer-events-none">
        drag to tilt &amp; look at it ✨
      </p>
    </div>
  );
}
