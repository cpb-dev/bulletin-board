import { Room } from "@/components/three/Room";
import type { ThemeModule } from "@/themes/types";
import { palette } from "./palette";

/** Midnight Picnic — a dark room under a starry sky. */
export const midnightPicnic: ThemeModule = {
  palette,
  Scene: Room,
};
