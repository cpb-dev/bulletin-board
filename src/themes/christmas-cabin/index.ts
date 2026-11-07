import type { ThemeModule } from "@/themes/types";
import { palette } from "./palette";
import { ChristmasCabinScene } from "./ChristmasCabinScene";
import { BoardGarland } from "./props/BoardGarland";

/**
 * Christmas Cabin (BB-35) — a cosy cabin at Christmas, with an alphabet
 * light wall. Under construction until it's released from dev mode: it
 * has no `theme_status` row, so the picker doesn't offer it.
 */
export const christmasCabin: ThemeModule = {
  palette,
  Scene: ChristmasCabinScene,
  BoardDecor: BoardGarland,
};
