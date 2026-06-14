"use client";

import { useEffect, useState } from "react";

/**
 * How many pixels the on-screen keyboard (or other UI) is covering at
 * the bottom of the layout viewport. Pure so it can be unit-tested.
 *
 * iOS Safari doesn't resize the layout viewport when the keyboard opens
 * (Android does), so a bottom-anchored sheet ends up hidden behind the
 * keyboard. visualViewport tells us the real visible area.
 */
export function keyboardInset(
  layoutHeight: number,
  visualHeight: number,
  visualOffsetTop: number
): number {
  return Math.max(0, Math.round(layoutHeight - visualHeight - visualOffsetTop));
}

/**
 * Tracks the keyboard inset live via the visualViewport API. Returns 0
 * where unsupported (so layouts are unaffected).
 */
export function useKeyboardInset(): number {
  const [inset, setInset] = useState(0);

  useEffect(() => {
    const vv = typeof window !== "undefined" ? window.visualViewport : null;
    if (!vv) return;

    const update = () => {
      setInset(keyboardInset(window.innerHeight, vv.height, vv.offsetTop));
    };
    update();
    vv.addEventListener("resize", update);
    vv.addEventListener("scroll", update);
    return () => {
      vv.removeEventListener("resize", update);
      vv.removeEventListener("scroll", update);
    };
  }, []);

  return inset;
}
