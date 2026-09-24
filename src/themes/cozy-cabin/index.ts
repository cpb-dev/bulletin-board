import { Room } from "@/components/three/Room";
import type { ThemeModule } from "@/themes/types";
import { palette } from "./palette";

/** Cozy Cabin — log walls, a lit fireplace and lamplight. */
export const cozyCabin: ThemeModule = {
  palette,
  Scene: Room,
};
