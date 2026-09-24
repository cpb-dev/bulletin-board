import type { ThemeModule } from "@/themes/types";
import { palette } from "./palette";
import { HauntedScene } from "./HauntedScene";
import { Cobwebs } from "./props/Cobweb";

/** Haunted Hollow — an autumn graveyard with ghosts at the windows. */
export const hauntedHollow: ThemeModule = {
  palette,
  Scene: HauntedScene,
  BoardDecor: Cobwebs,
};
