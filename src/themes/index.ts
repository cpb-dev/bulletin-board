/**
 * The theme catalogue — palettes only.
 *
 * Each theme lives in its own folder: `<id>/palette.ts` is its colours and
 * `<id>/index.ts` is the bridge to everything it renders. This file lists
 * the palettes; `scenes.ts` lists the modules those palettes belong to.
 *
 * The split is deliberate and load-bearing. Pages like /memories want a
 * theme's colours and nothing else — importing the catalogue must not drag
 * every theme's 3D scene into their bundle. So:
 *
 *   import { getTheme } from "@/themes";         // colours: cheap
 *   import { getThemeModule } from "@/themes/scenes"; // + 3D: the board only
 *
 * Order matters twice over: it's the order the picker shows, and
 * `THEMES[0]` is the fallback for a theme id we no longer have.
 */

import { palette as cozyCabin } from "./cozy-cabin/palette";
import { palette as peachParfait } from "./peach-parfait/palette";
import { palette as midnightPicnic } from "./midnight-picnic/palette";
import { palette as sageMeadow } from "./sage-meadow/palette";
import { palette as summerHouse } from "./summer-house/palette";
import { palette as worldCup } from "./world-cup/palette";
import { palette as rosePicnic } from "./rose-picnic/palette";
import { palette as hauntedHollow } from "./haunted-hollow/palette";
import { palette as beachHut } from "./beach-hut/palette";
import { palette as starsHollow } from "./stars-hollow/palette";
import { THEME_GROUPS, type ThemeGroup } from "./groups";
import type { BoardTheme, PaperColor } from "./types";

export type {
  BoardTheme,
  PaperColor,
  ThemeBoardDecor,
  ThemeGroupId,
  ThemeModule,
  ThemeScene,
} from "./types";
export { THEME_GROUPS, type ThemeGroup } from "./groups";

/** Every theme, in picker order. */
export const THEMES: BoardTheme[] = [
  // basic
  cozyCabin,
  peachParfait,
  midnightPicnic,
  sageMeadow,
  summerHouse,
  // special
  worldCup,
  rosePicnic,
  // seasonal
  hauntedHollow,
  beachHut,
  // tv
  starsHollow,
];

export const DEFAULT_THEME_ID = "cozy-cabin";

/**
 * Resolve a theme id to its palette, falling back to the first theme.
 *
 * The fallback is load-bearing: a board archived under a theme id that
 * later disappears still has to render, so this never returns undefined.
 */
export function getTheme(id: string | null | undefined): BoardTheme {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}

/**
 * The catalogue split into the picker's sections, in group order and
 * theme order. Groups with no themes in them are left out.
 */
export function groupedThemes(): { group: ThemeGroup; themes: BoardTheme[] }[] {
  return THEME_GROUPS.map((group) => ({
    group,
    themes: THEMES.filter((t) => t.group === group.id),
  })).filter((section) => section.themes.length > 0);
}

/** Resolve a paper colour within a theme, falling back gracefully. */
export function getPaper(theme: BoardTheme, paperId: string): PaperColor {
  return theme.papers.find((p) => p.id === paperId) ?? theme.papers[0];
}

/** Deterministic pin colour for an item so it never changes between renders. */
export function pinColorFor(theme: BoardTheme, itemId: string): string {
  let hash = 0;
  for (let i = 0; i < itemId.length; i++) {
    hash = (hash * 31 + itemId.charCodeAt(i)) >>> 0;
  }
  return theme.pins[hash % theme.pins.length];
}
