/**
 * Which themes are under construction (BB-36).
 *
 * The `theme_status` table (migration 0010) marks each theme id 'live'
 * or 'draft'. A theme with no row is a draft too, so a brand-new theme
 * is hidden until it's released from dev mode.
 *
 * Status only decides what the theme picker OFFERS. It never changes how
 * a board renders: `getTheme` resolves a draft exactly like any other
 * theme, so a board (live or archived) already using one is unaffected.
 *
 * Pure, so it's tested without a database.
 */

import type { Board } from "./types";

export type ThemeStatus = "live" | "draft";

export interface ThemeStatusRow {
  theme_id: string;
  status: string;
}

/**
 * The catalogue's themes that are under construction: no row, or a row
 * that isn't 'live'. `null` rows means the table couldn't be read (not
 * migrated yet, offline) — then nothing is treated as a draft, so the
 * picker falls back to offering everything, as it did before BB-36.
 */
export function draftThemeIds(
  rows: ThemeStatusRow[] | null,
  catalogueIds: string[]
): string[] {
  if (!rows) return [];
  const live = new Set(
    rows.filter((r) => r.status === "live").map((r) => r.theme_id)
  );
  return catalogueIds.filter((id) => !live.has(id));
}

/**
 * The themes to leave out of the picker for this board: the drafts,
 * except any this board already uses. A theme put back under
 * construction stays visible (and selected) on a board that has it, so
 * the picker never hides what you're looking at.
 */
export function pickerHiddenIds(
  drafts: readonly string[],
  board: Pick<Board, "theme" | "secondary_theme"> | null | undefined
): Set<string> {
  const hidden = new Set(drafts);
  if (board) {
    hidden.delete(board.theme);
    if (board.secondary_theme) hidden.delete(board.secondary_theme);
  }
  return hidden;
}

/** The draft list after marking one theme live or draft. */
export function withThemeStatus(
  drafts: readonly string[],
  themeId: string,
  status: ThemeStatus
): string[] {
  const rest = drafts.filter((id) => id !== themeId);
  return status === "draft" ? [...rest, themeId] : rest;
}

/** Whether a request body is a valid status change for a known theme. */
export function parseStatusChange(
  body: unknown,
  catalogueIds: readonly string[]
): { themeId: string; status: ThemeStatus } | null {
  if (!body || typeof body !== "object") return null;
  const { themeId, status } = body as Record<string, unknown>;
  if (typeof themeId !== "string" || !catalogueIds.includes(themeId)) return null;
  if (status !== "live" && status !== "draft") return null;
  return { themeId, status };
}
