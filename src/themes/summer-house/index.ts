import { Room } from "@/components/three/Room";
import type { ThemeModule } from "@/themes/types";
import { palette } from "./palette";

/** Summer House — blue and white, with a garden out the window. */
export const summerHouse: ThemeModule = {
  palette,
  Scene: Room,
};
