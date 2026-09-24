import { Room } from "@/components/three/Room";
import type { ThemeModule } from "@/themes/types";
import { palette } from "./palette";

/** Peach Parfait — pastel pinks and cream linen. */
export const peachParfait: ThemeModule = {
  palette,
  Scene: Room,
};
