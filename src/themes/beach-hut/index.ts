import type { ThemeModule } from "@/themes/types";
import { palette } from "./palette";
import { BeachScene } from "./BeachScene";
import { Shells } from "./decor";

/** Beach Hut — out on the sand, with gulls and crabs. */
export const beachHut: ThemeModule = {
  palette,
  Scene: BeachScene,
  BoardDecor: Shells,
};
