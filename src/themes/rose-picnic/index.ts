import type { ThemeModule } from "@/themes/types";
import { palette } from "./palette";
import { RoseFieldScene } from "./RoseFieldScene";
import { Hearts } from "./decor";

/** Rose Picnic — a rose field at golden hour, with a second little board. */
export const rosePicnic: ThemeModule = {
  palette,
  Scene: RoseFieldScene,
  BoardDecor: Hearts,
};
