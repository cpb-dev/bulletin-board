/**
 * A board's second theme (BB-3).
 *
 * A board can carry one secondary theme alongside its main one. Which of
 * the two a person is looking at is theirs alone: it's remembered on this
 * device, per board, and never written to the database — so one of you can
 * sit in Haunted Hollow while the other stays in the Cozy Cabin.
 *
 * Everything here is pure (storage is passed in), so it's tested without a
 * browser.
 */

import type { Board } from "./types";

/** Which of a board's two themes is on screen. */
export type ThemeView = "primary" | "secondary";

/** The minimal slice of `Storage` this module needs. */
export type ThemeViewStorage = Pick<Storage, "getItem" | "setItem">;

/** How long the old room takes to melt into the new one, in ms. */
export const THEME_MORPH_MS = 900;

/**
 * The board's secondary theme, if it has a usable one. A secondary equal to
 * the main theme is treated as none — there'd be nothing to switch to.
 */
export function secondaryThemeOf(
  board: Pick<Board, "theme" | "secondary_theme"> | null | undefined
): string | null {
  const secondary = board?.secondary_theme ?? null;
  return secondary && secondary !== board?.theme ? secondary : null;
}

/**
 * The theme id to render for a board, given this person's choice. Falls
 * back to the main theme whenever there's no secondary to show — so a
 * remembered "secondary" choice is harmless after the other person removes
 * it.
 */
export function displayedThemeId(
  board: Pick<Board, "theme" | "secondary_theme"> | null | undefined,
  view: ThemeView
): string | undefined {
  if (!board) return undefined;
  const secondary = secondaryThemeOf(board);
  return view === "secondary" && secondary ? secondary : board.theme;
}

/** What holding down on a theme in the picker offers to do. */
export type SecondaryAction = "add" | "switch" | "remove" | "main";

/**
 * Holding a theme in the picker:
 * - the main theme can't also be the secondary → "main" (explain, no action)
 * - the current secondary → "remove"
 * - any other theme, while a secondary is set → "switch"
 * - any other theme, with no secondary yet → "add"
 */
export function secondaryActionFor(
  board: Pick<Board, "theme" | "secondary_theme">,
  themeId: string
): SecondaryAction {
  if (themeId === board.theme) return "main";
  const secondary = secondaryThemeOf(board);
  if (!secondary) return "add";
  return secondary === themeId ? "remove" : "switch";
}

/** localStorage key for one board's remembered view. */
export function themeViewKey(boardId: string): string {
  return `bb:theme-view:${boardId}`;
}

/** The default storage, or null where there isn't one (SSR, locked down). */
export function browserStorage(): ThemeViewStorage | null {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * The view this person last chose for a board. Anything unreadable —
 * no storage, a private window, a stale value — reads as the main theme.
 */
export function readThemeView(
  boardId: string,
  storage: ThemeViewStorage | null = browserStorage()
): ThemeView {
  try {
    return storage?.getItem(themeViewKey(boardId)) === "secondary"
      ? "secondary"
      : "primary";
  } catch {
    return "primary";
  }
}

/** Remember this person's choice for a board. Best effort: never throws. */
export function writeThemeView(
  boardId: string,
  view: ThemeView,
  storage: ThemeViewStorage | null = browserStorage()
): void {
  try {
    storage?.setItem(themeViewKey(boardId), view);
  } catch {
    // Storage full or blocked — the switch still works for this visit.
  }
}
