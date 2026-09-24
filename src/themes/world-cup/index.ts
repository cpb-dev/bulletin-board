import type { ThemeModule } from "@/themes/types";
import { palette } from "./palette";
import { StadiumScene } from "./StadiumScene";
import { Footballs } from "./decor";

/** World Cup — a floodlit stadium in pitch green and gold. */
export const worldCup: ThemeModule = {
  palette,
  Scene: StadiumScene,
  BoardDecor: Footballs,
};
