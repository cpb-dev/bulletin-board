import { Room } from "@/components/three/Room";
import type { ThemeModule } from "@/themes/types";
import { palette } from "./palette";

/** Sage Meadow — soft greens and daisies. */
export const sageMeadow: ThemeModule = {
  palette,
  Scene: Room,
};
