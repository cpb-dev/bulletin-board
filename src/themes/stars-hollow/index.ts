import type { ThemeModule } from "@/themes/types";
import { palette } from "./palette";
import { StarsHollowScene } from "./StarsHollowScene";
import { LeafGarland } from "./props/LeafGarland";

/** Stars Hollow — the town square from Gilmore Girls, in October. */
export const starsHollow: ThemeModule = {
  palette,
  Scene: StarsHollowScene,
  BoardDecor: LeafGarland,
};
