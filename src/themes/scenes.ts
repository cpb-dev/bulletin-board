/**
 * The theme catalogue — the full modules, scenes and all.
 *
 * Importing this pulls in every theme's 3D scene and props, so only the
 * board experience should: everything that just wants colours imports
 * `@/themes` instead.
 *
 * To add a theme: give it a folder with a `palette.ts` and an `index.ts`
 * exporting its `ThemeModule`, then add one line here and one to `THEMES`
 * in `./index.ts`. A test keeps the two lists honest.
 */

import { cozyCabin } from "./cozy-cabin";
import { peachParfait } from "./peach-parfait";
import { midnightPicnic } from "./midnight-picnic";
import { sageMeadow } from "./sage-meadow";
import { summerHouse } from "./summer-house";
import { worldCup } from "./world-cup";
import { rosePicnic } from "./rose-picnic";
import { hauntedHollow } from "./haunted-hollow";
import { beachHut } from "./beach-hut";
import { starsHollow } from "./stars-hollow";
import type { ThemeModule } from "./types";

/** Every theme module, in the same order as `THEMES`. */
export const THEME_MODULES: ThemeModule[] = [
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

/**
 * Resolve a theme id to its module, falling back to the first theme —
 * the same fallback as `getTheme`, for the same reason: an archived board
 * whose theme id has since disappeared still has to render.
 */
export function getThemeModule(id: string | null | undefined): ThemeModule {
  return THEME_MODULES.find((m) => m.palette.id === id) ?? THEME_MODULES[0];
}
