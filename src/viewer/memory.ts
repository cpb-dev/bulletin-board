/**
 * The data an exported memory carries with it.
 *
 * `index.html` sets `window.__MEMORY__` just before loading this bundle;
 * the shape is written by `buildViewerHtml` in `src/lib/export-bundle.ts`
 * and the two must stay in step.
 */

import type { Board, BoardItem, Profile } from "@/lib/types";

export interface MemoryPayload {
  app: string;
  exported_at: string;
  board: Board;
  items: BoardItem[];
  profiles: Record<string, Profile>;
  /** Storage path -> `data:image/jpeg;base64,…`, inlined at export time. */
  photos: Record<string, string>;
}

declare global {
  interface Window {
    __MEMORY__?: MemoryPayload;
  }
}

export function readMemory(): MemoryPayload | null {
  return typeof window === "undefined" ? null : window.__MEMORY__ ?? null;
}

/**
 * The offline stand-in for a signed storage URL. Returns null for a
 * photo that isn't in this export, which the board renders as an empty
 * frame rather than failing.
 */
export function photoDataUrl(path: string): string | null {
  return readMemory()?.photos[path] ?? null;
}
