import type { ThemeModule } from "@/themes/types";
import { palette } from "./palette";
import { GreatHallScene } from "./GreatHallScene";
import { HallGarland } from "./props/HallGarland";

/**
 * Great Hall (BB-38) — a great stone hall at Christmas, with floating
 * candles and an enchanted ceiling. Under construction until it's
 * released from dev mode: it has no `theme_status` row, so the picker
 * doesn't offer it.
 */
export const greatHall: ThemeModule = {
  palette,
  Scene: GreatHallScene,
  BoardDecor: HallGarland,
  // The enchanted ceiling and the windows follow the time of day (BB-21).
  dayCycle: { phases: 3 },
};
