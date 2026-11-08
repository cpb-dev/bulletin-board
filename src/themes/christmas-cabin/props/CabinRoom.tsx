"use client";

import { Floor } from "./room/Floor";
import { Walls } from "./room/Walls";
import { Ceiling } from "./room/Ceiling";
import { Rug } from "./room/Rug";
import { FairyLights } from "./room/FairyLights";

/**
 * The Christmas Cabin's room (BB-35), warm and cosy: deep warm oak
 * underfoot, a chunky Fair Isle knit rug, honey knotty-pine walls over
 * stained slats, a pine ceiling under dark walnut beams, and fairy
 * lights swagged round the top of the room. Its own room — it never
 * uses the shared indoor `Room`.
 *
 * Each surface lives in `props/room/`; their textures are drawn on
 * canvases in `room/textures.ts`, from layouts in `lib/planks.ts` and
 * `lib/fairisle.ts` and `lib/fairylights.ts`.
 */
export function CabinRoom() {
  return (
    <group>
      <Floor />
      <Rug />
      <Walls />
      <Ceiling />
      <FairyLights />
    </group>
  );
}
