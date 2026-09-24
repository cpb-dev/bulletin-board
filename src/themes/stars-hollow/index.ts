import type { ThemeModule } from "@/themes/types";
import { palette } from "./palette";
import { StarsHollowScene } from "./StarsHollowScene";
import { LeafGarland } from "./props/LeafGarland";

/** Stars Hollow — the town square from Gilmore Girls, in October. */
export const starsHollow: ThemeModule = {
  palette,
  Scene: StarsHollowScene,
  BoardDecor: LeafGarland,
  // Day, evening and night, from where the sun is over the UK (BB-21).
  dayCycle: { phases: 3 },
};
